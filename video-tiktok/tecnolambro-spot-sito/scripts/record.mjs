/**
 * Registra le clip del sito Tecnolambro che vanno DENTRO gli schermi dello spot.
 *
 * Uso:  node scripts/record.mjs            # tutte le clip
 *       node scripts/record.mjs bandfinder # solo una
 *
 * Il sito gira in produzione su SITE_URL (predefinito http://localhost:3211):
 *   SWC_NATIVE_BINDING_CACHE=$PWD/.swc-cache npx next build && npx next start --port 3211
 *
 * Metodo (lo stesso di glow-up/scripts/record.mjs di limitless-v3):
 *  - CDP Page.startScreencast (jpeg 100) con timestamp, poi 30 fps costanti (per ogni istante
 *    l'ultimo fotogramma arrivato) e ffmpeg CRF 12;
 *  - Chrome con finestra (in headless lo screencast ignora il DPR 2);
 *  - visita di riscaldamento prima di registrare; scroll con eventi di rotellina (Lenis).
 * Tema: quello predefinito del sito (chiaro). Gli schermi chiari illuminano la stanza buia.
 */
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CFG = JSON.parse(readFileSync(join(ROOT, "config.json"), "utf8"));
const OUT = join(ROOT, "riprese");
const FRAMES = join(ROOT, "riprese", "_frames");
const FPS = 30;
const SITE = (process.env.SITE_URL ?? CFG.site.url).replace(/\/$/, "");

const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1";
const LAPTOP = { w: 1440, h: 900, dpr: 2, mobile: false };
const PHONE = { w: 540, h: 960, dpr: 2, mobile: true };
const SKIP_INTRO = "try{sessionStorage.setItem('tl-intro-seen','1')}catch(e){}";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Slider della ricerca per frequenza: scala logaritmica 3-40 GHz su 0-1000 passi (BandFinder.tsx). */
const sliderValue = (ghz) => Math.round((Math.log(ghz / 3) / Math.log(40 / 3)) * 1000);

/** Scroll guidato a ~60 Hz con piccoli eventi di rotellina (Lenis) e curva morbida. */
const smoothScroll = (page, dist, ms) =>
  page.evaluate(
    ([dist, ms]) =>
      new Promise((done) => {
        const lenis = document.documentElement.classList.contains("lenis");
        const base = scrollY;
        let sent = 0;
        const t0 = performance.now();
        const ease = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
        const timer = setInterval(() => {
          const p = Math.min(1, (performance.now() - t0) / ms);
          const target = Math.round(ease(p) * dist);
          const d = target - sent;
          if (d) {
            if (lenis) window.dispatchEvent(new WheelEvent("wheel", { deltaY: d, bubbles: true, cancelable: true }));
            else window.scrollTo(0, base + target);
            sent = target;
          }
          if (p >= 1) {
            clearInterval(timer);
            done();
          }
        }, 16);
      }),
    [dist, ms],
  );

async function jumpTo(page, selector, offset = 0) {
  await page.evaluate(
    ([sel, off]) => {
      const el = document.querySelector(sel);
      const y = Math.max(0, el.getBoundingClientRect().top + scrollY + off);
      if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true, force: true });
      window.scrollTo(0, y);
    },
    [selector, offset],
  );
  await sleep(1800); // animazioni di comparsa della sezione
}

