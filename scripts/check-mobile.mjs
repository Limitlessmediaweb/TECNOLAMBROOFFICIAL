#!/usr/bin/env node
/**
 * Controlli da telefono (375×812): aree toccabili sotto 44 px, testo che esce da pulsanti e link,
 * errori in console e risorse 404. Uso: BASE=http://localhost:3211 node scripts/check-mobile.mjs [percorsi…]
 */
import { chromium } from "playwright";

const BASE = (process.env.BASE ?? "http://localhost:3211").replace(/\/$/, "");
const PATHS = process.argv.slice(2).length ? process.argv.slice(2) : ["/"];
const MIN = 44;

const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await ctx.addInitScript(() => {
  try {
    sessionStorage.setItem("tl-intro-seen", "1");
  } catch {}
});
let problems = 0;
for (const path of PATHS) {
  const page = await ctx.newPage();
  const errors = [];
  const missing = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => r.status() === 404 && missing.push(r.url()));
  await page.goto(BASE + path, { waitUntil: "load" });
  await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
  // scorre tutta la pagina per far comparire le sezioni pigre
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(600);
  const small = await page.evaluate((MIN) => {
    const out = [];
    for (const el of document.querySelectorAll("a[href], button, [role=button], input[type=checkbox], input[type=radio]:not(.sr-only), summary")) {
      const r = el.getBoundingClientRect();
      const st = getComputedStyle(el);
      if (!r.width || !r.height || st.visibility === "hidden" || el.closest("[aria-hidden=true]") || el.classList.contains("sr-only")) continue;
      // eccezioni WCAG 2.5.8: link dentro una frase, caselle con l'etichetta cliccabile accanto
      const parent = el.parentElement;
      if (el.tagName === "A" && parent && /^(P|LABEL|SPAN|LI)$/.test(parent.tagName) && (parent.textContent || "").trim().length > (el.textContent || "").trim().length + 15 && st.display === "inline") continue;
      if (el.tagName === "INPUT" && el.id && document.querySelector(`label[for="${el.id}"]`)) continue;
      if (r.height < MIN || r.width < 24) {
        // area toccabile estesa da uno pseudo-elemento (after:absolute after:inset-0) del link
        const after = getComputedStyle(el, "::after");
        if (after.position === "absolute" && after.content !== "none") continue;
        out.push(`${el.tagName.toLowerCase()} ${Math.round(r.width)}×${Math.round(r.height)} "${(el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 40)}"`);
      }
    }
    return out;
  }, MIN);
  const overflow = await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll(".btn, button, a.btn")) {
      if (el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0) out.push(`"${(el.textContent || "").trim().slice(0, 40)}" ${el.scrollWidth}>${el.clientWidth}`);
    }
    if (document.documentElement.scrollWidth > window.innerWidth + 1) out.push(`pagina larga ${document.documentElement.scrollWidth}px`);
    return out;
  });
  console.log(`\n${path}`);
  console.log(`  aree toccabili sotto ${MIN}px: ${small.length}`);
  for (const s of small.slice(0, 60)) console.log(`    - ${s}`);
  console.log(`  testo fuori dai pulsanti: ${overflow.length}`);
  for (const s of overflow) console.log(`    - ${s}`);
  const errs = [...new Set(errors)];
  console.log(`  errori console: ${errs.length}`);
  for (const e of errs) console.log(`    - ${e.slice(0, 200)}`);
  console.log(`  404: ${missing.length}`);
  for (const m of [...new Set(missing)]) console.log(`    - ${m}`);
  problems += small.length + overflow.length + errs.length + missing.length;
  await page.close();
}
await browser.close();
process.exit(problems ? 1 : 0);
