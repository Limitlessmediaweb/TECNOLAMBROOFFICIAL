#!/usr/bin/env node
/**
 * Audit di accessibilità automatico (axe-core, regole WCAG 2.1 A/AA) in tema chiaro e scuro:
 * pagine principali, tabelle (tre tab), configuratore, vista 3D, richiesta con errori, conferma.
 * Uso: BASE_URL=http://localhost:3000 npm run check:a11y
 */
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const AXE = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const PAGES = ["/", "/en", "/prodotti", "/prodotti/guida-flessibile-twistabile", "/prodotti/curve", "/prodotti/guida-flessibile/wr-90", "/en/products/flexible-waveguide/wr-90", "/prodotti/tabelle", "/en/products/tables", "/azienda", "/qualita", "/contatti", "/faq", "/shop", "/en/shop", "/shop/richiesta", "/shop/richiesta/inviata"];

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
  // Tabelle: tab seamless e dimensioni, con filtro di frequenza attivo
  await page.goto(BASE + "/prodotti/tabelle", { waitUntil: "load" });
  await page.getByLabel(/Evidenzia le misure/).fill("10,5");
  for (const tab of ["Seamless", "Dimensioni"]) {
    await page.getByRole("tab", { name: tab }).click();
    await page.waitForTimeout(150);
    await audit(page, `${theme} tabelle ${tab} con filtro`);
  }
  // Configuratore: passo misura per frequenza, poi vista 3D
  await page.goto(BASE + "/shop?ghz=10.5", { waitUntil: "load" });
  await page.waitForTimeout(400);
  await audit(page, `${theme} configuratore (frequenza)`);
  await page.getByRole("button", { name: "Vedi in 3D" }).click();
  await page.locator("figure canvas").waitFor({ timeout: 30000 }).catch(() => {});
  await audit(page, `${theme} vista 3D`);
  // La tua richiesta: un pezzo, invio a vuoto con errori di validazione
  await page.locator("aside").getByRole("button", { name: "Aggiungi alla richiesta" }).click();
  await page.goto(BASE + "/shop/richiesta", { waitUntil: "load" });
  await page.getByRole("button", { name: "Invia richiesta di preventivo" }).click();
  await page.waitForTimeout(200);
  await audit(page, `${theme} richiesta con errori`);
  await ctx.close();
}

await browser.close();
if (total) {
  console.error(`\n${total} violazioni`);
  process.exit(1);
}
console.log("\ncheck:a11y: ok, nessuna violazione WCAG 2.1 AA rilevata da axe.");
