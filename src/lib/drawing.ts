import { DIM_BY_WR, MATERIAL, SIZE_BY_WR, num } from "@/data/waveguides";
import { PRINT } from "@/data/brand";

/**
 * Disegno tecnico indicativo della guida d'onda flessibile, come stringa SVG.
 * Lo stesso disegno serve a schermo (colori dai token CSS), nel PDF (colori del tema chiaro,
 * vedi PRINT) e nella scheda "Dimensioni" (solo lettere, senza valori).
 * Vista laterale non in scala (lunghezza interrotta), sezione in scala con le quote della tabella.
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
};

export type DrawingInput = {
  wr: string;
  /** twistable mostra il simbolo di torsione */
  twist?: boolean;
  lengthMm?: number | null;
  flangeA?: string | null;
  flangeB?: string | null;
  code?: string;
  /** generic = solo lettere (A, B, C, D, L), per la tabella dimensioni */
  generic?: boolean;
  locale: string;
  labels: DrawingLabels;
  /** screen = token CSS · print = colori fissi per l'esportazione */
  palette: "screen" | "print";
  /** URL del logo nel cartiglio (solo a schermo: nel PDF il logo lo disegna pdf-lib) */
  logoHref?: string;
  date?: string;
  /** titolo accessibile */
  title?: string;
};

export const DRAWING_SIZE = { w: 1000, h: 707 } as const;
/** Area del logo nel cartiglio, in coordinate del disegno (la usa anche il PDF). */
export const LOGO_BOX = { x: 612, y: 566, w: 150, h: 55 } as const;

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

type Pal = { ink: string; muted: string; line: string; fill: string; accent: string; paper: string };

const SCREEN: Pal = {
  ink: "var(--c-fg)",
  muted: "var(--c-muted)",
  line: "var(--c-line-strong)",
  fill: "var(--c-surface-2)",
  accent: "var(--c-accent)",
  paper: "var(--c-surface)",
};

