#!/usr/bin/env node
/**
 * Test end-to-end dello shop (Playwright): catalogo → filtro → scheda → 5 pezzi (sconto 8%)
 * → checkout come "azienda UE" (IVA 0%, inversione contabile) → conferma.
 * Gira in italiano e inglese, a 390×844 e 1440×900, e salva gli screenshot di ogni passo.
 * Uso: BASE_URL=http://localhost:3000 npm run test:shop
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const OUT = join(process.cwd(), "screenshots", "shop");

const L = {
  it: {
    shop: "/shop",
    qty: "Quantità",
    add: "Aggiungi al carrello",
    checkout: "Procedi all’ordine",
    next: "Continua",
    company: /^Ragione sociale/,
    contact: /^Referente/,
    email: /^Email/,
    vat: /^Partita IVA/,
    address: /^Indirizzo/,
    city: /^Città/,
    postal: /^CAP/,
    country: /^Paese/,
    submit: "Invia la richiesta d’ordine",
    sentPath: "/shop/ordine-inviato",
    save: "Risparmi",
  },
  en: {
    shop: "/en/shop",
    qty: "Quantity",
    add: "Add to cart",
    checkout: "Proceed to order",
    next: "Continue",
    company: /^Company name/,
    contact: /^Contact person/,
    email: /^Email/,
    vat: /^VAT number/,
    address: /^Address/,
    city: /^City/,
    postal: /^Postal code/,
    country: /^Country/,
    submit: "Send order request",
    sentPath: "/en/shop/order-sent",
    save: "You save",
  },
};

const VIEWPORTS = [
  { name: "390", width: 390, height: 844, isMobile: true, hasTouch: true },
  { name: "1440", width: 1440, height: 900, isMobile: false, hasTouch: false },
];

function expect(cond, msg) {
  if (!cond) throw new Error(`ASSERZIONE FALLITA: ${msg}`);
}

const browser = await chromium.launch();
const failures = [];

for (const vp of VIEWPORTS) {
  for (const [locale, l] of Object.entries(L)) {
    const tag = `${locale}/${vp.name}`;
    const dir = join(OUT, locale, vp.name);
    mkdirSync(dir, { recursive: true });
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: vp.isMobile, hasTouch: vp.hasTouch, reducedMotion: "reduce" });
    await context.addInitScript(() => sessionStorage.setItem("tl-intro-seen", "1"));
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const shot = (name) => page.screenshot({ path: join(dir, `${name}.png`), fullPage: false });

    try {
      // 1. Catalogo
      await page.goto(BASE + l.shop, { waitUntil: "load", timeout: 60000 });
      await page.locator("ul li article").first().waitFor();
      const all = await page.locator("ul li article").count();
      expect(all === 12, `${tag}: 12 prodotti nel catalogo (trovati ${all})`);
      await shot("1-catalogo");

      // 2. Filtro famiglia "flessibile"
      await page.locator('label:has(input[value="flexible"])').first().click();
      await page.waitForTimeout(200);
      const filtered = await page.locator("ul li article").count();
      expect(filtered === 2, `${tag}: 2 prodotti flessibili (trovati ${filtered})`);
      expect(page.url().includes("famiglia=flexible"), `${tag}: filtro nell'URL`);
      await page.locator("ul li article").first().scrollIntoViewIfNeeded();
      await shot("2-filtro-flessibile");

      // 3. Scheda prodotto
      await page.locator('a[href$="/shop/flex-twist-wr90-600"]').first().click();
      await page.waitForURL(/flex-twist-wr90-600/);
      await page.waitForLoadState("networkidle");
      await shot("3-scheda");

      // 4. 5 pezzi: sconto −8% (340 € → 312,80 €)
      const qty = page.getByRole("spinbutton", { name: l.qty, exact: true });
      await qty.fill("5");
      await page.waitForTimeout(150);
      const body = await page.locator("main").innerText();
      expect(body.includes(l.save), `${tag}: messaggio di risparmio con 5 pezzi`);
      expect(/1[.,]?564[.,]00/.test(body), `${tag}: totale riga 5 × 312,80 = 1.564,00`);
      await page.getByRole("button", { name: l.add }).click();
      const dialog = page.locator('dialog[aria-labelledby="cart-title"]');
      await dialog.waitFor({ state: "visible" });
      const drawer = await dialog.innerText();
      expect(/−8%/.test(drawer), `${tag}: sconto −8% nel carrello`);
      await shot("4-carrello");

      // 5. Checkout: azienda UE
      await dialog.getByRole("link", { name: l.checkout }).click();
      await page.waitForURL(/\/shop\/(ordine|order)$/);
      await page.waitForLoadState("networkidle");
      await page.locator('label:has(input[value="business_eu"])').click();
      await shot("5-tipo-cliente");
      await page.getByRole("button", { name: l.next }).click();

      // Dati
      await page.getByLabel(l.company).fill("Mikrowellen Technik GmbH");
      await page.getByLabel(l.contact).fill("Anna Becker");
      await page.getByLabel(l.email).fill("einkauf@example.de");
      await page.getByLabel(l.vat).fill("DE123456789");
      await page.getByLabel(l.address).fill("Hauptstraße 12");
      await page.getByLabel(l.city).fill("München");
      await page.getByLabel(l.postal).fill("80331");
      await page.getByLabel(l.country).selectOption("DE");
      await shot("6-dati");
      await page.getByRole("button", { name: l.next }).click();

      // Riepilogo: IVA 0% con inversione contabile
      const rule = page.locator('[data-vat-rule="eu_reverse_charge"]');
      await rule.waitFor({ state: "visible" });
      const summary = await page.locator("aside").innerText();
      expect(/0%/.test(summary), `${tag}: IVA 0% nel riepilogo`);
      expect(/25[.,]00/.test(summary), `${tag}: spedizione UE 25 €`);
      expect(/1[.,]?589[.,]00/.test(summary), `${tag}: totale 1.564 + 25 = 1.589,00 (IVA 0)`);
      await page.locator('input[type="checkbox"]').check();
      await shot("7-riepilogo");
      await page.getByRole("button", { name: l.submit }).click();

      // 6. Conferma
      await page.waitForURL((u) => u.pathname === l.sentPath, { timeout: 15000 });
      await page.locator("[data-order-number]").waitFor({ state: "visible" });
      const number = await page.locator("[data-order-number]").innerText();
      expect(/^TL-\d{6}-[A-Z0-9]{4}$/.test(number.trim()), `${tag}: numero richiesta (${number})`);
      await shot("8-conferma");

      expect(errors.length === 0, `${tag}: errori JS in pagina: ${errors.join(" | ")}`);
      console.log(`OK  ${tag}  richiesta ${number.trim()}`);
    } catch (e) {
      failures.push(`${tag}: ${e.message}`);
      await shot("ERRORE").catch(() => {});
      console.log(`ERR ${tag}  ${e.message}`);
    }
    await context.close();
  }
}

await browser.close();
if (failures.length) {
  console.error(`\n${failures.length} percorsi falliti`);
  process.exit(1);
}
console.log(`\nTutti i percorsi superati. Screenshot in ${OUT}`);
