/**
 * PDF generati nel browser con pdf-lib (caricato solo quando serve, import dinamico):
 *  - disegno del pezzo configurato: l'SVG di lib/drawing.ts rasterizzato ad alta risoluzione,
 *    più il logo vero nel cartiglio;
 *  - scheda tecnica della famiglia: tabelle vettoriali dai dati di src/data/waveguides.ts.
 * Nessun servizio esterno.
 */
import { DRAWING_SIZE, LOGO_BOX } from "./drawing";
import { DIM_TABLE, MATERIAL, SEAMLESS_TABLE, SIZE_BY_WR, TWIST_TABLE, isOnRequest, num, range } from "@/data/waveguides";
import { PRINT } from "@/data/brand";

async function logoBytes(): Promise<Uint8Array | null> {
  try {
    const res = await fetch("/brand/logo.png");
    return res.ok ? new Uint8Array(await res.arrayBuffer()) : null;
  } catch {
    return null;
  }
}

async function svgToPng(svg: string, scale = 3): Promise<Uint8Array> {
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = DRAWING_SIZE.w * scale;
    canvas.height = DRAWING_SIZE.h * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas 2D non disponibile");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
    if (!blob) throw new Error("PNG non generato");
    return new Uint8Array(await blob.arrayBuffer());
  } finally {
    URL.revokeObjectURL(url);
  }
}

