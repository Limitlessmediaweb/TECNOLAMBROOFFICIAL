"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import { LOGO, THEME } from "@/data/brand";

/**
 * Campo elettrico del modo TE10 in una guida rettangolare, in proiezione obliqua.
 *  - asse z: lunghezza della guida (sinistra → destra)
 *  - asse x: lato largo a (in profondità)
 *  - asse y: lato stretto b (verticale), direzione del campo E
 * E_y(x, z, t) = sin(πx/a) · cos(kz − ωt). Ottone per E > 0, acciaio per E < 0.
 * Sulla sezione d'ingresso è disegnato il profilo d'intensità sin(πx/a).
 * Fermo con prefers-reduced-motion, in pausa fuori dal viewport e con la scheda nascosta.
 */

type Palette = { positive: string; negative: string; line: string; muted: string };

/** Colori dai token CSS: E > 0 nel blu del logo, E < 0 nel grigio del logo. */
function readPalette(): Palette {
  const s = getComputedStyle(document.documentElement);
  const fallback = document.documentElement.dataset.theme === "dark" ? THEME.dark : THEME.light;
  const v = (name: string, alt: string) => s.getPropertyValue(name).trim() || alt;
  return {
    positive: v("--c-primary", fallback.primary),
    negative: v("--c-secondary", LOGO.grey),
    line: v("--c-line-strong", fallback.line),
    muted: v("--c-muted", fallback.muted),
  };
}

/** "#rrggbb" → "rgba(r,g,b,a)" */
function rgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const num = parseInt(full, 16);
  return `rgba(${(num >> 16) & 255},${(num >> 8) & 255},${num & 255},${alpha.toFixed(3)})`;
}

