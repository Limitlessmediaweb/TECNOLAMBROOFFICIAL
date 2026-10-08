import { DIM_BY_WR, MATERIAL, SIZE_BY_WR, num, rigidOuter } from "@/data/waveguides";
import { PRINT } from "@/data/brand";
import { visualBendRadius } from "@/data/configurator/defaults";
import { isFlexible, type PartSpec } from "@/data/configurator/types";
import { intlLocale } from "@/i18n/locales";

/**
 * Disegno tecnico indicativo del pezzo, come stringa SVG (stesso disegno a schermo, nel PDF e nella
 * scheda "Dimensioni"). Vista laterale nel piano di curvatura (non in scala per i pezzi lunghi),
 * sezione in scala con le quote, cartiglio. Solo dati del sito: nessun testo dell'utente.
 */
export type DrawingLabels = {
  side: string;
  section: string;
  note: string;
  date: string;
  scale: string;
  material: string;
  titleBlock: string;
  dimsUnknown: string;
  /** "orario" / "antiorario" */
  cw?: string;
  ccw?: string;
  /** "R standard" */
  radiusStd?: string;
};

export type DrawingInput = {
  spec: PartSpec;
  /** nomi leggibili delle flange (già tradotti, "Altra" compresa) */
  flangeA?: string | null;
  flangeB?: string | null;
  code?: string;
  /** generic = solo lettere (A, B, C, D, L), per la tabella dimensioni */
  generic?: boolean;
  locale: string;
  labels: DrawingLabels;
  palette: "screen" | "print";
  logoHref?: string;
  date?: string;
  title?: string;
};

export const DRAWING_SIZE = { w: 1000, h: 707 } as const;
export const LOGO_BOX = { x: 612, y: 566, w: 150, h: 55 } as const;

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

type Pal = { ink: string; muted: string; line: string; fill: string; accent: string; paper: string };
const SCREEN: Pal = { ink: "var(--c-fg)", muted: "var(--c-muted)", line: "var(--c-line-strong)", fill: "var(--c-surface-2)", accent: "var(--c-accent)", paper: "var(--c-surface)" };

type P = [number, number];

