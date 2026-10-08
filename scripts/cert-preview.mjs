#!/usr/bin/env node
/**
 * Miniature WebP della prima pagina degli attestati in public/certificazioni/*.pdf
 * → public/certificazioni/anteprime/<nome>.webp (larghezza 840 px).
 * pdf.js (pdfjs-dist) disegna la pagina in Chromium (Playwright), sharp converte in WebP.
 * Uso: npm run cert:preview   (rilanciarlo ogni volta che si aggiunge o cambia un attestato)
 */
import { chromium } from "playwright";
import sharp from "sharp";
import http from "node:http";
import { createReadStream, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";

const ROOT = process.cwd();
const DIR = join(ROOT, "public", "certificazioni");
const OUT = join(DIR, "anteprime");
const WIDTH = 840;

if (!existsSync(DIR)) {
  console.log("Nessuna cartella public/certificazioni: niente da fare.");
  process.exit(0);
}
const pdfs = readdirSync(DIR).filter((f) => f.toLowerCase().endsWith(".pdf"));
if (!pdfs.length) {
  console.log("Nessun PDF in public/certificazioni.");
  process.exit(0);
}
mkdirSync(OUT, { recursive: true });

// server locale minimo: pdf.js da node_modules e i PDF da public/
const TYPES = { ".mjs": "text/javascript", ".js": "text/javascript", ".pdf": "application/pdf", ".html": "text/html" };
const srv = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  const file = url.startsWith("/pdfjs/") ? resolve(ROOT, "node_modules/pdfjs-dist", url.slice(7)) : resolve(DIR, url.slice(1));
  if ((!file.startsWith(resolve(ROOT, "node_modules/pdfjs-dist")) && !file.startsWith(DIR)) || !existsSync(file) || statSync(file).isDirectory()) {
    res.writeHead(404);
    return res.end();
  }
  res.writeHead(200, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream" });
  createReadStream(file).pipe(res);
});
await new Promise((r) => srv.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${srv.address().port}`;

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`${base}/`).catch(() => {});
for (const pdf of pdfs) {
  const data = await page.evaluate(
    async ({ base, pdf, width }) => {
      const pdfjs = await import(`${base}/pdfjs/build/pdf.mjs`);
      pdfjs.GlobalWorkerOptions.workerSrc = `${base}/pdfjs/build/pdf.worker.mjs`;
      const doc = await pdfjs.getDocument({ url: `${base}/${encodeURIComponent(pdf)}` }).promise;
      const first = await doc.getPage(1);
      const unscaled = first.getViewport({ scale: 1 });
      const viewport = first.getViewport({ scale: width / unscaled.width });
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await first.render({ canvasContext: ctx, canvas, viewport }).promise;
      return canvas.toDataURL("image/png");
    },
    { base, pdf, width: WIDTH },
  );
  const png = Buffer.from(data.split(",")[1], "base64");
  const name = pdf.replace(/\.pdf$/i, ".webp");
  writeFileSync(join(OUT, name), await sharp(png).webp({ quality: 82 }).toBuffer());
  console.log(`✓ ${pdf} → anteprime/${name}`);
}
await browser.close();
srv.close();
