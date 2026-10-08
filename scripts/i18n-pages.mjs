#!/usr/bin/env node
/**
 * Pagine nelle lingue nuove (375×812): home, /shop (configura una curva), richiesta e FAQ.
 * Controlla: stato 200, lang, noindex (lingue in revisione), hreflang, errori in console,
 * testo che esce da pulsanti o pagina più larga dello schermo, parole italiane rimaste.
 * Uso: BASE=http://localhost:3211 node scripts/i18n-pages.mjs [es zh de en]
 */
import { chromium } from "playwright";

const BASE = (process.env.BASE ?? "http://localhost:3211").replace(/\/$/, "");
const LOCALES = process.argv.slice(2).length ? process.argv.slice(2) : ["es", "zh", "de", "en"];
const PATHS = {
  en: { home: "/en", shop: "/en/shop", req: "/en/shop/request", faq: "/en/faq" },
  es: { home: "/es", shop: "/es/shop", req: "/es/shop/solicitud", faq: "/es/faq" },
  zh: { home: "/zh", shop: "/zh/shop", req: "/zh/shop/request", faq: "/zh/faq" },
  de: { home: "/de", shop: "/de/shop", req: "/de/shop/anfrage", faq: "/de/faq" },
};
const ITALIAN = /\b(della|delle|degli|nella|sono|anche|questa|questo|preventivo|richiesta|lunghezza|flangia|scegli|invia|grazie|perché|più|già|Aggiungi|Configura|Prodotti|Contatti|Azienda)\b/;
const IGNORE = /Via Privata delle Betulle|Via degli Spinedi|San Colombano al Lambro|Miradolo Terme|Tecnolambro S\.a\.s\. di Pasquini Marco & C\.|Garante per la protezione dei dati personali|Regolamento Tecnico ACCREDIA RT-09|Progettazione e Produzione di Componenti[^.]*\./g;

const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
let problems = 0;
for (const loc of LOCALES) {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: loc });
  await ctx.addInitScript(() => {
    try {
      sessionStorage.setItem("tl-intro-seen", "1");
      localStorage.setItem("tl-lang-banner", "test");
    } catch {}
  });
  console.log(`\n=== ${loc}`);
  for (const [name, path] of Object.entries(PATHS[loc])) {
    const page = await ctx.newPage();
    const errors = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("response", (r) => r.status() === 404 && errors.push(`404 ${r.url()}`));
    const res = await page.goto(BASE + path, { waitUntil: "load" });
    await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
    if (name === "shop") {
      await page.locator("[data-type-tile=bend]").click();
      await page.waitForTimeout(600);
      await page.evaluate(() => document.querySelector("[data-preview]")?.scrollIntoView());
      await page.waitForFunction(() => document.querySelector("[data-viewer-state]")?.dataset.viewerState === "ready", null, { timeout: 30000 }).catch(() => errors.push("3D non pronto"));
    }
    // scorre la pagina per le sezioni pigre
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 700) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 80));
      }
    });
    const info = await page.evaluate(() => {
      const vw = window.visualViewport?.width ?? window.innerWidth;
      const overflow = [];
      for (const el of document.querySelectorAll(".btn, button, a.btn, summary")) {
        const r = el.getBoundingClientRect();
        if (!r.width) continue;
        if (el.scrollWidth > el.clientWidth + 1 || r.right > vw + 1) overflow.push(`"${(el.textContent || "").trim().slice(0, 40)}"`);
      }
      const robots = document.querySelector('meta[name="robots"]')?.getAttribute("content") ?? "";
      const hreflangs = [...document.querySelectorAll('link[rel="alternate"][hreflang]')].map((l) => l.getAttribute("hreflang"));
      return { lang: document.documentElement.lang, overflow: [...new Set(overflow)], wide: Math.max(document.documentElement.scrollWidth, window.innerWidth) - vw, robots, hreflangs, text: document.body.innerText };
    });
    const text = info.text.replace(/IGNORE_PLACEHOLDER/g, "").replace(IGNORE, "");
    const italian = [...new Set((text.match(new RegExp(ITALIAN.source, "g")) ?? []))];
    const issues = [];
    if (res?.status() !== 200) issues.push(`stato ${res?.status()}`);
    if (info.overflow.length) issues.push(`testo fuori dai pulsanti: ${info.overflow.join(", ")}`);
    if (info.wide > 1) issues.push(`pagina più larga di ${info.wide}px`);
    if (italian.length) issues.push(`parole italiane: ${italian.join(", ")}`);
    if (errors.length) issues.push(`errori: ${[...new Set(errors)].join(" | ").slice(0, 300)}`);
    console.log(`${issues.length ? "✗" : "✓"} ${path}  lang=${info.lang} robots="${info.robots}" hreflang=[${info.hreflangs.join(",")}]`);
    for (const i of issues) console.log(`    ${i}`);
    problems += issues.length;
    await page.close();
  }
  await ctx.close();
}
await browser.close();
console.log(problems ? `\n${problems} problemi` : "\nNessun problema");
process.exit(problems ? 1 : 0);