export function drawingSvg(input: DrawingInput): string {
  const Pl: Pal = input.palette === "print" ? PRINT : SCREEN;
  const { w: W, h: H } = DRAWING_SIZE;
  const L = input.labels;
  const loc = input.locale;
  const spec = input.spec;
  const font = input.palette === "print" ? ` font-family="Helvetica, Arial, sans-serif"` : "";
  const size = SIZE_BY_WR.get(spec.wr) ?? SIZE_BY_WR.get("WR-90")!;
  const flex = isFlexible(spec.type);
  const dim = DIM_BY_WR.get(size.wr);
  const known = flex ? Boolean(dim && dim.A && dim.B && dim.C && dim.D) : true;
  const generic = Boolean(input.generic);
  const v = (x: number | null | undefined, d = 2) => (x == null ? "—" : num(x, loc, 0, d));
  const out: string[] = [];
  const t = (x: number, y: number, text: string, o: { size?: number; anchor?: "start" | "middle" | "end"; color?: string; weight?: number; rotate?: number } = {}) =>
    out.push(
      `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="${o.size ?? 14}" fill="${o.color ?? Pl.ink}" text-anchor="${o.anchor ?? "start"}"${o.weight ? ` font-weight="${o.weight}"` : ""}${o.rotate ? ` transform="rotate(${o.rotate.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})"` : ""}>${esc(text)}</text>`,
    );
  const line = (a: P, b: P, color = Pl.ink, width = 1.4, dash?: string) =>
    out.push(`<line x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}" stroke="${color}" stroke-width="${width}"${dash ? ` stroke-dasharray="${dash}"` : ""}/>`);
  /** quota tra due punti, con frecce */
  const dimLine = (a: P, b: P, label: string, labelOffset = -8, color = Pl.muted) => {
    line(a, b, color, 1);
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const arrow = (p: P, dir: number) => {
      const s = 9;
      const back = dir > 0 ? ang : ang + Math.PI;
      out.push(`<path d="M${(p[0] + Math.cos(back + 0.35) * s).toFixed(1)} ${(p[1] + Math.sin(back + 0.35) * s).toFixed(1)} L${p[0].toFixed(1)} ${p[1].toFixed(1)} L${(p[0] + Math.cos(back - 0.35) * s).toFixed(1)} ${(p[1] + Math.sin(back - 0.35) * s).toFixed(1)}" fill="none" stroke="${color}" stroke-width="1"/>`);
    };
    arrow(a, 1);
    arrow(b, -1);
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    let deg = (ang * 180) / Math.PI;
    if (deg > 90) deg -= 180;
    if (deg < -90) deg += 180;
    const nx = -Math.sin((deg * Math.PI) / 180), ny = Math.cos((deg * Math.PI) / 180);
    t(mx + nx * labelOffset, my + ny * labelOffset, label, { anchor: "middle", size: 14, weight: 600, rotate: Math.abs(deg) > 1 ? deg : undefined });
  };

  // cornice
  out.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="${Pl.paper}"/>`);
  out.push(`<rect x="14" y="14" width="${W - 28}" height="${H - 28}" fill="none" stroke="${Pl.ink}" stroke-width="1.6"/>`);
  t(40, 58, L.side.toUpperCase(), { size: 13, color: Pl.muted, weight: 600 });

  /* ------------------------------------------------------- vista laterale */
  const outer = flex ? { w: dim?.A ?? size.a * 1.22, h: dim?.B ?? size.b * 1.36 } : rigidOuter(size);
  // dimensione nel piano del disegno: piano E → lato stretto, piano H → lato largo
  const inPlane = spec.plane === "H" ? outer.w : outer.h;
  const fl = (f?: string | null) => (generic ? "" : f ?? "");
  const box = { x0: 80, x1: 920, y0: 95, y1: 330 };

  if (spec.type === "bend" || spec.type === "offset") {
    // linea mediana in mm (y verso l'alto), poi scalata nel riquadro
    const pts: P[] = [];
    if (spec.type === "bend") {
      const R = visualBendRadius(spec);
      const th = ((spec.angle ?? 90) * Math.PI) / 180;
      const L1 = spec.leg1 ?? 100;
      const L2 = spec.leg2 ?? 100;
      pts.push([0, 0], [L1, 0]);
      for (let i = 1; i <= 24; i++) {
        const a = (th * i) / 24;
        pts.push([L1 + R * Math.sin(a), R - R * Math.cos(a)]);
      }
      const e = pts[pts.length - 1];
      pts.push([e[0] + L2 * Math.cos(th), e[1] + L2 * Math.sin(th)]);
    } else {
      const Lt = spec.length ?? 150;
      const X = spec.offset ?? 20;
      for (let i = 0; i <= 32; i++) {
        const s = i / 32;
        pts.push([Lt * s, X * s * s * (3 - 2 * s)]);
      }
    }
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const pad = inPlane * 1.6 + 6;
    const bx0 = Math.min(...xs) - pad, bx1 = Math.max(...xs) + pad, by0 = Math.min(...ys) - pad, by1 = Math.max(...ys) + pad;
    const k = Math.min((box.x1 - box.x0) / (bx1 - bx0), (box.y1 - box.y0) / (by1 - by0));
    const cx = (box.x0 + box.x1) / 2 - ((bx0 + bx1) / 2) * k;
    const cy = (box.y0 + box.y1) / 2 + ((by0 + by1) / 2) * k;
    const S = (p: P): P => [cx + p[0] * k, cy - p[1] * k];
    const hw = Math.max(5, (inPlane / 2) * k);
    // normali e contorni
    const norms = pts.map((p, i) => {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const len = Math.hypot(dx, dy) || 1;
      return [-dy / len, dx / len] as P;
    });
    const sp = pts.map(S);
    const upper = sp.map((p, i) => [p[0] - norms[i][0] * hw, p[1] + norms[i][1] * hw] as P);
    const lower = sp.map((p, i) => [p[0] + norms[i][0] * hw, p[1] - norms[i][1] * hw] as P);
    const poly = [...upper, ...lower.reverse()].map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
    out.push(`<polygon points="${poly}" fill="${Pl.fill}" stroke="${Pl.ink}" stroke-width="1.5"/>`);
    out.push(`<polyline points="${sp.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ")}" fill="none" stroke="${Pl.line}" stroke-width="0.9" stroke-dasharray="18 4 3 4"/>`);
    // flange perpendicolari agli estremi
    const flH = hw * 1.9, flT = Math.max(7, hw * 0.55);
    const flange = (i: number, label: string, endSide: 1 | -1) => {
      const p = sp[i], n = norms[i];
      const dir: P = [n[1], n[0]]; // tangente sullo schermo (y invertita)
      const tx = dir[0] * endSide, ty = -dir[1] * endSide;
      const nx = -n[0], ny = n[1];
      const c = [
        [p[0] + nx * flH, p[1] + ny * flH],
        [p[0] - nx * flH, p[1] - ny * flH],
        [p[0] - nx * flH + tx * flT, p[1] - ny * flH + ty * flT],
        [p[0] + nx * flH + tx * flT, p[1] + ny * flH + ty * flT],
      ];
      out.push(`<polygon points="${c.map((q) => `${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(" ")}" fill="${Pl.fill}" stroke="${Pl.accent}" stroke-width="1.8"/>`);
      if (label) t(p[0] + nx * (flH + 16), p[1] + ny * (flH + 16) + 4, label, { anchor: "middle", size: 12, color: Pl.muted });
    };
    flange(0, fl(input.flangeA) ? `1 · ${fl(input.flangeA)}` : "1", 1);
    flange(sp.length - 1, fl(input.flangeB) ? `2 · ${fl(input.flangeB)}` : "2", -1);
    // quote
    if (spec.type === "bend") {
      const L1 = spec.leg1 ?? 100;
      const a = S([0, 0]), b = S([L1, 0]);
      const off = hw + 26;
      dimLine([a[0], a[1] + off], [b[0], b[1] + off], generic ? "L1" : `L1 = ${v(L1, 1)}`, 16);
      const e1 = sp[sp.length - 2], e2 = sp[sp.length - 1];
      const n2 = norms[norms.length - 1];
      dimLine([e1[0] + n2[0] * off, e1[1] - n2[1] * off], [e2[0] + n2[0] * off, e2[1] - n2[1] * off], generic ? "L2" : `L2 = ${v(spec.leg2 ?? 100, 1)}`, 16);
      const mid = sp[13];
      const nm = norms[13];
      const ang = `${v(spec.angle ?? 90, 1)}°`;
      const rad = spec.radius ? `R ${v(spec.radius, 1)}` : L.radiusStd ?? "R std";
      t(mid[0] + nm[0] * (hw + 34), mid[1] - nm[1] * (hw + 34), `${ang} · ${rad}`, { anchor: "middle", size: 15, weight: 600, color: Pl.accent });
      t(box.x0, box.y1 + 4, `${spec.plane === "H" ? "H" : "E"}-plane`, { size: 12, color: Pl.muted });
    } else {
      const Lt = spec.length ?? 150;
      const X = spec.offset ?? 20;
      const a = S([0, 0]), b = S([Lt, X]);
      const yb = Math.max(a[1], b[1]) + hw + 40;
      dimLine([a[0], yb], [b[0], yb], generic ? "L" : `L = ${v(Lt, 1)}`, 16);
      const xr = Math.max(a[0], b[0]) + hw * 1.9 + 30;
      line([b[0] + flT + 4, b[1]], [xr + 6, b[1]], Pl.muted, 0.6);
      line([a[0], a[1]], [xr + 6, a[1]], Pl.muted, 0.6, "4 3");
      dimLine([xr, a[1]], [xr, b[1]], generic ? "X" : `X = ${v(X, 1)}`, -14);
      t(box.x0, box.y1 + 4, `${spec.plane === "H" ? "H" : "E"}-plane`, { size: 12, color: Pl.muted });
    }
  } else {
    // pezzi dritti: flessibile (corrugata o liscia, lunghezza interrotta) e twist rigido
    const cy = 215, fh = 150, ft = 16;
    const bh = flex ? Math.min(104, Math.max(70, (fh / 1.7) * (outer.h > outer.w ? 1.1 : 1))) : 72;
    const amp = flex && spec.type === "twistable" && dim?.C ? Math.max(3.5, Math.min(9, (bh / 2) * (((dim.A ?? 0) - dim.C) / (dim.A ?? 1)) * 0.9)) : 0;
    const xL = 84, xR = 916, x1 = xL + ft, x2 = xR - ft;
    const broken = flex;
    const gap1 = 478, gap2 = 522;
    const wave = (from: number, to: number, y: number, dir: 1 | -1) => {
      if (!amp) return `M${from} ${y} H${to}`;
      let d = `M${from} ${y}`;
      for (let x = from; x < to - 0.1; x += 9) {
        const xe = Math.min(to, x + 9);
        d += ` Q${(x + xe) / 2} ${y - dir * amp * 2} ${xe} ${y}`;
      }
      return d;
    };
    const spans: [number, number][] = broken ? [[x1, gap1], [gap2, x2]] : [[x1, x2]];
    for (const [a, b] of spans) {
      out.push(`<rect x="${a}" y="${cy - bh / 2}" width="${b - a}" height="${bh}" fill="${Pl.fill}"/>`);
      out.push(`<path d="${wave(a, b, cy - bh / 2, 1)}" fill="none" stroke="${Pl.ink}" stroke-width="1.5"/>`);
      out.push(`<path d="${wave(a, b, cy + bh / 2, -1)}" fill="none" stroke="${Pl.ink}" stroke-width="1.5"/>`);
      if (!flex) {
        line([a, cy - bh / 2 + 7], [b, cy - bh / 2 + 7], Pl.line, 1, "5 4");
        line([a, cy + bh / 2 - 7], [b, cy + bh / 2 - 7], Pl.line, 1, "5 4");
      }
    }
    if (broken) for (const gx of [gap1, gap2]) out.push(`<path d="M${gx} ${cy - bh / 2 - 12} l-6 ${bh / 4 + 6} l12 ${bh / 4} l-12 ${bh / 4} l6 ${bh / 4 + 6}" fill="none" stroke="${Pl.ink}" stroke-width="1.2"/>`);
    line([56, cy], [944, cy], Pl.line, 0.9, "18 4 3 4");
    for (const fx of [xL, x2]) {
      out.push(`<rect x="${fx}" y="${cy - fh / 2}" width="${ft}" height="${fh}" fill="${Pl.fill}" stroke="${Pl.accent}" stroke-width="1.8"/>`);
      line([fx, cy - fh / 2 + 18], [fx + ft, cy - fh / 2 + 18], Pl.line, 1, "4 3");
      line([fx, cy + fh / 2 - 18], [fx + ft, cy + fh / 2 - 18], Pl.line, 1, "4 3");
    }
    if (spec.type === "twistable" || spec.type === "twist") {
      const cxs = spec.type === "twist" ? 500 : 500;
      out.push(`<path d="M${cxs - 22} ${cy - bh / 2 - 22} A 26 9 0 1 1 ${cxs + 22} ${cy - bh / 2 - 22}" fill="none" stroke="${Pl.accent}" stroke-width="1.6"/>`);
      out.push(`<path d="M${cxs + 16} ${cy - bh / 2 - 28} L${cxs + 22} ${cy - bh / 2 - 22} L${cxs + 14} ${cy - bh / 2 - 18}" fill="none" stroke="${Pl.accent}" stroke-width="1.6"/>`);
    }
    if (spec.type === "twist") {
      const rot = `${v(spec.rotation ?? 90, 1)}° ${spec.direction === "ccw" ? L.ccw ?? "CCW" : L.cw ?? "CW"}`;
      t(500, cy + bh / 2 + 34, generic ? "θ" : rot, { anchor: "middle", size: 15, weight: 600, color: Pl.accent });
    }
    line([xL, cy - fh / 2 - 6], [xL, 90], Pl.muted, 0.8);
    line([xR, cy - fh / 2 - 6], [xR, 90], Pl.muted, 0.8);
    dimLine([xL, 100], [xR, 100], !generic && spec.length ? `L = ${num(spec.length, loc, 0, 0)} mm` : "L", -8);
    t(xL + ft / 2, cy + fh / 2 + 26, fl(input.flangeA) ? `1 · ${fl(input.flangeA)}` : "1", { size: 13, color: Pl.muted });
    t(xR - ft / 2, cy + fh / 2 + 26, fl(input.flangeB) ? `2 · ${fl(input.flangeB)}` : "2", { anchor: "end", size: 13, color: Pl.muted });
    if (flex && !generic && dim?.P && spec.type === "twistable") t(560, cy - bh / 2 - 10, `P = ${v(dim.P)}`, { size: 12, color: Pl.muted });
  }

  /* ------------------------------------------------------------- sezione */
  t(40, 360, L.section.toUpperCase(), { size: 13, color: Pl.muted, weight: 600 });
  const scx = 290, scy = 512;
  if (flex) {
    const A = dim?.A ?? size.a * 1.22, B = dim?.B ?? size.b * 1.36, C = dim?.C ?? A * 0.86, D = dim?.D ?? B * 0.68, r = dim?.r ?? 3, R = dim?.R ?? 5;
    const s = Math.min(300 / A, 170 / B);
    const ow = A * s, oh = B * s, iw = C * s, ih = D * s;
    const isGen = generic || !known;
    out.push(`<rect x="${scx - ow / 2}" y="${scy - oh / 2}" width="${ow}" height="${oh}" rx="${Math.min(R * s, oh / 2)}" fill="${spec.type === "seamless" ? Pl.line : Pl.fill}" stroke="${Pl.ink}" stroke-width="1.8"/>`);
    out.push(`<rect x="${scx - iw / 2}" y="${scy - ih / 2}" width="${iw}" height="${ih}" rx="${Math.min(r * s, ih / 2)}" fill="${Pl.paper}" stroke="${Pl.accent}" stroke-width="1.4" stroke-dasharray="6 4"/>`);
    dimLine([scx - ow / 2, scy + oh / 2 + 34], [scx + ow / 2, scy + oh / 2 + 34], isGen ? "A" : `A = ${v(dim?.A)}`, 18);
    dimLine([scx - iw / 2, scy - oh / 2 - 26], [scx + iw / 2, scy - oh / 2 - 26], isGen ? "C" : `C = ${v(dim?.C)}`, -8, Pl.accent);
    dimLine([scx + ow / 2 + 30, scy - oh / 2], [scx + ow / 2 + 30, scy + oh / 2], isGen ? "B" : `B = ${v(dim?.B)}`, -14);
    dimLine([scx - ow / 2 - 30, scy - ih / 2], [scx - ow / 2 - 30, scy + ih / 2], isGen ? "D" : `D = ${v(dim?.D)}`, 14, Pl.accent);
    t(scx, 684, isGen ? (generic ? "r, R · P   (mm)" : L.dimsUnknown) : `r = ${v(dim?.r)} · R = ${v(dim?.R)} · P = ${v(dim?.P)} · ± ${v(dim?.tol)}   (mm)`, { anchor: "middle", size: 12, color: Pl.muted });
  } else {
    const o = rigidOuter(size);
    const s = Math.min(300 / o.w, 170 / o.h);
    const ow = o.w * s, oh = o.h * s, iw = size.a * s, ih = size.b * s;
    out.push(`<rect x="${scx - ow / 2}" y="${scy - oh / 2}" width="${ow}" height="${oh}" fill="${Pl.fill}" stroke="${Pl.ink}" stroke-width="1.8"/>`);
    out.push(`<rect x="${scx - iw / 2}" y="${scy - ih / 2}" width="${iw}" height="${ih}" fill="${Pl.paper}" stroke="${Pl.ink}" stroke-width="1.4"/>`);
    dimLine([scx - iw / 2, scy + oh / 2 + 34], [scx + iw / 2, scy + oh / 2 + 34], `a = ${v(size.a)}`, 18);
    dimLine([scx + ow / 2 + 30, scy - ih / 2], [scx + ow / 2 + 30, scy + ih / 2], `b = ${v(size.b)}`, -14);
    t(scx, 684, `${size.wr} · ${size.iec} · ${size.wg}   (mm)`, { anchor: "middle", size: 12, color: Pl.muted });
  }

  /* ------------------------------------------------------------- cartiglio */
  const bx = 600, by = 556, bw = 386, bh2 = 137;
  out.push(`<rect x="${bx}" y="${by}" width="${bw}" height="${bh2}" fill="${Pl.paper}" stroke="${Pl.ink}" stroke-width="1.4"/>`);
  line([bx, by + 72], [bx + bw, by + 72], Pl.ink, 1);
  line([bx, by + 104], [bx + bw, by + 104], Pl.ink, 1);
  line([bx + 170, by], [bx + 170, by + 72], Pl.ink, 1);
  line([bx + 150, by + 72], [bx + 150, by + 104], Pl.ink, 1);
  line([bx + 270, by + 72], [bx + 270, by + 104], Pl.ink, 1);
  if (input.logoHref) out.push(`<image href="${esc(input.logoHref)}" x="${LOGO_BOX.x}" y="${LOGO_BOX.y}" width="${LOGO_BOX.w}" height="${LOGO_BOX.h}" preserveAspectRatio="xMidYMid meet"/>`);
  t(bx + 182, by + 22, L.titleBlock, { size: 11, color: Pl.muted });
  const code = input.code ?? size.wr;
  const lines: string[] = [];
  for (const part of code.split(" · ")) {
    const last = lines[lines.length - 1];
    if (last && `${last} · ${part}`.length <= 24) lines[lines.length - 1] = `${last} · ${part}`;
    else lines.push(part);
  }
  const shown = lines.length > 2 ? [lines[0], lines.slice(1).join(" · ")] : lines;
  shown.forEach((l, i) => t(bx + 182, by + (shown.length === 1 ? 52 : 44 + i * 19), l, { size: shown.length === 1 ? 16 : l.length > 30 ? 11.5 : 14, weight: 700 }));
  t(bx + 10, by + 85, L.material.toUpperCase(), { size: 9, color: Pl.muted });
  t(bx + 10, by + 98, `OT 80 · ${MATERIAL.replace("OT 80 ", "")}`, { size: 11 });
  t(bx + 160, by + 85, L.date.toUpperCase(), { size: 9, color: Pl.muted });
  t(bx + 160, by + 98, input.date ?? "", { size: 11 });
  t(bx + 280, by + 98, L.scale, { size: 11 });
  t(bx + 10, by + 124, L.note, { size: 10.5, color: Pl.accent, weight: 600 });

  const title = input.title ? `<title>${esc(input.title)}</title>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"${font}>${title}${out.join("")}</svg>`;
}

/** Data del cartiglio nel formato della lingua. */
export function drawingDate(locale: string, d = new Date()): string {
  return new Intl.DateTimeFormat(intlLocale(locale), { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
}
