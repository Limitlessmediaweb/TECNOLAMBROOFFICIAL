"""
Montaggio dello spot del sito Tecnolambro: ogni fotogramma è composto con numpy/OpenCV e passato
a ffmpeg. Tutto il montaggio sta in config.json (takes 3D, comps su stock, tagli in beat, testi).

Uso:
  python scripts/build.py                # render 3D mancanti + montaggio + export + controlli
  python scripts/build.py --render-only  # solo i render 3D
  python scripts/build.py --frames 1.0,6.6,14.0,21.0   # solo fotogrammi di prova in render/check/

Passi:
  1. 3D: fotogrammi necessari di ogni take -> scripts/render3d.mjs (Chrome headless, WebGL)
  2. comps: registrazione del sito dentro lo schermo dei telefoni stock (composite_screens.py)
  3. tagli sul beat (100 BPM = 0,6 s): 1, 2 o mezzo beat; zoom-through solo nel passaggio macro -> hero
  4. look unico: grade, bloom, vignetta, grana; testi con dissolvenza e leggera salita
  5. export H.264 High yuv420p 30 fps CRF 18 preset slow, AAC muto, +faststart; cover.jpg; contact sheet
"""
import json
import subprocess
import sys
from pathlib import Path

import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import composite_screens as cs  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
CFG = json.loads((ROOT / "config.json").read_text(encoding="utf8"))
FPS = CFG["fps"]
BEAT = 60 / CFG["bpm"]
FPB = round(BEAT * FPS)  # 18 fotogrammi per beat
W, H = CFG["width"], CFG["height"]
OUT_NAME = "tecnolambro-spot-sito"


def ease3(p):
    p = min(1.0, max(0.0, p))
    return 1 - (1 - p) ** 3


def ease_in(p):
    p = min(1.0, max(0.0, p))
    return p * p * p


def run(cmd, **kw):
    print("  $", " ".join(str(c) for c in cmd)[:160])
    subprocess.run(cmd, check=True, **kw)


# ---------------------------------------------------------------- 3D
def take_dir(take):
    return ROOT / "render" / "3d" / take


def render_jobs(needs):
    items = []
    for take, frames in needs.items():
        T = CFG["takes"][take]
        frames = sorted(f for f in frames if not (take_dir(take) / f"{f:04d}.png").exists())
        if not frames:
            continue
        runs, s = [], frames[0]
        for a, b in zip(frames, frames[1:] + [None]):
            if b != a + 1:
                runs.append((s, a + 1))
                s = b
        for a, b in runs:
            items.append({"shot": T["shot"], "dur": T["dur"], "fps": FPS, "frames": [a, b], "out": f"render/3d/{take}",
                          "opts": T.get("opts", {}), "samples": T.get("samples", CFG["samples"]), "screen": T["screen"]})
    if not items:
        return
    job = ROOT / "render" / "jobs.json"
    job.write_text(json.dumps({"width": W, "height": H, "items": items}, indent=1), encoding="utf8")
    run(["node", str(ROOT / "scripts" / "render3d.mjs"), str(job)], cwd=ROOT)


