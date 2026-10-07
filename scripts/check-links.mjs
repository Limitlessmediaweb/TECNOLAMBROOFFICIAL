#!/usr/bin/env node
/**
 * Controlla che nessun link interno porti a una 404.
 * Parte da / e /en, segue tutti gli href interni (stessa origine), verifica lo status
 * di ogni pagina trovata e riporta le pagine che contengono link rotti.
 * Uso: BASE_URL=http://localhost:3000 npm run check:links
 */
const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const START = ["/", "/en", "/sitemap.xml", "/robots.txt"];

const seen = new Map(); // path -> status
const sources = new Map(); // path -> Set(pagine che lo linkano)
const queue = [...START];

function normalize(href, from) {
  if (!href || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("#") || href.startsWith("javascript:")) return null;
  let url;
  try {
    url = new URL(href, BASE + from);
  } catch {
    return null;
  }
  if (url.origin !== new URL(BASE).origin) return null;
  return url.pathname + url.search;
}

while (queue.length) {
  const path = queue.shift();
  if (seen.has(path)) continue;
  const res = await fetch(BASE + path, { redirect: "follow" });
  seen.set(path, res.status);
  const type = res.headers.get("content-type") ?? "";
  if (!type.includes("text/html")) continue;
  const html = await res.text();
  for (const m of html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)) {
    const target = normalize(m[1].replace(/&amp;/g, "&"), path);
    if (!target || target.startsWith("/_next")) continue;
    if (!sources.has(target)) sources.set(target, new Set());
    sources.get(target).add(path);
    if (!seen.has(target)) queue.push(target);
  }
}

const broken = [...seen].filter(([, status]) => status >= 400);
console.log(`Pagine controllate: ${seen.size}`);
if (broken.length) {
  for (const [path, status] of broken) console.error(`${status} ${path}  ← linkato da: ${[...(sources.get(path) ?? [])].slice(0, 5).join(", ")}`);
  process.exit(1);
}
console.log("check:links: ok, nessun link interno rotto.");
