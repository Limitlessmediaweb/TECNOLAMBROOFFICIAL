#!/usr/bin/env node
/**
 * Con NEXT_PUBLIC_DEMO=false nessuna pagina deve mostrare segnaposto: "DA COMPLETARE",
 * "[TO BE COMPLETED]", il badge "Versione demo", i badge gialli "manca: …", "Dati dimostrativi".
 * Visita in Chromium (testo visibile dopo l'idratazione) tutte le pagine IT/EN trovate seguendo
 * i link interni da / e /en, più le pagine fuori menu (richiesta, conferma).
 * Uso: build con NEXT_PUBLIC_DEMO=false, poi BASE=http://localhost:3211 npm run check:placeholders
 */
import { chromium } from "playwright";

const BASE = (process.env.BASE ?? "http://localhost:3211").replace(/\/$/, "");
const EXTRA = ["/shop/richiesta", "/shop/richiesta/inviata", "/en/shop/request", "/en/shop/request/sent", "/pagina-inesistente", "/en/missing-page"];
const PATTERNS = [/DA COMPLETARE/i, /TO BE COMPLETED/i, /Versione demo/i, /Demo version/i, /\bmanca:/i, /\bmissing:/i, /Dati dimostrativi/i, /Demo data/i, /\[DA /, /segnaposto/i, /placeholder/i];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const queue = ["/", "/en", ...EXTRA];
const seen = new Set();
const problems = [];

while (queue.length) {
  const path = queue.shift();
  if (seen.has(path)) continue;
  seen.add(path);
  const res = await page.goto(BASE + path, { waitUntil: "networkidle" }).catch(() => null);
  if (!res) continue;
  const text = await page.evaluate(() => document.body.innerText);
  const hits = PATTERNS.filter((re) => re.test(text)).map((re) => text.match(re)?.[0]);
  if (hits.length) problems.push({ path, hits });
  const links = await page.$$eval("a[href]", (as) => as.map((a) => a.getAttribute("href") ?? ""));
  for (const href of links) {
    if (!href.startsWith("/") || href.startsWith("//")) continue;
    const u = new URL(href, BASE);
    if (/\.(pdf|png|jpe?g|webp|svg|xml|txt|glb|stl)$/i.test(u.pathname) || u.pathname.startsWith("/api/")) continue;
    if (!seen.has(u.pathname)) queue.push(u.pathname);
  }
}
await browser.close();

console.log(`Pagine controllate: ${seen.size}`);
if (problems.length) {
  for (const p of problems) console.error(`✗ ${p.path}: ${p.hits.join(", ")}`);
  process.exit(1);
}
console.log("✓ Nessun segnaposto visibile");