export function TE10Field({ className, label }: { className?: string; label: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let palette = readPalette();
    // Font letto una volta (getComputedStyle a ogni frame costa)
    const font = `500 11px ${getComputedStyle(document.documentElement).getPropertyValue("--font-plex-mono").trim() || "monospace"}, monospace`;
    let width = 0;
    let height = 0;
    let raf = 0;
    let running = false;
    let inView = true;
    let t = 0;
    let last = 0;
    let lastDraw = 0;
    const LEVELS = 8;
    const buckets: number[][] = Array.from({ length: LEVELS * 2 }, () => []);
    // 30 fps su schermi piccoli o CPU modeste, 60 altrove
    const lowPower = window.innerWidth < 768 || (navigator.hardwareConcurrency ?? 8) <= 4;
    const frameMs = lowPower ? 1000 / 30 : 1000 / 60;
    let ready = false;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      const mobile = width < 768;

      // Geometria della guida in pixel
      const len = mobile ? width * 1.05 : width * 0.66; // lunghezza visibile lungo z
      const b = mobile ? Math.min(height * 0.16, 90) : Math.min(height * 0.2, 150); // lato stretto
      const aDepth = b * 1.35; // lato largo, in profondità (a/b ≈ 2.25 per WR-90, accorciato dalla prospettiva)
      const ang = (-28 * Math.PI) / 180;
      const dx = Math.cos(ang) * aDepth;
      const dy = Math.sin(ang) * aDepth;
      const z0 = mobile ? width * 0.08 : width * 0.4; // inizio a sinistra
      const y0 = mobile ? height * 0.36 : height * 0.6; // spigolo inferiore frontale

      // Proiezione (x 0..1, y 0..1, z px) → schermo
      const P = (x: number, y: number, z: number): [number, number] => [z0 + z + x * dx, y0 - y * b + x * dy];

      // Pareti: spigoli lunghi
      ctx.lineWidth = 1;
      ctx.strokeStyle = rgba(palette.line, 0.9);
      ctx.beginPath();
      for (const [x, y] of [
        [0, 0],
        [0, 1],
        [1, 0],
        [1, 1],
      ] as const) {
        const [ax, ay] = P(x, y, 0);
        const [bx, by] = P(x, y, len);
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
      }
      ctx.stroke();

      // Sezioni trasversali a intervalli regolari (tratteggio leggero)
      ctx.setLineDash([3, 5]);
      ctx.strokeStyle = rgba(palette.line, 0.55);
      const sections = mobile ? 6 : 8;
      for (let i = 0; i <= sections; i++) {
        const z = (i / sections) * len;
        const c = [P(0, 0, z), P(1, 0, z), P(1, 1, z), P(0, 1, z)];
        ctx.beginPath();
        ctx.moveTo(c[0][0], c[0][1]);
        for (let k = 1; k < 4; k++) ctx.lineTo(c[k][0], c[k][1]);
        ctx.closePath();
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // Campo E: vettori verticali su una griglia x × z. I tratti sono raggruppati per colore e
      // intensità (LEVELS secchi) e disegnati con un solo stroke() per gruppo: ~16 stroke per frame.
      const kz = (2 * Math.PI) / (len / (mobile ? 2.2 : 3.2)); // lunghezza d'onda guidata
      const cols = Math.max(24, Math.floor(len / (mobile ? 15 : 13)));
      const rows = mobile ? 7 : 9;
      for (const b of buckets) b.length = 0;
      for (let j = rows - 1; j >= 0; j--) {
        const x = (j + 0.5) / rows;
        const profile = Math.sin(Math.PI * x);
        for (let i = 0; i < cols; i++) {
          const z = ((i + 0.5) / cols) * len;
          const e = profile * Math.cos(kz * z - t);
          const mag = Math.abs(e);
          if (mag < 0.04) continue;
          const half = mag * 0.42;
          const [x1, y1] = P(x, 0.5 - half, z);
          const [x2, y2] = P(x, 0.5 + half, z);
          const level = Math.min(LEVELS - 1, Math.floor(mag * LEVELS));
          const bucket = buckets[(e > 0 ? 0 : LEVELS) + level];
          // La freccia punta verso +y (E > 0) o −y (E < 0)
          const up = e > 0;
          const tx = up ? x2 : x1;
          const ty = up ? y2 : y1;
          const head = 2.5 + mag * 2.5;
          const dir = up ? 1 : -1;
          bucket.push(up ? x1 : x2, up ? y1 : y2, tx, ty, tx - head * 0.7, ty + head * dir, tx + head * 0.7, ty + head * dir);
        }
      }
      for (let k = 0; k < buckets.length; k++) {
        const pts = buckets[k];
        if (!pts.length) continue;
        const positive = k < LEVELS;
        const mag = ((k % LEVELS) + 0.5) / LEVELS;
        ctx.strokeStyle = rgba(positive ? palette.positive : palette.negative, 0.22 + mag * 0.72);
        ctx.lineWidth = 1.1 + mag * 0.9;
        ctx.beginPath();
        for (let q = 0; q < pts.length; q += 8) {
          ctx.moveTo(pts[q], pts[q + 1]);
          ctx.lineTo(pts[q + 2], pts[q + 3]);
          ctx.moveTo(pts[q + 4], pts[q + 5]);
          ctx.lineTo(pts[q + 2], pts[q + 3]);
          ctx.lineTo(pts[q + 6], pts[q + 7]);
        }
        ctx.stroke();
      }

      // Profilo d'intensità sin(πx/a) sulla sezione d'ingresso (z = 0)
      ctx.beginPath();
      for (let s = 0; s <= 40; s++) {
        const x = s / 40;
        const [px, py] = P(x, 1 + Math.sin(Math.PI * x) * 0.55, 0);
        if (s === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = rgba(palette.positive, 0.95);
      ctx.lineWidth = 1.5;
      ctx.stroke();
      const [ax, ay] = P(0, 1, 0);
      const [bx, by] = P(1, 1, 0);
      ctx.strokeStyle = rgba(palette.muted, 0.6);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();

      // Annotazioni da disegno tecnico
      ctx.fillStyle = rgba(palette.muted, 0.85);
      ctx.font = font;
      const [lx, ly] = P(0.5, 1 + 0.75, 0);
      ctx.fillText("|E| ∝ sin(πx/a)", lx - 40, ly - 6);
      const [ex, ey] = P(1, 0, len * 0.985);
      ctx.fillText("z →", ex - 30, ey + 18);
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (now - lastDraw < frameMs - 1) return;
      lastDraw = now;
      const dt = last ? Math.min((now - last) / 1000, 0.08) : 0;
      last = now;
      t += dt * 2.1;
      draw();
    };

    const start = () => {
      if (!ready || running || reduce.matches || !inView || document.hidden || host?.hasAttribute("data-paused")) return;
      running = true;
      last = 0;
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        if (inView) start();
        else stop();
      },
      { threshold: 0.01 },
    );
    io.observe(canvas);
    const onVisibility = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVisibility);
    const onMotion = () => (reduce.matches ? (stop(), draw()) : start());
    reduce.addEventListener("change", onMotion);
    // Cambio tema: rilegge i colori
    // Pausa manuale (MotionToggle sul contenitore [data-motion-host])
    const host = canvas.closest<HTMLElement>("[data-motion-host]");
    const hostObserver = new MutationObserver(() => (host?.hasAttribute("data-paused") ? stop() : start()));
    if (host) hostObserver.observe(host, { attributes: true, attributeFilter: ["data-paused"] });
    const mo = new MutationObserver(() => {
      palette = readPalette();
      draw();
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    resize();
    // L'animazione parte dopo l'intro e quando il browser è libero: niente lavoro durante il caricamento.
    const idle = (cb: () => void) =>
      typeof window.requestIdleCallback === "function" ? window.requestIdleCallback(cb, { timeout: 1800 }) : setTimeout(cb, 900);
    const begin = () =>
      idle(() => {
        ready = true;
        start();
      });
    if (document.documentElement.dataset.intro === "play") window.addEventListener("tl:intro-end", begin, { once: true });
    else if (document.readyState === "complete") begin();
    else window.addEventListener("load", begin, { once: true });

    return () => {
      stop();
      window.removeEventListener("tl:intro-end", begin);
      window.removeEventListener("load", begin);
      ro.disconnect();
      io.disconnect();
      mo.disconnect();
      hostObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      reduce.removeEventListener("change", onMotion);
    };
  }, []);

  return <canvas ref={canvasRef} role="img" aria-label={label} className={cn("block h-full w-full", className)} />;
}