export function drawingSvg(input: DrawingInput): string {
  const P: Pal = input.palette === "print" ? PRINT : SCREEN;
  const { w: W, h: H } = DRAWING_SIZE;
  const L = input.labels;
  const loc = input.locale;
  const font = input.palette === "print" ? ` font-family="Helvetica, Arial, sans-serif"` : "";
  const dim = DIM_BY_WR.get(input.wr);
  const size = SIZE_BY_WR.get(input.wr);
  const known = Boolean(dim && dim.A && dim.B && dim.C && dim.D);
  const generic = input.generic || !known;
  // Proporzioni: dalla tabella, altrimenti stimate dalla guida interna standard (solo per la forma)
  const A = dim?.A ?? (size ? size.a * 1.22 : 28);
  const B = dim?.B ?? (size ? size.b * 1.36 : 14);
  const C = dim?.C ?? A * 0.86;
  const D = dim?.D ?? B * 0.68;
  const r = dim?.r ?? 3;
  const R = dim?.R ?? 5;
  const v = (x: number | null | undefined) => (x == null ? "—" : num(x, loc, 0, 2));
  const out: string[] = [];
  const t = (x: number, y: number, text: string, o: { size?: number; anchor?: "start" | "middle" | "end"; color?: string; weight?: number; rotate?: number } = {}) =>
    out.push(
      `<text x="${x}" y="${y}" font-size="${o.size ?? 14}" fill="${o.color ?? P.ink}" text-anchor="${o.anchor ?? "start"}"${o.weight ? ` font-weight="${o.weight}"` : ""}${o.rotate ? ` transform="rotate(${o.rotate} ${x} ${y})"` : ""}>${esc(text)}</text>`,
    );
  const line = (x1: number, y1: number, x2: number, y2: number, color = P.ink, width = 1.4, dash?: string) =>
    out.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${width}"${dash ? ` stroke-dasharray="${dash}"` : ""}/>`);
  const arrowH = (x1: number, x2: number, y: number) => {
    line(x1, y, x2, y, P.muted, 1);
    out.push(`<path d="M${x1 + 9} ${y - 4} L${x1} ${y} L${x1 + 9} ${y + 4} M${x2 - 9} ${y - 4} L${x2} ${y} L${x2 - 9} ${y + 4}" fill="none" stroke="${P.muted}" stroke-width="1"/>`);
  };
  const arrowV = (y1: number, y2: number, x: number) => {
    line(x, y1, x, y2, P.muted, 1);
    out.push(`<path d="M${x - 4} ${y1 + 9} L${x} ${y1} L${x + 4} ${y1 + 9} M${x - 4} ${y2 - 9} L${x} ${y2} L${x + 4} ${y2 - 9}" fill="none" stroke="${P.muted}" stroke-width="1"/>`);
  };

  // cornice
  out.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="${P.paper}"/>`);
  out.push(`<rect x="14" y="14" width="${W - 28}" height="${H - 28}" fill="none" stroke="${P.ink}" stroke-width="1.6"/>`);

  /* ------------------------------------------------ vista laterale (non in scala) */
  t(40, 58, L.side.toUpperCase(), { size: 13, color: P.muted, weight: 600 });
  const cy = 215;
  const fh = 150; // altezza flangia
  const ft = 16; // spessore flangia
  const bh = Math.min(104, Math.max(70, (fh / 1.7) * (B > A ? 1.1 : 1))); // corpo
  const amp = Math.max(3.5, Math.min(9, (bh / 2) * ((A - C) / A) * 0.9));
  const xL = 84, xR = 916, x1 = xL + ft, x2 = xR - ft;
  const gap1 = 478, gap2 = 522;
  // corpo ondulato su due tratti, interrotto al centro
  const wave = (from: number, to: number, y: number, dir: 1 | -1) => {
    let d = `M${from} ${y}`;
    const step = 9;
    for (let x = from; x < to - 0.1; x += step) {
      const xe = Math.min(to, x + step);
      d += ` Q${(x + xe) / 2} ${y - dir * amp * 2} ${xe} ${y}`;
    }
    return d;
  };
  for (const [a, b] of [[x1, gap1], [gap2, x2]] as const) {
    out.push(`<rect x="${a}" y="${cy - bh / 2}" width="${b - a}" height="${bh}" fill="${P.fill}"/>`);
    out.push(`<path d="${wave(a, b, cy - bh / 2, 1)}" fill="none" stroke="${P.ink}" stroke-width="1.5"/>`);
    out.push(`<path d="${wave(a, b, cy + bh / 2, -1)}" fill="none" stroke="${P.ink}" stroke-width="1.5"/>`);
    line(a, cy - bh / 2 + amp * 2 + 4, b, cy - bh / 2 + amp * 2 + 4, P.line, 1, "5 4");
    line(a, cy + bh / 2 - amp * 2 - 4, b, cy + bh / 2 - amp * 2 - 4, P.line, 1, "5 4");
  }
  // simbolo di interruzione
  for (const gx of [gap1, gap2]) {
    out.push(`<path d="M${gx} ${cy - bh / 2 - 12} l-6 ${bh / 4 + 6} l12 ${bh / 4} l-12 ${bh / 4} l6 ${bh / 4 + 6}" fill="none" stroke="${P.ink}" stroke-width="1.2"/>`);
  }
  // asse
  line(56, cy, 944, cy, P.line, 0.9, "18 4 3 4");
  // flange (tratteggio a 45°)
  for (const fx of [xL, x2]) {
    out.push(`<rect x="${fx}" y="${cy - fh / 2}" width="${ft}" height="${fh}" fill="${P.fill}" stroke="${P.accent}" stroke-width="1.8"/>`);
    for (let k = -fh; k < fh; k += 9) {
      const ya = cy - fh / 2 + k;
      out.push(`<line x1="${fx}" y1="${Math.max(cy - fh / 2, ya)}" x2="${fx + ft}" y2="${Math.max(cy - fh / 2, Math.min(cy + fh / 2, ya + ft))}" stroke="${P.accent}" stroke-width="0.7" opacity="0.6"/>`);
    }
    line(fx, cy - fh / 2 + 18, fx + ft, cy - fh / 2 + 18, P.line, 1, "4 3");
    line(fx, cy + fh / 2 - 18, fx + ft, cy + fh / 2 - 18, P.line, 1, "4 3");
  }
  if (input.twist) {
    out.push(`<path d="M478 ${cy - bh / 2 - 22} A 26 9 0 1 1 522 ${cy - bh / 2 - 22}" fill="none" stroke="${P.accent}" stroke-width="1.6"/>`);
    out.push(`<path d="M516 ${cy - bh / 2 - 28} L522 ${cy - bh / 2 - 22} L514 ${cy - bh / 2 - 18}" fill="none" stroke="${P.accent}" stroke-width="1.6"/>`);
  }
  // quota L
  line(xL, cy - fh / 2 - 6, xL, 90, P.muted, 0.8);
  line(xR, cy - fh / 2 - 6, xR, 90, P.muted, 0.8);
  arrowH(xL, xR, 100);
  const lText = !input.generic && input.lengthMm ? `L = ${num(input.lengthMm, loc, 0, 0)} mm` : "L";
  t(500, 92, lText, { anchor: "middle", size: 16, weight: 600 });
  // quota del corpo (A, lato largo)
  line(x2 - 30, cy - bh / 2, 962, cy - bh / 2, P.muted, 0.6);
  line(x2 - 30, cy + bh / 2, 962, cy + bh / 2, P.muted, 0.6);
  arrowV(cy - bh / 2, cy + bh / 2, 955);
  t(976, cy, generic ? "A" : `A = ${v(dim?.A)}`, { anchor: "middle", rotate: -90, size: 13 });
  // flange: etichette
  const fA = input.generic ? "A" : input.flangeA ? `A · ${input.flangeA}` : "A";
  const fB = input.generic ? "B" : input.flangeB ? `B · ${input.flangeB}` : "B";
  t(xL + ft / 2, cy + fh / 2 + 26, fA, { anchor: "start", size: 13, color: P.muted });
  t(xR - ft / 2, cy + fh / 2 + 26, fB, { anchor: "end", size: 13, color: P.muted });
  if (!generic && dim?.P) t(560, cy - bh / 2 - 10, `P = ${v(dim.P)}`, { size: 12, color: P.muted });

  /* ------------------------------------------------ sezione (in scala) */
  t(40, 360, L.section.toUpperCase(), { size: 13, color: P.muted, weight: 600 });
  const scx = 290, scy = 512;
  const s = Math.min(300 / A, 170 / B);
  const ow = A * s, oh = B * s, iw = C * s, ih = D * s;
  out.push(`<rect x="${scx - ow / 2}" y="${scy - oh / 2}" width="${ow}" height="${oh}" rx="${Math.min(R * s, oh / 2)}" fill="${P.fill}" stroke="${P.ink}" stroke-width="1.8"/>`);
  out.push(`<rect x="${scx - iw / 2}" y="${scy - ih / 2}" width="${iw}" height="${ih}" rx="${Math.min(r * s, ih / 2)}" fill="${P.paper}" stroke="${P.accent}" stroke-width="1.4" stroke-dasharray="6 4"/>`);
  line(scx - ow / 2 - 24, scy, scx + ow / 2 + 24, scy, P.line, 0.8, "14 4 3 4");
  line(scx, scy - oh / 2 - 24, scx, scy + oh / 2 + 24, P.line, 0.8, "14 4 3 4");
  // A sotto, C sopra, B a destra, D a sinistra
  const yA = scy + oh / 2 + 34;
  line(scx - ow / 2, scy + oh / 2 + 4, scx - ow / 2, yA + 6, P.muted, 0.6);
  line(scx + ow / 2, scy + oh / 2 + 4, scx + ow / 2, yA + 6, P.muted, 0.6);
  arrowH(scx - ow / 2, scx + ow / 2, yA);
  t(scx, yA + 20, generic ? "A" : `A = ${v(dim?.A)}`, { anchor: "middle", size: 13 });
  const yC = scy - oh / 2 - 26;
  line(scx - iw / 2, scy - ih / 2, scx - iw / 2, yC - 6, P.muted, 0.6);
  line(scx + iw / 2, scy - ih / 2, scx + iw / 2, yC - 6, P.muted, 0.6);
  arrowH(scx - iw / 2, scx + iw / 2, yC);
  t(scx, yC - 8, generic ? "C" : `C = ${v(dim?.C)}`, { anchor: "middle", size: 13, color: P.accent });
  const xB = scx + ow / 2 + 30;
  line(scx + ow / 2 + 4, scy - oh / 2, xB + 6, scy - oh / 2, P.muted, 0.6);
  line(scx + ow / 2 + 4, scy + oh / 2, xB + 6, scy + oh / 2, P.muted, 0.6);
  arrowV(scy - oh / 2, scy + oh / 2, xB);
  t(xB + 12, scy + 5, generic ? "B" : `B = ${v(dim?.B)}`, { size: 13 });
  const xD = scx - ow / 2 - 30;
  line(scx - iw / 2, scy - ih / 2, xD - 6, scy - ih / 2, P.muted, 0.6);
  line(scx - iw / 2, scy + ih / 2, xD - 6, scy + ih / 2, P.muted, 0.6);
  arrowV(scy - ih / 2, scy + ih / 2, xD);
  t(xD - 10, scy + 5, generic ? "D" : `D = ${v(dim?.D)}`, { anchor: "end", size: 13, color: P.accent });
  const radii = generic ? "r, R · P" : `r = ${v(dim?.r)} · R = ${v(dim?.R)} · P = ${v(dim?.P)} · ± ${v(dim?.tol)}`;
  t(scx, 684, input.generic || known ? `${radii}   (mm)` : L.dimsUnknown, { anchor: "middle", size: 12, color: P.muted });

  /* ------------------------------------------------ cartiglio */
  const bx = 600, by = 556, bw = 386, bh2 = 137;
  out.push(`<rect x="${bx}" y="${by}" width="${bw}" height="${bh2}" fill="${P.paper}" stroke="${P.ink}" stroke-width="1.4"/>`);
  line(bx, by + 72, bx + bw, by + 72, P.ink, 1);
  line(bx, by + 104, bx + bw, by + 104, P.ink, 1);
  line(bx + 170, by, bx + 170, by + 72, P.ink, 1);
  line(bx + 150, by + 72, bx + 150, by + 104, P.ink, 1);
  line(bx + 270, by + 72, bx + 270, by + 104, P.ink, 1);
  if (input.logoHref) {
    out.push(`<image href="${esc(input.logoHref)}" x="${LOGO_BOX.x}" y="${LOGO_BOX.y}" width="${LOGO_BOX.w}" height="${LOGO_BOX.h}" preserveAspectRatio="xMidYMid meet"/>`);
  }
  t(bx + 182, by + 22, L.titleBlock, { size: 11, color: P.muted });
  // codice su una o due righe (lo spazio del cartiglio è di circa 24 caratteri)
  const code = input.code ?? input.wr;
  const lines: string[] = [];
  for (const part of code.split(" · ")) {
    const last = lines[lines.length - 1];
    if (last && `${last} · ${part}`.length <= 24) lines[lines.length - 1] = `${last} · ${part}`;
    else lines.push(part);
  }
  const shown = lines.length > 2 ? [lines[0], lines.slice(1).join(" · ")] : lines;
  shown.forEach((l, i) => t(bx + 182, by + (shown.length === 1 ? 52 : 44 + i * 19), l, { size: shown.length === 1 ? 16 : 14, weight: 700 }));
  t(bx + 10, by + 85, L.material.toUpperCase(), { size: 9, color: P.muted });
  t(bx + 10, by + 98, `OT 80 · ${MATERIAL.replace("OT 80 ", "")}`, { size: 11 });
  t(bx + 160, by + 85, L.date.toUpperCase(), { size: 9, color: P.muted });
  t(bx + 160, by + 98, input.date ?? "", { size: 11 });
  t(bx + 280, by + 98, L.scale, { size: 11 });
  t(bx + 10, by + 124, L.note, { size: 10.5, color: P.accent, weight: 600 });

  const title = input.title ? `<title>${esc(input.title)}</title>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"${font}>${title}${out.join("")}</svg>`;
}

/** Data del cartiglio nel formato della lingua (8/10/2026 · 08/10/2026). */
export function drawingDate(locale: string, d = new Date()): string {
  return new Intl.DateTimeFormat(locale === "it" ? "it-IT" : "en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
}