def take_frame(take, i):
    im = cv2.imread(str(take_dir(take) / f"{i:04d}.png"), cv2.IMREAD_COLOR)
    if im is None:
        raise FileNotFoundError(take_dir(take) / f"{i:04d}.png")
    return cv2.cvtColor(im, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0


# ---------------------------------------------------------------- stock + schermi
def match_plate(img, p):
    out = img * p.get("gain", 1.0)
    sat = p.get("sat", 1.0)
    l = out.mean(axis=2, keepdims=True)
    out = l + (out - l) * sat
    out = out * np.float32(p.get("tint", [1, 1, 1]))
    return np.clip(out, 0, 1)


_crop_x = {}


def crop_center(comp_id, C):
    """Centro orizzontale fisso del ritaglio 9:16 (mediana della posizione dello schermo nel pezzo)."""
    if comp_id not in _crop_x:
        tr = cs.track(C["stock"])
        a = int(round(C["in"] * FPS))
        _crop_x[comp_id] = float(np.median(tr[a:a + 90, :, 0]))
    return _crop_x[comp_id]


def comp_frame(comp_id, lt):
    C = CFG["comps"][comp_id]
    ts = C["in"] + lt
    stock = cs.read_rgb(cs.frame_path("stock", C["stock"], ts))
    stock = match_plate(stock, CFG["plates"][C["stock"]])
    rec = cs.read_rgb(cs.frame_path("riprese", C["rec"], C["rec_in"] + lt, digits=5))
    img = cs.composite(C["stock"], ts, rec, stock=stock)
    h, w = img.shape[:2]
    if w != W or h != H:
        s = H / h
        if s != 1:
            img = cv2.resize(img, (round(w * s), H), interpolation=cv2.INTER_AREA)
        cx = crop_center(comp_id, C) * s
        x0 = int(round(min(max(cx - W / 2, 0), img.shape[1] - W)))
        img = img[:, x0:x0 + W]
    return img


# ---------------------------------------------------------------- look
def global_grade(img, g):
    x = np.clip((img - g["black"]) / (1 - g["black"]), 0, 1)
    c = g["contrast"]
    x = np.clip(x + c * x * (1 - x) * (2 * x - 1), 0, 1)
    l = x.mean(axis=2, keepdims=True)
    x = x + (1 - l) ** 2 * np.float32(g["shadow_tint"]) + l ** 2 * np.float32(g["high_tint"])
    l = x.mean(axis=2, keepdims=True)
    return np.clip(l + (x - l) * g["sat"], 0, 1)


def bloom(img, k=0.16, thr=0.75):
    h, w = img.shape[:2]
    small = cv2.resize(img, (w // 4, h // 4), interpolation=cv2.INTER_AREA)
    br = np.clip(small - thr, 0, None) / (1 - thr)
    b = cv2.GaussianBlur(br, (0, 0), 6) * 0.6 + cv2.GaussianBlur(br, (0, 0), 18) * 0.4
    return img + cv2.resize(b, (w, h), interpolation=cv2.INTER_LINEAR) * k


_vig = {}


def vignette(img, s):
    h, w = img.shape[:2]
    if (w, h) not in _vig:
        y, x = np.mgrid[0:h, 0:w].astype(np.float32)
        r = np.sqrt(((x - w / 2) / (w / 2)) ** 2 + ((y - h / 2) / (h / 2)) ** 2) / np.sqrt(2)
        _vig[(w, h)] = (1 - s * np.clip(r - 0.25, 0, 1) ** 1.6 / 0.75 ** 1.6)[..., None].astype(np.float32)
    return img * _vig[(w, h)]


_rng = np.random.default_rng(11)


def grain(img, amt):
    h, w = img.shape[:2]
    n = cv2.resize(_rng.standard_normal((h // 2, w // 2)).astype(np.float32), (w, h), interpolation=cv2.INTER_LINEAR)[..., None]
    l = img.mean(axis=2, keepdims=True)
    return img + n * amt * (0.4 + 0.6 * (1 - np.abs(l - 0.45) * 1.6).clip(0.2, 1))


def zoom(img, s, taps=0, span=0.0):
    h, w = img.shape[:2]

    def sc(z):
        M = np.float32([[z, 0, (1 - z) * w / 2], [0, z, (1 - z) * h / 2]])
        return cv2.warpAffine(img, M, (w, h), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)

    if taps <= 1:
        return sc(s)
    acc = np.zeros_like(img)
    for k in range(taps):
        acc += sc(s * (1 + span * k / (taps - 1)))
    return acc / taps


# ---------------------------------------------------------------- testi
_ov = {}


def overlay(name):
    if name not in _ov:
        im = cv2.imread(str(ROOT / "overlays" / f"{name}.png"), cv2.IMREAD_UNCHANGED)
        _ov[name] = (cv2.cvtColor(im[..., :3], cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0, im[..., 3:4].astype(np.float32) / 255.0)
    return _ov[name]


def put_text(img, name, t, t0, t1, fade_in=0.25, fade_out=0.15, rise=14):
    if t < t0 or t >= t1:
        return img
    rgb, a = overlay(name)
    p = ease3((t - t0) / fade_in)
    q = 1.0 if t1 - t > fade_out else max(0.0, (t1 - t) / fade_out)
    dy = int(round((1 - p) * rise))
    if dy:
        rgb, a = np.roll(rgb, dy, axis=0), np.roll(a, dy, axis=0)
    al = a * p * q
    return img * (1 - al) + rgb * al


# ---------------------------------------------------------------- montaggio
def segments():
    out = []
    for s in CFG["cuts"]:
        out.append({**s, "f0": round(s["b"] * FPB), "f1": round((s["b"] + s["n"]) * FPB)})
    out.sort(key=lambda s: s["f0"])
    return out


def source_frame(seg, lt, need=None):
    src = seg["src"]
    if src in CFG["comps"]:
        if need is not None:
            return None
        img = comp_frame(src, lt)
        C = CFG["comps"][src]
        if C.get("push"):
            img = zoom(img, 1 + C["push"] * lt / ((seg["f1"] - seg["f0"]) / FPS))
        return img
    take = CFG["takes"][src]
    i = max(0, min(int(round(take["dur"] * FPS)) - 1, int(round(lt * FPS))))
    if need is not None:
        need.setdefault(src, set()).add(i)
        return None
    return take_frame(src, i)


def frame_at(segs, f, need=None):
    seg = next(s for s in segs if s["f0"] <= f < s["f1"])
    lt = (f - seg["f0"]) / FPS
    img = source_frame(seg, lt, need)
    if need is not None:
        return None
    if seg.get("out") == "zoom":  # zoom-through: ultimi 0,3 s accelerati con motion blur
        rem = (seg["f1"] - f) / FPS
        if rem <= 0.3:
            p = ease_in(1 - rem / 0.3)
            img = zoom(img, 1 + 1.2 * p, taps=7, span=0.3 * p)
    if seg.get("fxin") == "zoom" and lt < 0.2:  # la clip successiva si pulisce in 0,2 s
        p = ease3(lt / 0.2)
        img = zoom(img, 1.25 - 0.25 * p, taps=7, span=0.2 * (1 - p))
    return img


def finish(img, t, total_s):
    g = CFG["grade"]
    img = global_grade(img, g)
    img = bloom(img, g["bloom"])
    img = vignette(img, g["vignette"])
    img = grain(img, g["grain"])
    for tx in CFG["texts"]:
        img = put_text(img, tx["id"], t, tx["from"] * BEAT, tx["to"] * BEAT)
    fade = CFG.get("fade_out", 0)
    if fade and t > total_s - fade:  # chiusura in loop: torna al nero del primo fotogramma
        img = img * (1 - ease3((t - (total_s - fade)) / fade))
    if t < 0.12:  # il primo fotogramma parte dal nero (aggancio del loop)
        img = img * ease3(t / 0.12)
    return (np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8)


def prepare(segs, total, frames=None):
    need = {}
    for f in (frames if frames is not None else range(total)):
        frame_at(segs, f, need)
    render_jobs(need)


def save(path, rgb8, q=92):
    cv2.imwrite(str(path), cv2.cvtColor(rgb8, cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, q])


def build():
    segs = segments()
    total = round(CFG["beats"] * FPB)
    total_s = total / FPS
    print(f"== {W}x{H}, {CFG['beats']} beat = {total_s:.1f} s, {len(segs)} tagli")

    if "--frames" in sys.argv:
        times = [float(x) for x in sys.argv[sys.argv.index("--frames") + 1].split(",")]
        fs = [min(total - 1, round(t * FPS)) for t in times]
        prepare(segs, total, fs)
        tiles = []
        for t, f in zip(times, fs):
            out8 = finish(frame_at(segs, f), f / FPS, total_s)
            save(ROOT / "render" / "check" / f"frame_{t:05.2f}.jpg", out8)
            tiles.append(cv2.resize(out8, (432, 768), interpolation=cv2.INTER_AREA))
        save(ROOT / "render" / "check" / "frames.jpg", np.hstack(tiles))
        print("  -> render/check/frames.jpg")
        return

    prepare(segs, total)
    if "--render-only" in sys.argv:
        return

    out_dir = ROOT / "out"
    out_dir.mkdir(exist_ok=True)
    mp4 = out_dir / f"{OUT_NAME}.mp4"
    enc = subprocess.Popen([
        "ffmpeg", "-v", "error", "-y",
        "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
        "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=48000",
        "-map", "0:v", "-map", "1:a", "-shortest",
        "-c:v", "libx264", "-profile:v", "high", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p",
        "-r", str(FPS), "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", str(mp4),
    ], stdin=subprocess.PIPE)
    sheet, cover = [], None
    for f in range(total):
        out8 = finish(frame_at(segs, f), f / FPS, total_s)
        enc.stdin.write(out8.tobytes())
        if f % FPB == FPB // 2:
            sheet.append(out8)
        if f == round(CFG["cover_at"] * FPS):
            cover = out8.copy()
        if f % 90 == 0:
            print(f"  {f}/{total}", flush=True)
    enc.stdin.close()
    enc.wait()

    # copertina: il fotogramma scelto con la frase più forte ben leggibile
    cov = cover.astype(np.float32) / 255
    rgb, a = overlay(CFG["cover_text"])
    save(out_dir / "cover.jpg", ((cov * (1 - a) + rgb * a) * 255).astype(np.uint8))
    # contact sheet: un fotogramma per beat, con il tempo
    cols, tw = 11, 196
    th = round(tw * H / W)
    rows = (len(sheet) + cols - 1) // cols
    cs_img = np.full((rows * (th + 26), cols * (tw + 4), 3), 24, np.uint8)
    for k, im in enumerate(sheet):
        r, c = divmod(k, cols)
        y, x = r * (th + 26) + 22, c * (tw + 4)
        cs_img[y:y + th, x:x + tw] = cv2.resize(im, (tw, th), interpolation=cv2.INTER_AREA)
        cv2.putText(cs_img, f"b{k} {k * BEAT + BEAT / 2:.1f}s", (x + 4, y - 6), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (230, 230, 230), 1, cv2.LINE_AA)
    save(out_dir / "contact-sheet.jpg", cs_img, 88)
    probe = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "stream=codec_type,codec_name,profile,width,height,pix_fmt,r_frame_rate:format=duration",
                            "-of", "json", str(mp4)], capture_output=True, text=True, check=True).stdout
    (out_dir / "ffprobe.json").write_text(probe, encoding="utf8")
    print(probe)
    print("  ->", mp4)


if __name__ == "__main__":
    build()
