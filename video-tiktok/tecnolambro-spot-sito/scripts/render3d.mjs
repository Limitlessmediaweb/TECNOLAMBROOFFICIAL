/**
 * Renderizza i take 3D del laptop con Chrome headless (WebGL su GPU).
 * Uso: node scripts/render3d.mjs <jobs.json> [--force]
 * jobs.json: { "width":1080, "height":1920, "items":[ { "shot":"slide", "dur":2.4, "fps":30,
 *   "frames":[da, a) | "times":[s...], "out":"render/3d/hero", "opts":{}, "samples":16,
 *   "screen": { "clip":"hero", "start":1.0, "speed":1 } | { "image":"render/screens/logo.png" } } ] }
 * I fotogrammi delle registrazioni stanno in riprese/frames/<clip>/00001.jpg (30 fps).
 */
import { chromium } from "playwright";
import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { startServer } from "./server.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const jobs = JSON.parse(readFileSync(process.argv[2], "utf8"));
const force = process.argv.includes("--force");
const { srv, url } = await startServer();
const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage({ viewport: { width: jobs.width, height: jobs.height } });
page.on("console", (m) => { if (m.type() === "error") console.log("[page]", m.text()); });
page.on("pageerror", (e) => console.log("[pageerror]", e.message));
await page.goto(url + "/3d/index.html");
await page.waitForFunction(() => window.ENGINE_READY, null, { timeout: 60000 });
await page.evaluate(({ w, h }) => window.ENGINE.setup({ width: w, height: h }), { w: jobs.width, h: jobs.height });

const counts = {};
const frameCount = (clip) => (counts[clip] ??= readdirSync(join(ROOT, "riprese", "frames", clip)).length);

for (const it of jobs.items) {
  const fps = it.fps ?? 30;
  const out = join(ROOT, it.out);
  mkdirSync(out, { recursive: true });
  const list = it.times ? it.times.map((t, i) => ({ i, t })) : [];
  if (!it.times) for (let f = it.frames[0]; f < it.frames[1]; f++) list.push({ i: f, t: f / fps });
  const t0 = Date.now();
  for (const { i, t } of list) {
    const file = join(out, `${String(i).padStart(4, "0")}.png`);
    if (!force && existsSync(file)) continue;
    let screenUrl = null;
    if (it.screen?.image) screenUrl = "/" + it.screen.image;
    else if (it.screen?.clip) {
      const n = Math.max(1, Math.min(frameCount(it.screen.clip), Math.round(((it.screen.start ?? 0) + t * (it.screen.speed ?? 1)) * fps) + 1));
      screenUrl = `/riprese/frames/${it.screen.clip}/${String(n).padStart(5, "0")}.jpg`;
    }
    const data = await page.evaluate((a) => window.ENGINE.renderFrame(a), {
      shot: it.shot, t, dur: it.dur, samples: it.samples ?? 16, fps, screenUrl, opts: it.opts ?? {},
    });
    writeFileSync(file, Buffer.from(data.split(",")[1], "base64"));
  }
  console.log(`${it.shot} -> ${it.out}: ${list.length} fotogrammi in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
}
await browser.close();
srv.close();
