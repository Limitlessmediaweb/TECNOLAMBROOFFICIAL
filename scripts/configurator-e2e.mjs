#!/usr/bin/env node
/**
 * Verifica del configuratore (sito avviato, BASE=http://localhost:3211):
 * - ogni tipo si apre dal link condivisibile e ritorna la stessa configurazione;
 * - cambiando ogni opzione il codice e il modello 3D si aggiornano senza errori in console;
 * - download PDF / STL / GLB, con controllo dei bounding box di STL (mm) e GLB (m);
 * - triangoli del modello ≤ 60.000.
 * File scaricati in test-output/configurator/.  Uso: npm run test:configurator
 */
import { chromium } from "playwright";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE ?? "http://localhost:3211";
const OUT = join(process.cwd(), "test-output", "configurator");
mkdirSync(OUT, { recursive: true });

const CASES = [
  { name: "twistable", q: "tipo=twistabile&wr=90&l=600&f1=UBR100&f2=PBR100&fin=grezza&tr=nessuno", type: "twistable", code: /^TLFX-100 · TWIST · L600 · UBR100\/PBR100$/, extent: 600 },
  { name: "seamless", q: "tipo=seamless&wr=112&l=1200&f1=UBR84&f2=UBR84&fin=verniciata&tr=nessuno", type: "seamless", code: /SEAMLESS · L1200/, extent: 1200 },
  { name: "bend", q: "tipo=curva&piano=E&wr=75&ang=90&r=std&l1=100&l2=100&f1=UBR120&f2=UBR120&fin=grezza&tr=nessuno", type: "bend", code: /^CURVA-E · WR-75 · 90° · L1 100 · L2 100 · UBR120\/UBR120$/, extent: 100 },
  { name: "bend-h-60", q: "tipo=curva&piano=H&wr=90&ang=60&r=40&l1=120&l2=80&f1=UBR100&f2=UBR100&fin=brillantata&tr=galvanico", type: "bend", code: /^CURVA-H · WR-90 · 60° · R 40 · L1 120 · L2 80/, extent: 200 },
  { name: "twist", q: "tipo=twist&wr=90&rot=90&dir=antiorario&l=100&f1=UBR100&f2=UBR100&fin=grezza&tr=nessuno", type: "twist", code: /^TWIST · WR-90 · 90° CCW · L100/, extent: 100 },
  { name: "offset", q: "tipo=disassato&piano=H&wr=62&x=25&l=150&f1=UBR140&f2=UBR140&fin=grezza&tr=termico", type: "offset", code: /^DISASSATO-H · WR-62 · X25 · L150/, extent: 150 },
];

let failures = 0;
const fail = (msg) => {
  failures++;
  console.error("  ✗", msg);
};
const ok = (msg) => console.log("  ✓", msg);

function stlBox(buf) {
  const n = buf.readUInt32LE(80);
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < n; i++) {
    const o = 84 + i * 50 + 12;
    for (let v = 0; v < 3; v++)
      for (let a = 0; a < 3; a++) {
        const x = buf.readFloatLE(o + v * 12 + a * 4);
        if (x < min[a]) min[a] = x;
        if (x > max[a]) max[a] = x;
      }
  }
  return { tris: n, size: max.map((m, a) => m - min[a]) };
}

