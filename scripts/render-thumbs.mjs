#!/usr/bin/env node
/**
 * Miniature statiche dei modelli 3D per /shop (riquadri dei tipi e prodotti pronti)
 * → public/render/<chiave>.webp (640 × 400, sfondo trasparente).
 * Usa lo stesso motore 3D del sito (lib/part3d.ts) dentro Chromium: serve il sito avviato.
 * Uso: npm run build && npx next start --port 3211, poi  BASE=http://localhost:3211 npm run render:thumbs
 */
import { chromium } from "playwright";
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE ?? "http://localhost:3211";
const OUT = join(process.cwd(), "public", "render");
const JOBS = [
  ["twistable", "twistable"],
  ["seamless", "seamless"],
  ["bend-E", "bend", "E"],
  ["bend-H", "bend", "H"],
  ["twist", "twist"],
  ["offset", "offset"],
];

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(`${BASE}/shop?render=thumbs`, { waitUntil: "networkidle" });
await page.waitForFunction(() => typeof window.__tlThumb === "function", null, { timeout: 30000 });
for (const [key, type, plane] of JOBS) {
  const url = await page.evaluate(([t, p]) => window.__tlThumb(t, p), [type, plane]);
  const png = Buffer.from(url.split(",")[1], "base64");
  const webp = await sharp(png).trim({ threshold: 1 }).resize(640, 400, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ quality: 82 }).toBuffer();
  writeFileSync(join(OUT, `${key}.webp`), webp);
  console.log(`render/${key}.webp  ${(webp.length / 1024).toFixed(1)} kB`);
}
await browser.close();
if (errors.length) {
  console.error("Errori nella pagina:", errors);
  process.exit(1);
}
