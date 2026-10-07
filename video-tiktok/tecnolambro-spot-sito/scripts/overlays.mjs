/**
 * Livelli di testo (PNG trasparenti 1080x1920) disegnati in HTML con Playwright.
 * Grottesco bold = Archivo, il carattere del sito (src/app/fonts/archivo-var-latin.woff2);
 * una parola chiave per frase in serif corsivo (Instrument Serif Italic, OFL) nel blu chiaro del sito.
 * Safe zone TikTok: niente nei primi 150 px, negli ultimi 380 px e negli ultimi 140 px a destra.
 * Uso: node scripts/overlays.mjs  -> overlays/<id>.png
 */
import { chromium } from "playwright";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CFG = JSON.parse(readFileSync(join(ROOT, "config.json"), "utf8"));
const b64 = (p) => readFileSync(p).toString("base64");
const W = 1080, H = 1920, X = 84, RIGHT = 140, TOP = 150, BOTTOM = 380;

const CSS = `
@font-face { font-family: Display; font-weight: 300 800; src: url(data:font/woff2;base64,${b64(join(ROOT, "..", "..", "src", "app", "fonts", "archivo-var-latin.woff2"))}) format("woff2"); }
@font-face { font-family: Serif; font-style: italic; src: url(data:font/ttf;base64,${b64(join(ROOT, "3d", "assets", "InstrumentSerif-Italic.ttf"))}); }
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: ${W}px; height: ${H}px; background: transparent; overflow: hidden; }
body { position: relative; color: ${CFG.palette.text}; -webkit-font-smoothing: antialiased; }
.blk { position: absolute; left: ${X}px; width: ${W - X - RIGHT}px; text-shadow: 0 2px 28px rgba(0,0,0,.65), 0 1px 3px rgba(0,0,0,.5); }
.d { font-family: Display; font-weight: 800; letter-spacing: -0.02em; line-height: 0.98; }
.k { font-family: Serif; font-style: italic; font-weight: 400; letter-spacing: 0; color: ${CFG.palette.keyword}; font-size: 1.16em; line-height: 1; padding-bottom: 0.06em; }
.small { font-family: Display; font-weight: 500; letter-spacing: 0.01em; }
`;

// posizione verticale: "title" = fascia 25-35% dell'altezza; "top"/"low" quando sotto c'è uno schermo
function place(pos, html, size = 96) {
  const y = { title: Math.round(H * 0.25), top: TOP + 70, low: H - BOTTOM - 150 }[pos];
  return `<div class="blk d" style="top:${y}px; font-size:${size}px">${html}</div>`;
}

const k = (s) => `<span class="k">${s}</span>`;
const TEXTS = Object.fromEntries(
  CFG.texts.map((t) => [t.id, t.id === "pack"
    ? `<div class="blk" style="top:${Math.round(H * 0.25)}px; text-align:center; left:${X}px">
         <div class="d" style="font-size:92px">${t.lines[0].replace(/\*(.+?)\*/g, (_, s) => k(s))}</div>
         <div class="small" style="font-size:46px; margin-top:22px; opacity:.9">${t.lines[1]}</div></div>`
    : place(t.pos, t.lines.map((l) => l.replace(/\*(.+?)\*/g, (_, s) => k(s))).join("<br>"), t.size ?? 96)]),
);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H } });
const out = join(ROOT, "overlays");
mkdirSync(out, { recursive: true });
for (const [id, html] of Object.entries(TEXTS)) {
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>${html}</body></html>`);
  await page.evaluate(() => document.fonts.ready);
  // controllo safe zone
  const r = await page.evaluate(() => { const b = document.querySelector(".blk"); const rr = b.getBoundingClientRect(); return [rr.top, rr.bottom, rr.right, b.scrollWidth > b.clientWidth]; });
  const ok = r[0] >= TOP && r[1] <= H - BOTTOM && r[2] <= W - RIGHT + 1 && !r[3];
  await page.screenshot({ path: join(out, `${id}.png`), omitBackground: true });
  console.log(`${ok ? "ok " : "FUORI SAFE ZONE"} ${id}: y ${Math.round(r[0])}-${Math.round(r[1])}`);
}
await browser.close();
