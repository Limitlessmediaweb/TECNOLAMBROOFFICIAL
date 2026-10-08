#!/usr/bin/env node
/**
 * Screenshot delle viste richieste dal brief v3, 390×844 e 1440×900, italiano e inglese:
 * home, /shop scelta del tipo, configuratore curva in 3D, "La tua richiesta" con 3 pezzi,
 * pagina inviata, pagina WR-90, /qualita, /azienda sezione titolare, contatti.
 * Output: screenshots/v3/<lingua>-<larghezza>-<vista>.png
 * Uso: BASE=http://localhost:3211 npm run screenshots:v3
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = (process.env.BASE ?? "http://localhost:3211").replace(/\/$/, "");
const OUT = join(process.cwd(), "screenshots", "v3");
mkdirSync(OUT, { recursive: true });

const P = {
  it: { home: "/", shop: "/shop", req: "/shop/richiesta", sent: "/shop/richiesta/inviata", wr: "/prodotti/guida-flessibile/wr-90", quality: "/qualita", about: "/azienda", contact: "/contatti" },
  en: { home: "/en", shop: "/en/shop", req: "/en/shop/request", sent: "/en/shop/request/sent", wr: "/en/products/flexible-waveguide/wr-90", quality: "/en/quality", about: "/en/company", contact: "/en/contact" },
};

/** Tre pezzi in "La tua richiesta" e una richiesta inviata (dati di prova, solo nel browser) */
function seed(locale) {
  const it = locale === "it";
  const items = [
    { id: "a", kind: "configured", code: "TLFX-100 · TWIST · L600 · UBR100/PBR100", detail: it ? "Flessibile twistabile · WR-90 · 8,2–12,5 GHz · L 600 mm" : "Twistable flexible · WR-90 · 8.2–12.5 GHz · L 600 mm", qty: 2, notes: "", spec: { type: "twistable", wr: "WR-90", f1: "UBR100", f2: "PBR100", finish: "raw", treatment: "none", length: 600 } },
    { id: "b", kind: "configured", code: "CURVA-E · WR-75 · 90° · L1 100 · L2 100 · UBR120/UBR120", detail: it ? "Curva · WR-75 · Piano E · 90° · R standard" : "Bend · WR-75 · E-plane · 90° · Std radius", qty: 1, notes: it ? "Pressurizzazione a 0,5 bar" : "Pressurized to 0.5 bar", spec: { type: "bend", wr: "WR-75", f1: "UBR120", f2: "UBR120", finish: "raw", treatment: "none", plane: "E", angle: 90, radius: null, leg1: 100, leg2: 100 } },
    { id: "c", kind: "custom", code: it ? "SU DISEGNO" : "TO DRAWING", detail: it ? "Su disegno · Non lo so · 9,4 GHz" : "To your drawing · I don’t know · 9.4 GHz", qty: 3, notes: it ? "Curva piano H 45° con flange UG-39/U" : "H-plane 45° bend with UG-39/U flanges" },
  ];
  const sent = { number: "TL-261008-1440", date: it ? "08/10/2026" : "08/10/2026", locale, customer: { name: "Anna Prova", company: "Prova GmbH", email: "anna@example.test" }, items: items.map((i) => ({ code: i.code, qty: i.qty, detail: i.detail })) };
  return { items, sent };
}

const VIEWS = [
  { name: "home", page: "home" },
  { name: "shop-tipi", page: "shop", target: "#types-title" },
  { name: "configuratore-curva-3d", page: "shop", query: "?tipo=curva&piano=E&wr=90&ang=90&l1=100&l2=100&f1=UBR100&f2=UBR100", target: "[data-viewer-state]", ready3d: true },
  { name: "richiesta-3-pezzi", page: "req", seed: true },
  { name: "inviata", page: "sent", seed: true },
  { name: "wr-90", page: "wr" },
  { name: "qualita", page: "quality", target: "[data-cert]" },
  { name: "azienda-titolare", page: "about", target: "[aria-labelledby=owner-full]" },
  { name: "contatti", page: "contact" },
];

const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const errors = [];
let n = 0;
for (const vp of [
  { w: 390, h: 844, mobile: true },
  { w: 1440, h: 900, mobile: false },
]) {
  for (const locale of ["it", "en"]) {
    const { items, sent } = seed(locale);
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, isMobile: vp.mobile, hasTouch: vp.mobile, deviceScaleFactor: vp.mobile ? 2 : 1, reducedMotion: "reduce" });
    await ctx.addInitScript(
      ([items, sent]) => {
        try {
          sessionStorage.setItem("tl-intro-seen", "1");
          localStorage.setItem("tl-request-v1", JSON.stringify(items));
          sessionStorage.setItem("tl-last-request-v2", JSON.stringify(sent));
        } catch {}
      },
      [items, sent],
    );
    for (const v of VIEWS) {
      const page = await ctx.newPage();
      page.on("pageerror", (e) => errors.push(`${locale} ${vp.w} ${v.name}: ${e.message}`));
      await page.goto(`${BASE}${P[locale][v.page]}${v.query ?? ""}`, { waitUntil: "load", timeout: 60000 });
      await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
      await page.evaluate(() => document.fonts.ready);
      if (v.target) {
        await page.locator(v.target).first().scrollIntoViewIfNeeded();
        await page.evaluate((sel) => {
          const el = document.querySelector(sel);
          if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 96 });
        }, v.target);
      }
      if (v.ready3d) await page.waitForFunction(() => document.querySelector("[data-viewer-state]")?.dataset.viewerState === "ready", null, { timeout: 30000 }).catch(() => errors.push(`${locale} ${vp.w}: 3D non pronto`));
      await page.waitForTimeout(v.ready3d ? 1200 : 500);
      await page.screenshot({ path: join(OUT, `${locale}-${vp.w}-${v.name}.png`) });
      n++;
      await page.close();
    }
    await ctx.close();
  }
}
await browser.close();
console.log(`${n} screenshot in ${OUT}`);
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
