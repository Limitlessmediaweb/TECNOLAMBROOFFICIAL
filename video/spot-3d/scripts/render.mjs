/**
 * Rendering offline fotogramma per fotogramma (non registrazione dello schermo): Three.js in Chrome
 * headless su GPU, tempo deterministico, 30 fps. Ogni fotogramma = PNG in render/<formato>/NNNNN.png.
 * Uso: node scripts/render.mjs 9x16|16x9|loop [--from N] [--to N] [--samples N] [--force] [--only s03-flange]
 */
import { chromium } from "playwright";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { startServer } from "./server.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CFG = JSON.parse(readFileSync(join(ROOT, "config.json"), "utf8"));
const arg = (name, def) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : def;
};
const format = process.argv[2] ?? "9x16";
const force = process.argv.includes("--force");
const isLoop = format === "loop";
const size = isLoop ? { width: CFG.loop.width, height: CFG.loop.height } : CFG.formats[format];
const fps = CFG.fps;
const total = Math.round((isLoop ? CFG.loop.duration : CFG.duration) * fps);
const from = Number(arg("from", 0));
const to = Math.min(total, Number(arg("to", total)));
const only = arg("only", null);
const samples = arg("samples", null);
const out = join(ROOT, "render", arg("out", format));
mkdirSync(out, { recursive: true });

const LABELS = { type: "Tipo", types: ["Twistabile", "Curva", "Twist"], plane: "Piano", size: "Misura", angle: "Angolo" };

/** Scena e tempo locale per il fotogramma f (tagli sempre sul beat) */
function at(f) {
  const t = f / fps;
  if (isLoop) return { scene: { id: "loop", shot: "loop", text: "" }, t, dur: CFG.loop.duration };
  const sc = [...CFG.scenes].reverse().find((s) => t >= s.start - 1e-6) ?? CFG.scenes[0];
  return { scene: sc, t: t - sc.start, dur: sc.beats * CFG.beat };
}

const { srv, url } = await startServer();
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: size });
page.on("pageerror", (e) => console.log("[pageerror]", e.message));
page.on("console", (m) => m.type() === "error" && console.log("[page]", m.text()));
await page.goto(`${url}/video/spot-3d/scenes/index.html`);
await page.waitForFunction(() => window.ENGINE_READY && window.OVERLAY_READY, null, { timeout: 60000 });
await page.evaluate(({ size, cfg }) => window.ENGINE.setup({ ...size, config: cfg }), { size, cfg: CFG });
const t0 = Date.now();
let n = 0;
const list = arg("frames", null)?.split(",").map(Number) ?? Array.from({ length: to - from }, (_, i) => from + i);
for (const f of list) {
  const { scene, t, dur } = at(f);
  if (only && scene.id !== only) continue;
  const file = join(out, `${String(f).padStart(5, "0")}.png`);
  if (!force && existsSync(file)) continue;
  const { ui } = await page.evaluate((a) => window.ENGINE.renderFrame(a), { shot: scene.shot, t, dur, fps, samples: samples ? Number(samples) : undefined });
  await page.evaluate((a) => window.OVERLAY.set(a), { format: isLoop ? "16x9" : format, scene: isLoop ? null : scene, t, dur, ui, labels: LABELS });
  await page.evaluate(() => window.OVERLAY.ready());
  writeFileSync(file, await page.screenshot({ type: "png" }));
  n++;
  if (n % 60 === 0) console.log(`${format}: ${f + 1}/${to} (${((Date.now() - t0) / n / 1000).toFixed(2)} s/fotogramma)`);
}
console.log(`${format}: ${n} fotogrammi in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
await browser.close();
srv.close();