function hex(color: string) {
  const n = parseInt(color.slice(1), 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
}

/** Disegno del pezzo in PDF A4 orizzontale. `svg` = drawingSvg(... palette: "print", senza logoHref). */
export async function drawingPdf(svg: string, meta: { code: string; title: string }, scale = 3): Promise<Uint8Array> {
  const { PDFDocument } = await import("pdf-lib");
  const doc = await PDFDocument.create();
  doc.setTitle(meta.title);
  doc.setAuthor("Tecnolambro Microwave Components");
  doc.setSubject(meta.code);
  doc.setCreator("tecnolambro.com");
  const page = doc.addPage([842, 595]);
  const png = await doc.embedPng(await svgToPng(svg, scale));
  const margin = 18;
  const w = 842 - margin * 2;
  const h = (w * DRAWING_SIZE.h) / DRAWING_SIZE.w;
  const y0 = (595 - h) / 2;
  page.drawImage(png, { x: margin, y: y0, width: w, height: h });
  const logo = await logoBytes();
  if (logo) {
    const img = await doc.embedPng(logo);
    const k = w / DRAWING_SIZE.w;
    const box = { w: LOGO_BOX.w * k, h: LOGO_BOX.h * k };
    const fit = Math.min(box.w / img.width, box.h / img.height);
    const iw = img.width * fit;
    const ih = img.height * fit;
    page.drawImage(img, {
      x: margin + LOGO_BOX.x * k + (box.w - iw) / 2,
      y: y0 + h - (LOGO_BOX.y + LOGO_BOX.h) * k + (box.h - ih) / 2,
      width: iw,
      height: ih,
    });
  }
  return doc.save();
}

export type DatasheetTexts = {
  familyName: string;
  sheetTitle: string;
  date: string;
  /** intestazioni */
  size: string;
  freq: string;
  rl: string;
  att: string;
  cw: string;
  peak: string;
  vswr600: string;
  onRequest: string;
  code: string;
  tol: string;
  vswrMax: string;
  dimsTitle: string;
  material: string;
  notes: string[];
  footer: string;
};

/** Scheda tecnica della famiglia (twistabile o seamless): tabella elettrica + dimensioni TLFX. */
export async function datasheetPdf(kind: "twist" | "seamless", locale: string, tx: DatasheetTexts): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const doc = await PDFDocument.create();
  doc.setTitle(`${tx.familyName} – ${tx.sheetTitle}`);
  doc.setAuthor("Tecnolambro Microwave Components");
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const ink = hex(PRINT.ink), muted = hex(PRINT.muted), accent = hex(PRINT.accent), fill = hex(PRINT.fill), line = hex(PRINT.line);
  const col = (c: { r: number; g: number; b: number }) => rgb(c.r, c.g, c.b);
  const page = doc.addPage([595, 842]);
  const M = 40;
  let y = 842 - M;

  const logo = await logoBytes();
  if (logo) {
    const img = await doc.embedPng(logo);
    const w = 150;
    const h = (img.height / img.width) * w;
    page.drawImage(img, { x: M, y: y - h, width: w, height: h });
  }
  page.drawText(tx.sheetTitle.toUpperCase(), { x: 595 - M - bold.widthOfTextAtSize(tx.sheetTitle.toUpperCase(), 9), y: y - 10, size: 9, font: bold, color: col(muted) });
  page.drawText(tx.date, { x: 595 - M - font.widthOfTextAtSize(tx.date, 9), y: y - 24, size: 9, font, color: col(muted) });
  y -= 80;
  page.drawText(tx.familyName, { x: M, y, size: 20, font: bold, color: col(ink) });
  y -= 18;
  page.drawText(tx.material, { x: M, y, size: 9.5, font, color: col(muted) });
  y -= 24;

  type Column = { head: string; w: number; align?: "left" | "right" };
  const table = (columns: Column[], rows: string[][], highlightRows?: Set<number>) => {
    const rowH = 17;
    let x = M;
    page.drawRectangle({ x: M, y: y - rowH + 4, width: 595 - 2 * M, height: rowH + 6, color: col(fill) });
    for (const c of columns) {
      const lines = c.head.split("\n");
      lines.forEach((l, i) => {
        const tw = bold.widthOfTextAtSize(l, 7.5);
        page.drawText(l, { x: c.align === "left" ? x + 4 : x + c.w - tw - 4, y: y + 3 - i * 9, size: 7.5, font: bold, color: col(ink) });
      });
      x += c.w;
    }
    y -= rowH + 10;
    rows.forEach((r, ri) => {
      if (ri % 2 === 1) page.drawRectangle({ x: M, y: y - 5, width: 595 - 2 * M, height: rowH, color: col(fill), opacity: 0.45 });
      let cx = M;
      r.forEach((cell, ci) => {
        const c = columns[ci];
        const f = ci === 0 ? bold : font;
        const tw = f.widthOfTextAtSize(cell, 8.5);
        const color = highlightRows?.has(ri) && ci > 0 ? muted : ink;
        page.drawText(cell, { x: c.align === "left" ? cx + 4 : cx + c.w - tw - 4, y, size: 8.5, font: f, color: col(color) });
        cx += c.w;
      });
      y -= rowH;
    });
    page.drawLine({ start: { x: M, y: y + rowH - 6 }, end: { x: 595 - M, y: y + rowH - 6 }, thickness: 0.6, color: col(line) });
  };

  const sizeCell = (wr: string) => {
    const s = SIZE_BY_WR.get(wr)!;
    return `${s.wr} · ${s.iec} · ${s.wg}`;
  };
  const freqCell = (wr: string) => {
    const s = SIZE_BY_WR.get(wr)!;
    return range(s.min, s.max, locale);
  };
  const n = (v: number | null, d: number) => (v == null ? "—" : num(v, locale, d, d));

  if (kind === "twist") {
    table(
      [
        { head: tx.size, w: 118, align: "left" },
        { head: tx.freq, w: 72 },
        { head: `${tx.rl}\n300 mm`, w: 52 },
        { head: "\n600 mm", w: 46 },
        { head: "\n1000 mm", w: 50 },
        { head: tx.att, w: 64 },
        { head: tx.cw, w: 54 },
        { head: tx.peak, w: 59 },
      ],
      TWIST_TABLE.map((r) => [sizeCell(r.wr), freqCell(r.wr), n(r.rl300, 1), n(r.rl600, 1), n(r.rl1000, 1), n(r.att, 2), n(r.cw, 0), n(r.peak, 0)]),
    );
  } else {
    const onReq = new Set<number>();
    table(
      [
        { head: tx.size, w: 130, align: "left" },
        { head: tx.freq, w: 85 },
        { head: tx.vswr600, w: 75 },
        { head: tx.att, w: 80 },
        { head: tx.cw, w: 70 },
        { head: tx.peak, w: 75 },
      ],
      SEAMLESS_TABLE.map((r, i) => {
        if (isOnRequest(r)) {
          onReq.add(i);
          return [sizeCell(r.wr), freqCell(r.wr), tx.onRequest, "", "", ""];
        }
        return [sizeCell(r.wr), freqCell(r.wr), n(r.vswr600, 2), n(r.att, 2), n(r.cw, 0), n(r.peak, 0)];
      }),
      onReq,
    );
  }

  y -= 30;
  page.drawText(tx.dimsTitle, { x: M, y, size: 12, font: bold, color: col(ink) });
  y -= 22;
  const d = (v: number | null) => (v == null ? "—" : num(v, locale, 0, 2));
  table(
    [
      { head: tx.code, w: 62, align: "left" },
      { head: "A", w: 32 },
      { head: "B", w: 32 },
      { head: "C", w: 32 },
      { head: "D", w: 32 },
      { head: "P", w: 28 },
      { head: "r", w: 28 },
      { head: "R", w: 28 },
      { head: tx.tol, w: 52 },
      { head: tx.freq, w: 62 },
      { head: tx.att, w: 52 },
      { head: tx.vswrMax, w: 35 },
    ],
    DIM_TABLE.map((r) => [
      `${r.code}${r.notes?.code ? "*" : ""}`,
      d(r.A), d(r.B), d(r.C), d(r.D), d(r.P), d(r.r), d(r.R),
      `± ${num(r.tol, locale, 2, 2)}`,
      range(r.min, r.max, locale),
      `${num(r.att, locale, 2, 2)}${r.notes?.att ? "**" : ""}`,
      `${num(r.vswr, locale, 2, 2)}${r.notes?.vswr ? "***" : ""}`,
    ]),
  );
  y -= 14;
  for (const note of tx.notes) {
    page.drawText(note, { x: M, y, size: 8, font, color: col(muted) });
    y -= 12;
  }
  page.drawText(tx.footer, { x: M, y: M - 10, size: 8, font, color: col(accent) });
  return doc.save();
}

export function downloadBytes(bytes: Uint8Array | ArrayBuffer, filename: string, mime: string): void {
  const blob = new Blob([bytes as BlobPart], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export { MATERIAL };
