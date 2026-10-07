#!/usr/bin/env node
/**
 * Screenshot Playwright di tutte le pagine: 390×844 e 1440×900, italiano e inglese.
 * Uso: BASE_URL=http://localhost:3000 npm run screenshots
 *  - full page con prefers-reduced-motion (layout finale, niente pin/scrub)
 *  - in più, la prima schermata della home con le animazioni attive
 * Output: screenshots/<lingua>/<larghezza>/<pagina>.png
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const OUT = join(process.cwd(), "screenshots");

const PAGES = {
  it: {
    home: "/",
    prodotti: "/prodotti",
    "prodotti-rigida": "/prodotti/rigida",
    "prodotti-flessibile": "/prodotti/flessibile",
    "prodotti-illuminatori": "/prodotti/illuminatori",
    "prodotti-transizioni": "/prodotti/transizioni",
    "prodotti-flange-e-kit": "/prodotti/flange-e-kit",
    "prodotti-su-disegno": "/prodotti/su-disegno",
    "su-misura": "/su-misura",
    azienda: "/azienda",
    qualita: "/qualita",
    radioamatori: "/radioamatori",
    contatti: "/contatti",
    faq: "/faq",
    privacy: "/privacy",
    termini: "/termini",
    cookie: "/cookie",
    shop: "/shop",
    "shop-scheda": "/shop/flex-twist-wr90-600",
    "shop-ordine": "/shop/ordine",
    "404": "/pagina-inesistente",
  },
  en: {
    home: "/en",
    products: "/en/products",
    "products-rigid": "/en/products/rigid",
    "products-flexible": "/en/products/flexible",
    "products-feed-horns": "/en/products/feed-horns",
    "products-transitions": "/en/products/transitions",
    "products-flanges-and-kits": "/en/products/flanges-and-kits",
    "products-custom-built": "/en/products/custom-built",
    custom: "/en/custom",
    company: "/en/company",
    quality: "/en/quality",
    "ham-radio": "/en/ham-radio",
    contact: "/en/contact",
    faq: "/en/faq",
    privacy: "/en/privacy",
    terms: "/en/terms",
    cookies: "/en/cookies",
    shop: "/en/shop",
    "shop-product": "/en/shop/feed-10ghz-qo100",
    "shop-order": "/en/shop/order",
    "404": "/en/missing-page",
  },
};

const VIEWPORTS = [
  { name: "390", width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  { name: "1440", width: 1440, height: 900, isMobile: false, hasTouch: false, deviceScaleFactor: 1 },
];

const browser = await chromium.launch();
const errors = [];
let count = 0;

for (const vp of VIEWPORTS) {
  for (const motion of ["reduce", "no-preference"]) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      isMobile: vp.isMobile,
      hasTouch: vp.hasTouch,
      deviceScaleFactor: vp.deviceScaleFactor,
      reducedMotion: motion,
    });
    // L'intro è già stata vista: gli screenshot mostrano la pagina.
    await context.addInitScript(() => {
      try {
        sessionStorage.setItem("tl-intro-seen", "1");
      } catch {}
    });

    for (const [locale, pages] of Object.entries(PAGES)) {
      const entries = motion === "reduce" ? Object.entries(pages) : [["home", pages.home]];
      for (const [name, path] of entries) {
        const page = await context.newPage();
        page.on("pageerror", (e) => errors.push(`${locale} ${vp.name} ${path}: ${e.message}`));
        const res = await page.goto(BASE + path, { waitUntil: "load", timeout: 60000 });
        const expected = name === "404" ? 404 : 200;
        if (res?.status() !== expected) errors.push(`${path}: status ${res?.status()} (atteso ${expected})`);
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(motion === "reduce" ? 400 : 2600);
        const dir = join(OUT, locale, vp.name);
        mkdirSync(dir, { recursive: true });
        const file = motion === "reduce" ? `${name}.png` : `${name}-motion-fold.png`;
        await page.screenshot({ path: join(dir, file), fullPage: motion === "reduce" });
        count++;
        await page.close();
      }
    }
    await context.close();
  }
}

await browser.close();
console.log(`${count} screenshot salvati in ${OUT}`);
if (errors.length) {
  console.error("Problemi:\n" + errors.join("\n"));
  process.exit(1);
}