/** Slider: anima il valore da `from` a `to` GHz come un dito che lo trascina. */
const dragSlider = (page, from, to, ms) =>
  page.evaluate(
    ([a, b, ms]) =>
      new Promise((done) => {
        const input = document.querySelector('#bande input[type="range"]');
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
        const t0 = performance.now();
        const ease = (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
        const timer = setInterval(() => {
          const p = Math.min(1, (performance.now() - t0) / ms);
          setter.call(input, String(Math.round(a + (b - a) * ease(p))));
          input.dispatchEvent(new Event("input", { bubbles: true }));
          if (p >= 1) {
            clearInterval(timer);
            done();
          }
        }, 33);
      }),
    [sliderValue(from), sliderValue(to), ms],
  );

async function fillQuote(page) {
  const form = page.locator("#preventivo form");
  await form.locator('[name="name"]').fill("Marco Bassi");
  await form.locator('[name="company"]').fill("Radiolink Srl");
  await form.locator('[name="email"]').fill("acquisti@radiolink.example");
  await form.locator('[name="country"]').fill("Italia");
  await form.locator('[name="family"]').selectOption({ index: 1 }).catch(() => {});
  await form.locator('[name="size"]').selectOption("WR-90").catch(() => {});
  await form.locator('[name="frequency"]').fill("10,5");
  await form.locator('[name="quantity"]').fill("12");
}

/**
 * Clip. hold = ms fermi all'inizio; act = azione registrata; tail = ms fermi alla fine.
 * Le lettere (a)-(h) sono quelle del brief.
 */
const CLIPS = {
  // (a) intro: seconda visita con sessionStorage vuoto, registrata dal caricamento
  intro: { ...LAPTOP, path: "/", replay: true, hold: 5200 },
  // (b) hero con il campo TE10 animato e una piccola discesa
  hero: { ...LAPTOP, path: "/", hold: 1500, act: (p) => smoothScroll(p, 260, 2600), tail: 500 },
  // (c) famiglie di prodotto
  products: { ...LAPTOP, path: "/", at: ["#products-title", -150], hold: 500, act: (p) => smoothScroll(p, 980, 4600), tail: 400 },
  // (d) ricerca per frequenza: lo slider va da 5 a 30 GHz
  bandfinder: {
    ...LAPTOP,
    path: "/",
    at: ["#band-title", -110],
    prep: (p) => dragSlider(p, 10.5, 5, 400),
    hold: 700,
    act: (p) => dragSlider(p, 5, 30, 3600),
    tail: 900,
  },
  // (e) shop: filtro "flessibili" -> scheda -> aggiungi al carrello
  shop: {
    ...LAPTOP,
    path: "/shop",
    hold: 900,
    act: async (p) => {
      await p.locator('label:has(input[value="flexible"])').first().click();
      await sleep(1300);
      await p.locator('a[href$="/shop/flex-twist-wr90-600"]').first().click();
      await p.waitForURL(/flex-twist-wr90-600/);
      await sleep(1400);
      // scende piano finché il pulsante è a metà schermo, poi il clic (niente salti di scroll)
      const add = p.getByRole("button", { name: "Aggiungi al carrello" });
      const dy = await add.evaluate((el) => el.getBoundingClientRect().top - innerHeight * 0.55);
      if (dy > 0) await smoothScroll(p, Math.round(dy), 900);
      await sleep(500);
      await add.click();
      await sleep(400);
    },
    tail: 1800,
  },
  // (f) home al telefono
  "home-mobile": { ...PHONE, path: "/", hold: 900, act: (p) => smoothScroll(p, 2100, 6200), tail: 400 },
  // (f2) shop al telefono: scheda prodotto, tocco su "Aggiungi al carrello"
  "shop-mobile": {
    ...PHONE,
    path: "/shop/flex-twist-wr90-600",
    prep: async (p) => {
      const btn = p.getByRole("button", { name: "Aggiungi al carrello" });
      const y = await btn.evaluate((el) => el.getBoundingClientRect().top + scrollY - innerHeight * 0.8);
      await p.evaluate((y) => (window.__lenis ? window.__lenis.scrollTo(y, { immediate: true, force: true }) : window.scrollTo(0, y)), y);
      await sleep(1200);
    },
    hold: 2700,
    act: async (p) => {
      await p.getByRole("button", { name: "Aggiungi al carrello" }).tap();
      await sleep(300);
    },
    tail: 2400,
  },
  // (g)+(h) preventivo al telefono: form già compilato, si scrive la descrizione, privacy, "Invia"
  "quote-mobile": {
    ...PHONE,
    path: "/",
    at: ["#preventivo", 0],
    prep: async (p) => {
      await fillQuote(p);
      const y = await p.locator('#preventivo form [name="message"]').evaluate((el) => el.getBoundingClientRect().top + scrollY - 140);
      await p.evaluate((y) => (window.__lenis ? window.__lenis.scrollTo(y, { immediate: true, force: true }) : window.scrollTo(0, y)), y);
      await sleep(1000);
    },
    hold: 600,
    act: async (p) => {
      const form = p.locator("#preventivo form");
      await form.locator('[name="message"]').tap();
      await sleep(250);
      await form.locator('[name="message"]').pressSequentially("Twist 90° WR-90 con flange UBR100, 12 pezzi.", { delay: 38 });
      await sleep(350);
      await form.locator('[name="privacy"]').tap();
      await sleep(450);
      await smoothScroll(p, 220, 700);
      await sleep(250);
      await form.getByRole("button", { name: "Invia la richiesta" }).tap();
      await p.getByText("Richiesta ricevuta.").waitFor({ timeout: 4000 }).catch(() => console.log("  ! conferma non visibile"));
    },
    tail: 2600,
  },
};

async function record(browser, name, c) {
  const context = await browser.newContext({
    viewport: { width: c.w, height: c.h },
    deviceScaleFactor: c.dpr,
    isMobile: c.mobile,
    hasTouch: c.mobile,
    userAgent: c.mobile ? IPHONE_UA : undefined,
    reducedMotion: "no-preference",
    colorScheme: "light",
    locale: "it-IT",
  });
  if (!c.replay) await context.addInitScript(SKIP_INTRO);
  // al ricaricamento la pagina riparte dall'alto (niente scroll ripristinato da Lenis o dal browser)
  await context.addInitScript(() => {
    try {
      history.scrollRestoration = "manual";
    } catch {}
  });
  await context.addInitScript(() => {
    const s = document.createElement("style");
    s.textContent = "html::-webkit-scrollbar,body::-webkit-scrollbar{display:none!important}html,body{scrollbar-width:none!important}";
    document.addEventListener("DOMContentLoaded", () => document.head.appendChild(s));
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(SITE + c.path, { waitUntil: "load", timeout: 60_000 });
  await page.evaluate(() => document.fonts.ready);
  await sleep(c.replay ? 6000 : 2500);

  // riscaldamento: scorre tutta la pagina (lazy, animazioni) e torna su
  for (let i = 0; i < 40; i++) {
    const [y, max] = await page.evaluate(() => [scrollY, document.documentElement.scrollHeight - innerHeight]);
    if (y >= max - 2) break;
    await page.evaluate((d) => window.dispatchEvent(new WheelEvent("wheel", { deltaY: d, bubbles: true, cancelable: true })), c.h * 0.9);
    await sleep(160);
  }
  await page.evaluate(() => (window.__lenis ? window.__lenis.scrollTo(0, { immediate: true, force: true }) : window.scrollTo(0, 0)));
  await sleep(1200);
  if (!c.mobile) await page.mouse.move(c.w - 40, c.h - 40);

  if (c.replay) {
    // l'intro ripartirà al ricaricamento
  } else {
    // ricarica pulita: nessuna animazione di comparsa già consumata dal riscaldamento
    await page.reload({ waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    await sleep(2000);
  }
  if (c.at) await jumpTo(page, c.at[0], c.at[1]);
  if (c.prep) await c.prep(page);

  const frames = [];
  const cdp = await context.newCDPSession(page);
  cdp.on("Page.screencastFrame", async (f) => {
    frames.push({ t: (f.metadata.timestamp ?? Date.now() / 1000) * 1000, data: Buffer.from(f.data, "base64") });
    await cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
  });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 100, maxWidth: c.w * c.dpr, maxHeight: c.h * c.dpr, everyNthFrame: 1 });
  const t0 = Date.now();
  if (c.replay) {
    await page.evaluate(() => sessionStorage.clear());
    await page.reload({ waitUntil: "commit" });
  }
  await sleep(c.hold);
  if (c.act) await c.act(page);
  await sleep(c.tail ?? 0);
  await cdp.send("Page.stopScreencast");
  const durationMs = Date.now() - t0;
  await context.close();
  if (!frames.length) throw new Error("nessun fotogramma");

  const dir = join(FRAMES, name);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  frames.sort((a, b) => a.t - b.t);
  // l'orologio dei timestamp CDP è quello del browser: si allinea al primo fotogramma
  const base = frames[0].t;
  const total = Math.floor((durationMs / 1000) * FPS);
  let k = 0;
  for (let i = 0; i < total; i++) {
    const t = base + (i * 1000) / FPS;
    while (k + 1 < frames.length && frames[k + 1].t <= t) k++;
    writeFileSync(join(dir, `${String(i).padStart(5, "0")}.jpg`), frames[k].data);
  }
  const dst = join(OUT, `${name}.mp4`);
  execFileSync("ffmpeg", [
    "-v", "error", "-y", "-framerate", String(FPS), "-i", join(dir, "%05d.jpg"),
    "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2",
    "-c:v", "libx264", "-crf", "12", "-preset", "medium", "-pix_fmt", "yuv420p", dst,
  ]);
  rmSync(dir, { recursive: true, force: true });
  console.log(`✓ ${name}: ${frames.length} fotogrammi → ${total} a ${FPS} fps (${(durationMs / 1000).toFixed(1)} s)${errors.length ? "  errori: " + errors.join(" | ") : ""}`);
}

const only = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({
  channel: "chrome",
  headless: process.env.HEADLESS === "1",
  args: ["--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding", "--disable-background-timer-throttling"],
});
for (const [name, c] of Object.entries(CLIPS)) {
  if (only.length && !only.includes(name)) continue;
  try {
    await record(browser, name, c);
  } catch (e) {
    console.error(`✗ ${name}:`, e.stack);
  }
}
await browser.close();
rmSync(FRAMES, { recursive: true, force: true });
