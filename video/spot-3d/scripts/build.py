"""
Montaggio ed export dello spot 3D (dopo scripts/render.mjs).

  python scripts/build.py

Uscite in out/:
  tecnolambro-spot-3d-9x16.mp4 / -16x9.mp4  H.264 High, yuv420p, CRF 18, preset slow, 30 fps costanti,
                                            traccia AAC muta, +faststart (mai yuv444p)
  cover-9x16.jpg / cover-16x9.jpg           copertine
  contact-9x16.jpg / contact-16x9.jpg       un fotogramma per beat, con le safe zone TikTok sul 9:16
  loop-twistable-1920x1080.mp4 / .webm      loop di 8 s senza testi, sotto i 4 MB (non va nel sito)
  ffprobe.json                              controllo finale
Se in config.json una scena ha slot.real con un file esistente, quel video sostituisce la scena 3D.
"""
import json
import os
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageStat

ROOT = Path(__file__).resolve().parent.parent
CFG = json.loads((ROOT / "config.json").read_text(encoding="utf-8"))
OUT = ROOT / "out"
OUT.mkdir(exist_ok=True)
FPS = CFG["fps"]
BEAT = CFG["beat"]

# grade leggero e uguale per tutto: vignettatura e grana fine
GRADE = "vignette=angle=PI/5:mode=forward,noise=alls=3:allf=t,format=yuv420p"


def run(cmd):
    print(" ".join(str(c) for c in cmd))
    subprocess.run([str(c) for c in cmd], check=True)


def frames_dir(fmt):
    return ROOT / "render" / fmt


def check_frames(fmt, total):
    d = frames_dir(fmt)
    missing = [i for i in range(total) if not (d / f"{i:05d}.png").exists()]
    if missing:
        sys.exit(f"{fmt}: mancano {len(missing)} fotogrammi (primo {missing[0]}): lancia node scripts/render.mjs {fmt}")


def real_slots(fmt, total):
    """Sostituisce i fotogrammi delle scene che hanno un video reale (slot.real) con quelli del video."""
    for sc in CFG["scenes"]:
        real = sc["slot"].get("real")
        if not real or not (ROOT / real).exists():
            continue
        w, h = CFG["formats"][fmt]["width"], CFG["formats"][fmt]["height"]
        start = round(sc["start"] * FPS)
        n = round(sc["beats"] * BEAT * FPS)
        tmp = ROOT / "render" / f"real-{fmt}-{sc['id']}"
        tmp.mkdir(parents=True, exist_ok=True)
        run(["ffmpeg", "-y", "-loglevel", "error", "-i", ROOT / real, "-vf", f"scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h},fps={FPS}", "-frames:v", n, tmp / "%05d.png"])
        for i in range(n):
            src = tmp / f"{i + 1:05d}.png"
            if src.exists():
                os.replace(src, frames_dir(fmt) / f"{start + i:05d}.png")
        print(f"{fmt}: scena {sc['id']} sostituita con {real}")


def encode(fmt):
    total = round(CFG["duration"] * FPS)
    check_frames(fmt, total)
    real_slots(fmt, total)
    out = OUT / f"tecnolambro-spot-3d-{fmt}.mp4"
    run([
        "ffmpeg", "-y", "-loglevel", "error",
        "-framerate", FPS, "-i", frames_dir(fmt) / "%05d.png",
        "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo",
        "-vf", GRADE, "-r", FPS, "-c:v", "libx264", "-profile:v", "high", "-pix_fmt", "yuv420p",
        "-crf", 18, "-preset", "slow", "-c:a", "aac", "-b:a", "128k", "-shortest", "-movflags", "+faststart", out,
    ])
    return out


def cover(fmt):
    # copertina: "Guidiamo le microonde." (secondo beat della scena 2, testo già entrato)
    f = round((2.4 + 1.2) * FPS)
    Image.open(frames_dir(fmt) / f"{f:05d}.png").convert("RGB").save(OUT / f"cover-{fmt}.jpg", quality=92)


def contact(fmt):
    w, h = CFG["formats"][fmt]["width"], CFG["formats"][fmt]["height"]
    beats = round(CFG["duration"] / BEAT)
    tw = 216 if h > w else 384
    th = round(tw * h / w)
    cols = 11 if h > w else 8
    rows = -(-beats // cols)
    sheet = Image.new("RGB", (cols * tw, rows * (th + 26)), "#111")
    draw = ImageDraw.Draw(sheet)
    try:
        font = ImageFont.truetype("arial.ttf", 14)
    except OSError:
        font = ImageFont.load_default()
    dark = []
    for b in range(beats):
        f = round((b + 0.5) * BEAT * FPS)
        im = Image.open(frames_dir(fmt) / f"{f:05d}.png").convert("RGB")
        mean = sum(ImageStat.Stat(im).mean) / 3
        if mean < 3:
            dark.append(b)
        if h > w:
            # safe zone TikTok: 150 px in alto, 380 in basso, 140 a destra
            d2 = ImageDraw.Draw(im)
            d2.rectangle([0, 150, w - 140, h - 380], outline=(255, 60, 60), width=4)
        x, y = (b % cols) * tw, (b // cols) * (th + 26)
        sheet.paste(im.resize((tw, th)), (x, y))
        draw.text((x + 4, y + th + 4), f"beat {b} · {b * BEAT:.1f}s", fill="#ddd", font=font)
    sheet.save(OUT / f"contact-{fmt}.jpg", quality=86)
    return dark


def loop():
    total = round(CFG["loop"]["duration"] * FPS)
    check_frames("loop", total)
    src = frames_dir("loop") / "%05d.png"
    mp4 = OUT / "loop-twistable-1920x1080.mp4"
    webm = OUT / "loop-twistable-1920x1080.webm"
    limit = CFG["loop"]["max_mb"] * 1024 * 1024
    for crf in (24, 27, 30, 33):
        run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", FPS, "-i", src, "-vf", "format=yuv420p", "-r", FPS, "-c:v", "libx264", "-profile:v", "high", "-pix_fmt", "yuv420p", "-crf", crf, "-preset", "slow", "-an", "-movflags", "+faststart", mp4])
        if mp4.stat().st_size < limit:
            break
    for crf in (34, 38, 42, 46):
        run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", FPS, "-i", src, "-vf", "format=yuv420p", "-r", FPS, "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", crf, "-row-mt", 1, "-an", webm])
        if webm.stat().st_size < limit:
            break
    return [mp4, webm]


def probe(files):
    out = {}
    for f in files:
        r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration,size:stream=codec_name,profile,width,height,pix_fmt,r_frame_rate,avg_frame_rate", "-of", "json", str(f)], capture_output=True, text=True, check=True)
        out[f.name] = json.loads(r.stdout)
    (OUT / "ffprobe.json").write_text(json.dumps(out, indent=2), encoding="utf-8")
    return out


if __name__ == "__main__":
    made = []
    report = {}
    for fmt in ("9x16", "16x9"):
        made.append(encode(fmt))
        cover(fmt)
        report[fmt] = contact(fmt)
    made += loop()
    info = probe(made)
    for name, d in info.items():
        v = next(s for s in d["streams"] if s.get("width"))
        print(f"{name}: {v['width']}x{v['height']} {v['codec_name']} {v.get('profile')} {v['pix_fmt']} {v['r_frame_rate']} · {float(d['format']['duration']):.2f} s · {int(d['format']['size']) / 1e6:.1f} MB")
    for fmt, dark in report.items():
        print(f"{fmt}: beat scuri {dark if dark else 'nessuno'}")