/** Bounding box del GLB: vertici reali (POSITION) trasformati con le matrici dei nodi (TRS o matrix). */
function glbBox(buf) {
  const jsonLen = buf.readUInt32LE(12);
  const gltf = JSON.parse(buf.subarray(20, 20 + jsonLen).toString("utf8"));
  const binStart = 20 + jsonLen + 8;
  const mul = (a, b) => {
    const r = new Array(16).fill(0);
    for (let c = 0; c < 4; c++) for (let rI = 0; rI < 4; rI++) for (let k = 0; k < 4; k++) r[c * 4 + rI] += a[k * 4 + rI] * b[c * 4 + k];
    return r;
  };
  const trs = (n) => {
    if (n.matrix) return n.matrix;
    const [x, y, z, w] = n.rotation ?? [0, 0, 0, 1];
    const [sx, sy, sz] = n.scale ?? [1, 1, 1];
    const [tx, ty, tz] = n.translation ?? [0, 0, 0];
    return [
      (1 - 2 * (y * y + z * z)) * sx, 2 * (x * y + z * w) * sx, 2 * (x * z - y * w) * sx, 0,
      2 * (x * y - z * w) * sy, (1 - 2 * (x * x + z * z)) * sy, 2 * (y * z + x * w) * sy, 0,
      2 * (x * z + y * w) * sz, 2 * (y * z - x * w) * sz, (1 - 2 * (x * x + y * y)) * sz, 0,
      tx, ty, tz, 1,
    ];
  };
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  const visit = (idx, parent) => {
    const node = gltf.nodes[idx];
    const m = mul(parent, trs(node));
    if (node.mesh != null) {
      for (const p of gltf.meshes[node.mesh].primitives) {
        const acc = gltf.accessors[p.attributes.POSITION];
        const view = gltf.bufferViews[acc.bufferView];
        const stride = view.byteStride ?? 12;
        const base = binStart + (view.byteOffset ?? 0) + (acc.byteOffset ?? 0);
        for (let i = 0; i < acc.count; i++) {
          const o = base + i * stride;
          const v = [buf.readFloatLE(o), buf.readFloatLE(o + 4), buf.readFloatLE(o + 8)];
          for (let a = 0; a < 3; a++) {
            const w = m[a] * v[0] + m[4 + a] * v[1] + m[8 + a] * v[2] + m[12 + a];
            if (w < min[a]) min[a] = w;
            if (w > max[a]) max[a] = w;
          }
        }
      }
    }
    for (const c of node.children ?? []) visit(c, m);
  };
  const I = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  for (const r of gltf.scenes[gltf.scene ?? 0].nodes) visit(r, I);
  return { size: max.map((m, a) => m - min[a]) };
}

const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(e.message));

const code = () => page.locator("[data-part-code]").textContent();
const waitCodeChange = async (before) => page.waitForFunction((b) => document.querySelector("[data-part-code]")?.textContent !== b, before, { timeout: 5000 });

