"""
Segue lo schermo bianco del telefono nelle clip stock, fotogramma per fotogramma (OpenCV).

Per ogni fotogramma: regione chiara più grande -> inviluppo convesso (le dita che entrano nello
schermo non lo deformano) -> 4 lati stimati con fitLine -> angoli = intersezioni dei lati.
Poi si scartano i salti anomali e si leviga nel tempo (media mobile pesata su ±3 fotogrammi).

Uso: python scripts/track_screens.py [clip ...]   -> render/track/<clip>.json  (angoli TL TR BR BL in px)
"""
import json
import sys
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
CLIPS = {
    # soglia sulla luminanza (0-255) e area minima in frazione del fotogramma
    "hand_phone_dark": {"thr": 150, "min_area": 0.04, "close": 81},
    "phone_table_top": {"thr": 175, "min_area": 0.01, "close": 41},
}


def order(pts):
    """TL, TR, BR, BL in base all'angolo attorno al baricentro, partendo dall'alto a sinistra."""
    c = pts.mean(axis=0)
    ang = np.arctan2(pts[:, 1] - c[1], pts[:, 0] - c[0])
    pts = pts[np.argsort(ang)]  # da -pi: in alto a sinistra circa
    # ruota finché il primo è quello con x+y minimo
    k = int(np.argmin(pts.sum(axis=1)))
    return np.roll(pts, -k, axis=0)


def corners(gray, cfg):
    _, m = cv2.threshold(gray, cfg["thr"], 255, cv2.THRESH_BINARY)
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    # chiude i tagli fatti dalle dita che attraversano lo schermo
    k = cfg["close"]
    mc = cv2.morphologyEx(m, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k)))
    cs, _ = cv2.findContours(mc, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    if not cs:
        return None
    c = max(cs, key=cv2.contourArea)
    if cv2.contourArea(c) < cfg["min_area"] * gray.size:
        return None
    hull = cv2.convexHull(c)
    quad = order(cv2.boxPoints(cv2.minAreaRect(hull)).astype(np.float32))
    # bordi veri: contorno della maschera non chiusa (le dita restano fuori dai lati)
    cs2, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    pts = np.concatenate([x[:, 0, :] for x in cs2 if cv2.contourArea(x) > 200]).astype(np.float32)
    for _ in range(2):
        lines = []
        for i in range(4):
            a, b = quad[i], quad[(i + 1) % 4]
            d = b - a
            L = np.linalg.norm(d)
            n = np.array([-d[1], d[0]]) / L
            rel = pts - a
            s_ = rel @ (d / L)
            dist = np.abs(rel @ n)
            sel = pts[(s_ > 0.15 * L) & (s_ < 0.85 * L) & (dist < 0.025 * L + 3)]
            if len(sel) < 20:
                lines.append((a, d / L))
                continue
            vx, vy, x0, y0 = cv2.fitLine(sel, cv2.DIST_HUBER, 0, 0.01, 0.01).ravel()
            lines.append((np.array([x0, y0]), np.array([vx, vy])))
        out = []
        for i in range(4):
            (p1, d1), (p2, d2) = lines[i - 1], lines[i]
            try:
                t = np.linalg.solve(np.array([d1, -d2]).T, p2 - p1)
                out.append(p1 + d1 * t[0])
            except np.linalg.LinAlgError:
                out.append(quad[i])
        quad = np.array(out, np.float32)
    return quad


def track(clip):
    cfg = CLIPS[clip]
    files = sorted((ROOT / "stock" / "frames" / clip).glob("*.jpg"))
    raw = []
    for f in files:
        im = cv2.imread(str(f))
        gray = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY)
        q = corners(gray, cfg)
        raw.append(None if q is None else q.tolist())
    arr = np.array([np.full((4, 2), np.nan) if q is None else q for q in raw], np.float32)
    n = len(arr)
    # forma: il telefono è rigido, quindi proporzioni e area restano quasi costanti.
    # Un quadrilatero fuori forma (un dito ha spostato un lato) viene scartato.
    def shape(q):
        s = [np.linalg.norm(q[(i + 1) % 4] - q[i]) for i in range(4)]
        return (s[1] + s[3]) / (s[0] + s[2]), cv2.contourArea(q.astype(np.float32))
    sh = np.array([shape(q) if not np.isnan(q).any() else (np.nan, np.nan) for q in arr])
    for i in range(n):
        lo, hi = max(0, i - 30), min(n, i + 31)
        med = np.nanmedian(sh[lo:hi], axis=0)
        if np.isnan(sh[i]).any() or abs(sh[i, 0] / med[0] - 1) > 0.025 or abs(sh[i, 1] / med[1] - 1) > 0.04:
            arr[i] = np.nan
    valid = ~np.isnan(arr[:, 0, 0])
    # salti anomali: un angolo che si sposta molto più della mediana locale viene scartato
    for i in range(n):
        lo, hi = max(0, i - 4), min(n, i + 5)
        med = np.nanmedian(arr[lo:hi], axis=0)
        bad = np.linalg.norm(arr[i] - med, axis=1) > 14
        arr[i][bad] = np.nan
    # interpolazione dei buchi
    for k in range(4):
        for j in range(2):
            v = arr[:, k, j]
            ok = ~np.isnan(v)
            arr[:, k, j] = np.interp(np.arange(n), np.flatnonzero(ok), v[ok])
    # levigatura (pesi triangolari ±3)
    w = np.array([1, 2, 3, 4, 3, 2, 1], np.float32)
    sm = arr.copy()
    for i in range(n):
        lo, hi = max(0, i - 3), min(n, i + 4)
        ww = w[3 - (i - lo): 3 + (hi - i)]
        sm[i] = (arr[lo:hi] * ww[:, None, None]).sum(axis=0) / ww.sum()
    out = ROOT / "render" / "track"
    out.mkdir(parents=True, exist_ok=True)
    miss = sum(q is None for q in raw)
    # finestre di 3 s con più fotogrammi validi (lì il compositing è più affidabile)
    win = 90
    score = np.convolve(valid.astype(float), np.ones(win), "valid") / win
    best = [int(i) for i in np.argsort(-score)[:200:20]]
    (out / f"{clip}.json").write_text(json.dumps({"size": list(cv2.imread(str(files[0])).shape[1::-1]), "corners": sm.round(2).tolist(), "valid": valid.astype(int).tolist(), "missed": miss}), encoding="utf8")
    print(f"{clip}: {n} fotogrammi, {miss} senza rilevamento, {int(valid.sum())} validi; finestre 3 s migliori (inizio s: quota valida):",
          ", ".join(f"{i / 30:.1f}: {score[i]:.2f}" for i in sorted(set(best))))


if __name__ == "__main__":
    for c in sys.argv[1:] or CLIPS:
        track(c)
