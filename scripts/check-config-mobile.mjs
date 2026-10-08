#!/usr/bin/env node
/**
 * Configuratore da telefono (390×844): passa per tutti e 6 i tipi controllando la console,
 * poi tre screenshot: step 1, anteprima 3D dopo lo step 2, fondo con barra e mini-anteprima.
 * Output: screenshots/v4/. Uso: BASE=http://localhost:3211 node scripts/check-config-mobile.mjs [lingua]
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = (process.env.BASE ?? "http://localhost:3211").replace(/\/$/, "");
const LOCALE = process.argv[2] ?? "it";
const OUT = join(process.cwd(), "screenshots", "v4");
mkdirSync(OUT, { recursive: true });
const prefix = LOCALE === "it" ? "" : `/${LOCALE}`;

const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await ctx.addInitScript(() => {
  try {
    sessionStorage.setItem("tl-intro-seen", "1");
  } catch {}
});
const page = await ctx.newPage();
const errors = [];
const missing = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(e.message));
page.on("response", (r) => r.status() >= 400 && missing.push(`${r.status()} ${r.url()}`));

await page.goto(`${BASE}${prefix}/shop`, { waitUntil: "load" });
await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
const scrollTo = (sel) => page.evaluate((s) => window.scrollTo(0, document.querySelector(s).getBoundingClientRect().top + window.scrollY - 80), sel);

// 1. step 1
await scrollTo("[data-step='1']");
await page.waitForTimeout(500);
await page.screenshot({ path: join(OUT, `${LOCALE}-390-1-step1.png`) });

// tutti i tipi, uno dopo l'altro
for (const type of ["twistable", "seamless", "bend", "twist", "offset", "custom", "bend"]) {
  await page.locator(`[data-type-tile=${type}]`).click();
  await page.waitForTimeout(700);
}

// 2. dopo lo step 2: l'anteprima 3D
await scrollTo("[data-preview]");
await page.waitForFunction(() => document.querySelector("[data-viewer-state]")?.dataset.viewerState === "ready", null, { timeout: 30000 }).catch(() => errors.push("3D non pronto"));
await page.waitForTimeout(800);
await page.screenshot({ path: join(OUT, `${LOCALE}-390-2-anteprima-3d.png`) });

// apre lo step delle flange e cambia la flangia 2: la riga di riepilogo si aggiorna
await page.locator("[data-step-toggle='4']").click();
await page.locator("[data-field=f2]").selectOption({ index: 2 });
await page.locator("[data-step='4'] button:has-text('Fatto'), [data-step='4'] .btn-ghost").last().click();

// 3. in fondo: barra fissa e mini-anteprima
await scrollTo("[data-step='6']");
await page.waitForSelector("[data-mini-preview]", { timeout: 15000 }).catch(() => errors.push("mini-anteprima non comparsa"));
await page.waitForTimeout(500);
await page.screenshot({ path: join(OUT, `${LOCALE}-390-3-fondo-mini-anteprima.png`) });
const bar = await page.locator("[data-bar-label]").textContent().catch(() => null);

const wa = await page.locator("[data-whatsapp-float]").isVisible().catch(() => false);
const height = await page.evaluate(() => document.body.scrollHeight);
const wide = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, window.innerWidth) - (window.visualViewport?.width ?? window.innerWidth));
if (wide > 1) errors.push(`pagina più larga dello schermo di ${wide}px`);
if (!(await page.locator("[data-config-bar]").isVisible().catch(() => false))) errors.push("barra fissa non visibile in fondo");

const headerOverflow = await page.evaluate(() => [...document.querySelectorAll("header *")].filter((el) => el.getBoundingClientRect().right > (window.visualViewport?.width ?? window.innerWidth) + 1 && el.getBoundingClientRect().width > 0).length);
if (headerOverflow) errors.push(`header: ${headerOverflow} elementi oltre il bordo destro`);

await browser.close();
console.log(`barra: ${bar}`);
console.log(`WhatsApp visibile con la barra: ${wa}`);
console.log(`altezza di /shop: ${height}px`);
const errs = [...new Set(errors)];
console.log(errs.length ? `errori:\n- ${errs.join("\n- ")}` : "nessun errore in console");
console.log(missing.length ? `risorse in errore:\n- ${[...new Set(missing)].join("\n- ")}` : "nessuna risorsa in errore");
process.exit(errs.length || missing.length || wa ? 1 : 0);