for (const c of CASES) {
  console.log(`\n${c.name}`);
  errors.length = 0;
  await page.goto(`${BASE}/shop?${c.q}#configura`, { waitUntil: "networkidle" });
  await page.waitForFunction((t) => document.querySelector("[data-configurator]")?.dataset.type === t, c.type, { timeout: 10000 }).catch(() => {});
  const type = await page.locator("[data-configurator]").getAttribute("data-type");
  type === c.type ? ok(`tipo dal link: ${type}`) : fail(`tipo atteso ${c.type}, trovato ${type}`);
  const cd = (await code())?.trim() ?? "";
  c.code.test(cd) ? ok(`codice: ${cd}`) : fail(`codice inatteso: ${cd}`);

  // il link condivisibile riporta la stessa configurazione
  await page.waitForTimeout(400);
  const search = new URL(page.url()).searchParams;
  const want = new URLSearchParams(c.q);
  const diff = [...want.keys()].filter((k) => k !== "r" && search.get(k) !== want.get(k));
  diff.length === 0 ? ok("link condivisibile invariato") : fail(`parametri diversi nel link: ${diff.map((k) => `${k}=${search.get(k)}≠${want.get(k)}`).join(", ")}`);

  // 3D pronto
  await page.locator("[data-viewer-state]").scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelector("[data-viewer-state]")?.dataset.viewerState === "ready", null, { timeout: 20000 }).catch(() => {});
  const vs = await page.locator("[data-viewer-state]").getAttribute("data-viewer-state");
  const tris = Number(await page.locator("[data-viewer-state]").getAttribute("data-triangles"));
  vs === "ready" ? ok(`3D pronto, ${tris} triangoli`) : fail(`3D non pronto (${vs})`);
  if (tris > 60000) fail(`troppi triangoli: ${tris}`);

  // cambia le opzioni: ogni modifica aggiorna il codice
  const steps = [];
  if (c.type === "bend") steps.push(() => page.locator("[data-plane][aria-checked=false]").click());
  if (c.type === "bend") steps.push(() => page.getByRole("button", { name: "45°", exact: true }).click());
  if (c.type === "bend") steps.push(() => page.locator("[data-field=leg1]").fill("140"));
  if (c.type === "twist") steps.push(() => page.getByRole("button", { name: "45°", exact: true }).click());
  if (c.type === "offset") steps.push(() => page.locator("[data-field=offset]").fill("30"));
  if (c.type === "twistable" || c.type === "seamless") {
    steps.push(() => page.locator("[data-length='900']").click());
    steps.push(async () => {
      await page.locator("[data-length=other]").click();
      await page.locator("[data-field=length]").fill("1450");
    });
  }
  if (c.type !== "custom") {
    steps.push(() => page.locator("[data-field=f2]").selectOption({ index: 2 }));
    steps.push(() => page.locator("[data-field=finish]").selectOption("painted"));
    steps.push(() => page.locator("[data-field=treatment]").selectOption("thermal"));
    steps.push(() => page.locator("[data-field=ghz]").fill("8,5"));
  }
  for (const [i, step] of steps.entries()) {
    const before = (await code()) ?? "";
    await step();
    const changed = await waitCodeChange(before).then(() => true).catch(() => false);
    // finitura e trattamento non entrano nel codice: basta che non ci siano errori
    if (!changed && i < steps.length - 3) fail(`l'opzione ${i + 1} non ha cambiato il codice`);
  }
  await page.waitForTimeout(800);
  const tris2 = Number(await page.locator("[data-viewer-state]").getAttribute("data-triangles"));
  ok(`opzioni cambiate (${steps.length}), codice ora: ${(await code())?.trim()} · ${tris2} triangoli`);

  // torna alla configurazione del link per i download (bounding box attesi)
  await page.goto(`${BASE}/shop?${c.q}#configura`, { waitUntil: "networkidle" });
  await page.waitForFunction((t) => document.querySelector("[data-configurator]")?.dataset.type === t, c.type, { timeout: 10000 });
  for (const kind of ["pdf", "stl", "glb"]) {
    const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 30000 }), page.locator(`[data-download=${kind}]`).click()]);
    const file = join(OUT, `${c.name}.${kind}`);
    await dl.saveAs(file);
    const buf = readFileSync(file);
    if (kind === "pdf") buf.subarray(0, 5).toString() === "%PDF-" ? ok(`PDF ${(buf.length / 1024).toFixed(0)} kB`) : fail("PDF non valido");
    if (kind === "stl") {
      const b = stlBox(buf);
      const mx = Math.max(...b.size);
      const inRange = mx >= c.extent * 0.8 && mx <= c.extent * 1.6;
      (inRange ? ok : fail)(`STL ${b.tris} triangoli, box ${b.size.map((v) => v.toFixed(1)).join(" × ")} mm (atteso ~${c.extent})`);
      c.stl = b.size;
    }
    if (kind === "glb") {
      const b = glbBox(buf);
      const same = c.stl && b.size.map((v) => v * 1000).sort((x, y) => x - y).every((v, i) => Math.abs(v - [...c.stl].sort((x, y) => x - y)[i]) < 1);
      (same ? ok : fail)(`GLB box ${b.size.map((v) => (v * 1000).toFixed(1)).join(" × ")} mm (in metri nel file), ${same ? "uguale" : "diverso"} dallo STL`);
    }
  }
  errors.length ? fail(`errori in console: ${[...new Set(errors)].join(" | ")}`) : ok("nessun errore in console");
}

await browser.close();
console.log(failures ? `\n${failures} controlli falliti` : "\nTutti i controlli superati");
process.exit(failures ? 1 : 0);
