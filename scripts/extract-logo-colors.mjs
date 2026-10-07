#!/usr/bin/env node
/**
 * Estrae i colori reali di public/brand/logo.png.
 * Legge i pixel con sharp, scarta trasparenti e quasi-bianchi, raggruppa con k-means (k = 8)
 * e stampa i cluster ordinati per peso, con esadecimale, HSL e quota di pixel.
 * Uso: node scripts/extract-logo-colors.mjs
 */
import sharp from "sharp";

const { data, info } = await sharp("public/brand/logo.png").ensureAlpha().raw().toBuffer({ resolveWithObject: true });

const pixels = [];
for (let i = 0; i < data.length; i += info.channels) {
  const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
  if (a < 200) continue; // trasparente
  if (r > 235 && g > 235 && b > 235) continue; // sfondo bianco
  pixels.push([r, g, b]);
}

// k-means deterministico: centri iniziali presi a passo fisso sui pixel ordinati per luminanza
const K = 8;
const sorted = [...pixels].sort((p, q) => p[0] + p[1] + p[2] - (q[0] + q[1] + q[2]));
let centers = Array.from({ length: K }, (_, i) => [...sorted[Math.floor(((i + 0.5) / K) * sorted.length)]]);
let assign = new Array(pixels.length).fill(0);
for (let iter = 0; iter < 30; iter++) {
  const sums = Array.from({ length: K }, () => [0, 0, 0, 0]);
  pixels.forEach((p, idx) => {
    let best = 0;
    let bestD = Infinity;
    centers.forEach((c, k) => {
      const d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2;
      if (d < bestD) {
        bestD = d;
        best = k;
      }
    });
    assign[idx] = best;
    sums[best][0] += p[0];
    sums[best][1] += p[1];
    sums[best][2] += p[2];
    sums[best][3]++;
  });
  centers = sums.map((s, k) => (s[3] ? [s[0] / s[3], s[1] / s[3], s[2] / s[3]] : centers[k]));
}

const counts = new Array(K).fill(0);
assign.forEach((k) => counts[k]++);

const hex = (c) => "#" + c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
function hsl([r, g, b]) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
  }
  return `hsl(${Math.round((h * 60 + 360) % 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%)`;
}

console.log(`Pixel utili: ${pixels.length} su ${info.width * info.height}\n`);
centers
  .map((c, k) => ({ c, n: counts[k] }))
  .filter((x) => x.n > 0)
  .sort((a, b) => b.n - a.n)
  .forEach(({ c, n }) => console.log(`${hex(c)}  ${hsl(c).padEnd(20)} ${((n / pixels.length) * 100).toFixed(1).padStart(5)}%`));
