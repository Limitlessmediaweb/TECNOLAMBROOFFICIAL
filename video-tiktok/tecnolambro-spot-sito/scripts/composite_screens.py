"""
Mette la registrazione del sito DENTRO lo schermo bianco dei telefoni delle clip stock.

- angoli dello schermo da render/track/<clip>.json (track_screens.py) -> omografia
- schermata del telefono: barra di stato in alto + registrazione (540x960 a DPR 2) + barra di Safari
  con il dominio in basso (lo schermo dello stock è più alto del 9:16 della registrazione)
- chiave di luminanza dello stock: dove lo schermo è bianco si vede il sito, dita e notch restano davanti
- bordi leggermente morbidi, sfumatura di luce dello stock conservata, riflesso al 12% (screen blend)

Uso come modulo (build.py) oppure:  python scripts/composite_screens.py <clip> <t_stock> <registrazione> <t_reg> out.jpg
"""
import json
import sys
from functools import lru_cache
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
FPS = 30
CFG = json.loads((ROOT / "config.json").read_text(encoding="utf8"))


@lru_cache(maxsize=4)
def track(clip):
    d = json.loads((ROOT / "render" / "track" / f"{clip}.json").read_text(encoding="utf8"))
    return np.array(d["corners"], np.float32)


def read_rgb(path):
    im = cv2.imread(str(path), cv2.IMREAD_COLOR)
    if im is None:
        raise FileNotFoundError(path)
    return cv2.cvtColor(im, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0


def frame_path(kind, clip, t, ext="jpg", digits=4):
    d = ROOT / kind / "frames" / clip
    n = len(list(d.glob(f"*.{ext}"))) if clip not in _counts else _counts[clip]
    _counts[clip] = n
    i = max(1, min(n, int(round(t * FPS)) + 1))
    return d / f"{i:0{digits}d}.{ext}"


_counts = {}


@lru_cache(maxsize=8)
def chrome(w, h, top, bottom):
    """Barra di stato e barra di Safari (chiare, come il tema predefinito del sito), RGBA float."""
    from PIL import Image, ImageDraw, ImageFont

    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    g = ImageDraw.Draw(img)
    bg = (245, 248, 250, 255)  # --c-bg del tema chiaro
    g.rectangle([0, 0, w, top], fill=bg)
    g.rectangle([0, h - bottom, w, h], fill=(236, 240, 243, 255))
    fonts = Path("C:/Windows/Fonts")
    try:
        f_time = ImageFont.truetype(str(fonts / "segoeuib.ttf"), int(w * 0.046))
        f_url = ImageFont.truetype(str(fonts / "segoeui.ttf"), int(w * 0.036))
    except OSError:
        f_time = f_url = ImageFont.load_default()
    ink = (23, 30, 44, 255)  # --c-fg
    # ora e icone di stato (forme generiche)
    g.text((int(w * 0.14), int(top * 0.52)), "9:41", font=f_time, fill=ink, anchor="mm")
    x0, yb = int(w * 0.75), int(top * 0.52) + 12
    for k in range(4):
        hh = 8 + 5 * k
        g.rounded_rectangle([x0 + k * 11, yb - hh, x0 + k * 11 + 7, yb], radius=2, fill=ink)
    bx = int(w * 0.84)
    g.rounded_rectangle([bx, yb - 22, bx + 46, yb], radius=6, outline=ink, width=3)
    g.rounded_rectangle([bx + 5, yb - 17, bx + 35, yb - 5], radius=3, fill=ink)
    # barra degli indirizzi di Safari con il dominio
    pad = int(w * 0.05)
    by0 = h - bottom + int(bottom * 0.12)
    g.rounded_rectangle([pad, by0, w - pad, by0 + int(bottom * 0.36)], radius=int(bottom * 0.12), fill=(255, 255, 255, 255))
    g.text((w // 2, by0 + int(bottom * 0.18)), CFG["site"]["domain"], font=f_url, fill=ink, anchor="mm")
    # indicatore home
    g.rounded_rectangle([w // 2 - int(w * 0.17), h - int(bottom * 0.12), w // 2 + int(w * 0.17), h - int(bottom * 0.12) + 8], radius=4, fill=ink)
    a = np.asarray(img).astype(np.float32) / 255.0
    return a[..., :3], a[..., 3:4]


def phone_screen(rec_rgb, aspect):
    """Schermata completa del telefono (larghezza 1080) con la registrazione al centro."""
    w = 1080
    h = int(round(w * aspect))
    rec = cv2.resize(rec_rgb, (w, int(round(rec_rgb.shape[0] * w / rec_rgb.shape[1]))), interpolation=cv2.INTER_AREA)
    rest = h - rec.shape[0]
    top = int(rest * 0.42)
    bottom = rest - top
    canvas = np.zeros((h, w, 3), np.float32)
    canvas[top:top + rec.shape[0]] = rec
    crgb, ca = chrome(w, h, top, bottom)
    return canvas * (1 - ca) + crgb * ca


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def composite(clip, t_stock, rec_rgb, stock=None):
    """Fotogramma dello stock all'istante t_stock con la registrazione dentro lo schermo (RGB float)."""
    if stock is None:
        stock = read_rgb(frame_path("stock", clip, t_stock))
    H, W = stock.shape[:2]
    q = track(clip)[max(0, min(len(track(clip)) - 1, int(round(t_stock * FPS))))]
    # lati: TL-TR in alto. Proporzione dello schermo dallo stock (altezza / larghezza)
    sw = (np.linalg.norm(q[1] - q[0]) + np.linalg.norm(q[2] - q[3])) / 2
    sh = (np.linalg.norm(q[3] - q[0]) + np.linalg.norm(q[2] - q[1])) / 2
    if sw > sh:  # orientamento: il lato corto è la larghezza
        q = np.roll(q, -1, axis=0)
        sw, sh = sh, sw
    content = phone_screen(rec_rgb, sh / sw)
    ch, cw = content.shape[:2]
    src = np.float32([[0, 0], [cw, 0], [cw, ch], [0, ch]])
    M = cv2.getPerspectiveTransform(src, q.astype(np.float32))
    warped = cv2.warpPerspective(content, M, (W, H), flags=cv2.INTER_AREA if sw < cw / 2 else cv2.INTER_LINEAR)
    quad = np.zeros((H, W), np.float32)
    cv2.fillConvexPoly(quad, np.round(q * 8).astype(np.int32), 1.0, lineType=cv2.LINE_AA, shift=3)
    # chiave di luminanza: lo schermo bianco dello stock diventa il sito, dita e notch restano
    lum = stock @ np.float32([0.2126, 0.7152, 0.0722])
    inside = lum[quad > 0.5]
    level = np.percentile(inside, 92) if inside.size else 1.0
    rel = lum / max(level, 1e-3)
    key = smoothstep(0.55, 0.8, rel) * quad
    key = cv2.GaussianBlur(key, (0, 0), 0.9)
    # luce dello stock sullo schermo (sfumature, ombra del dito) conservata in parte
    shade = np.clip(cv2.GaussianBlur(rel, (0, 0), 9), 0.55, 1.05) ** 0.6
    scr = warped * shade[..., None]
    # riflesso della stanza sul vetro: banda diagonale morbida, screen blend al 12%
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    band = np.exp(-(((xx - W * 0.2) * 0.7 + (yy - H * 0.3) * 0.7) / (W * 0.35)) ** 2)
    refl = (band[..., None] * np.float32([0.75, 0.88, 1.0])) * 0.12 * quad[..., None]
    scr = 1 - (1 - scr) * (1 - refl)
    return stock * (1 - key[..., None]) + scr * key[..., None]


if __name__ == "__main__":
    clip, ts, rec, tr, out = sys.argv[1], float(sys.argv[2]), sys.argv[3], float(sys.argv[4]), sys.argv[5]
    rec_rgb = read_rgb(frame_path("riprese", rec, tr, digits=5))
    img = composite(clip, ts, rec_rgb)
    cv2.imwrite(out, cv2.cvtColor((np.clip(img, 0, 1) * 255).astype(np.uint8), cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, 92])
