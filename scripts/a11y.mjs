#!/usr/bin/env node
/**
 * Audit di accessibilità automatico (axe-core, regole WCAG 2.1 A/AA) in tema chiaro e scuro:
 * pagine principali, shop, scheda, carrello aperto e passi del checkout.
 * Uso: BASE_URL=http://localhost:3000 npm run check:a11y
 */
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const AXE = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const PAGES = ["/", "/en", "/prodotti", "/prodotti/flessibile", "/contatti", "/faq", "/shop", "/en/shop", "/shop/flex-twist-wr90-600", "/en/shop/feed-10ghz-qo100", "/shop/ordine"];

const browser = await chromium.launch();
let total = 0;

async function audit(page, label) {
  await page.addScriptTag({ content: AXE });
  const result = await page.evaluate(async () => {
    const r = await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] } });
    return r.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.slice(0, 3).map((n) => n.target.join(" ") + " :: " + (n.failureSummary || "").split("\n")[1]) }));
  });
  total += result.length;
  console.log(`${result.length ? "✗" : "✓"} ${label}${result.length ? "" : " ok"}`);
  for (const v of result) console.log(`   [${v.impact}] ${v.id}\n     ${v.nodes.join("\n     ")}`);
}

for (const theme of ["light", "dark"]) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
  await ctx.addInitScript((th) => {
    sessionStorage.setItem("tl-intro-seen", "1");
    localStorage.setItem("tl-theme", th);
  }, theme);
  const page = await ctx.newPage();
  for (const path of PAGES) {
    await page.goto(BASE + path, { waitUntil: "load" });
    await page.waitForTimeout(400);
    await audit(page, `${theme} ${path}`);
  }
  // Carrello aperto con un articolo
  await page.goto(BASE + "/shop/twist-wr75-90", { waitUntil: "load" });
  await page.getByRole("button", { name: /Aggiungi al carrello/ }).click();
  await page.locator('dialog[aria-labelledby="cart-title"]').waitFor({ state: "visible" });
  await page.waitForTimeout(300);
  await audit(page, `${theme} carrello aperto`);
  // Checkout passo 2 con errori di validazione
  await page.goto(BASE + "/shop/ordine", { waitUntil: "load" });
  await page.getByRole("button", { name: "Continua" }).click();
  await page.getByRole("button", { name: "Continua" }).click();
  await page.waitForTimeout(200);
  await audit(page, `${theme} checkout passo 2 con errori`);
  await ctx.close();
}

await browser.close();
if (total) {
  console.error(`\n${total} violazioni`);
  process.exit(1);
}
console.log("\ncheck:a11y: ok, nessuna violazione WCAG 2.1 AA rilevata da axe.");
