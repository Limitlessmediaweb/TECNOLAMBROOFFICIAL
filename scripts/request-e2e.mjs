#!/usr/bin/env node
/**
 * Test end-to-end della richiesta di preventivo (Playwright), IT/EN × 390/1440:
 * tabelle → "Configura" WR-90 → configuratore con la misura già scelta → lunghezza 1000 mm e
 * flangia B → "Vedi in 3D" → scarica PDF e STL → aggiungi alla richiesta → secondo pezzo dai
 * prodotti pronti → quantità e note → 2 file → invio (chiamata /api/quote SIMULATA) → conferma.
 * In più: invio fallito (503) → messaggio chiaro e dati conservati. Screenshot di ogni passo.
 * Uso: BASE_URL=http://localhost:3000 npm run test:request
 */
import { chromium } from "playwright";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const OUT = join(process.cwd(), "screenshots", "v2");
const MOCK_NUMBER = "TL-2026-000123";

const L = {
  it: {
    tables: "/prodotti/tabelle",
    home: "/",
    sent: "/shop/richiesta-inviata",
    request: "/shop/richiesta",
    next: "Avanti",
    flangeB: "Flangia lato B",
    view3d: "Vedi in 3D",
    pdf: "Scarica disegno (PDF)",
    stl: "Scarica modello 3D (STL)",
    add: "Aggiungi alla richiesta",
    seamless: "Guida d’onda flessibile seamless",
    tabSeamless: "Seamless",
    tabDims: "Dimensioni",
    company: "Azienda",
    name: "Nome e cognome",
    email: "Email",
    country: "Paese",
    submit: "Invia richiesta di preventivo",
    quantityOf: "Quantità di",
    notes: "Scrivi cosa ti serve",
    country_v: "Italia",
  },
  en: {
    tables: "/en/products/tables",
    home: "/en",
    sent: "/en/shop/request-sent",
    request: "/en/shop/request",
    next: "Next",
    flangeB: "Flange, side B",
    view3d: "View in 3D",
    pdf: "Download drawing (PDF)",
    stl: "Download 3D model (STL)",
    add: "Add to request",
    seamless: "Seamless flexible waveguide",
    tabSeamless: "Seamless",
    tabDims: "Dimensions",
    company: "Company",
    name: "First and last name",
    email: "Email",
    country: "Country",
    submit: "Send quote request",
    quantityOf: "Quantity of",
    notes: "Tell us what you need",
    country_v: "Germany",
  },
};

const VIEWPORTS = [
  { name: "390", width: 390, height: 844, isMobile: true, hasTouch: true },
  { name: "1440", width: 1440, height: 900, isMobile: false, hasTouch: false },
];

function expect(cond, msg) {
  if (!cond) throw new Error(`ASSERZIONE FALLITA: ${msg}`);
}

// due file finti da caricare (estensioni accettate)
const tmp = join(tmpdir(), "tl-e2e");
mkdirSync(tmp, { recursive: true });
const fileA = join(tmp, "disegno-cliente.pdf");
const fileB = join(tmp, "modello-cliente.step");
writeFileSync(fileA, "%PDF-1.4\n% file di prova\n");
writeFileSync(fileB, "ISO-10303-21;\nHEADER;\nENDSEC;\nEND-ISO-10303-21;\n");

const browser = await chromium.launch({ args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"] });
const failures = [];

for (const vp of VIEWPORTS) {
  for (const [locale, l] of Object.entries(L)) {
    const tag = `${locale}/${vp.name}`;
    const dir = join(OUT, locale, vp.name);
    mkdirSync(dir, { recursive: true });
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: vp.isMobile, hasTouch: vp.hasTouch, reducedMotion: "reduce", acceptDownloads: true });
    await context.addInitScript(() => sessionStorage.setItem("tl-intro-seen", "1"));
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const shot = (name, full = false) => page.screenshot({ path: join(dir, `${name}.png`), fullPage: full });

    try {
      // 0. Home
      await page.goto(BASE + l.home, { waitUntil: "load", timeout: 60000 });
      await page.evaluate(() => document.fonts.ready);
      await shot("0-home");

      // 1. Tabelle: tre tab
      await page.goto(BASE + l.tables, { waitUntil: "load", timeout: 60000 });
      const twistRows = await page.locator("table.data-table tbody tr").count();
      expect(twistRows === 14, `${tag}: 14 righe nella tabella twistabile (${twistRows})`);
      await shot("1-tabelle-twistabile", true);
      await page.getByRole("tab", { name: l.tabSeamless }).click();
      expect((await page.locator("table.data-table tbody tr").count()) === 14, `${tag}: 14 righe seamless`);
      await shot("1-tabelle-seamless", true);
      await page.getByRole("tab", { name: l.tabDims }).click();
      expect((await page.locator("table.data-table tbody tr").count()) === 12, `${tag}: 12 righe dimensioni`);
      await shot("1-tabelle-dimensioni", true);
      // la pagina non deve scorrere di lato
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow <= 1, `${tag}: nessuno scorrimento orizzontale della pagina (${overflow}px)`);

      // 2. "Configura" sulla riga WR-90 della twistabile
      await page.getByRole("tab", { name: "Twist" + (locale === "it" ? "abile" : "able") }).click();
      await page.locator('tr[data-wr="WR-90"] a').click();
      await page.waitForURL(/misura=WR-90/);
      await page.locator("[data-part-code]").waitFor();
      let code = (await page.locator("[data-part-code]").innerText()).trim();
      expect(code.startsWith("TLFX-100 · TWIST"), `${tag}: configuratore con WR-90 twistabile (${code})`);

      // 3. Lunghezza 1000 mm, poi flange: B = PDR100
      await page.getByRole("button", { name: "1000 mm", exact: true }).click();
      await page.getByRole("button", { name: l.next, exact: true }).click();
      await page.getByLabel(l.flangeB).selectOption("PDR100");
      code = (await page.locator("[data-part-code]").innerText()).trim();
      expect(code === "TLFX-100 · TWIST · L1000 · UBR100/PDR100", `${tag}: codice aggiornato (${code})`);
      await page.locator("figure .tech-drawing").scrollIntoViewIfNeeded();
      await shot("2-configuratore");

      // 4. Vista 3D
      await page.getByRole("button", { name: l.view3d }).click();
      await page.locator("figure canvas").waitFor({ timeout: 30000 });
      await page.waitForTimeout(800);
      await page.locator("figure canvas").scrollIntoViewIfNeeded();
      await shot("3-vista-3d");

      // 5. Download PDF e STL
      for (const [label, ext, check] of [
        [l.pdf, ".pdf", (b) => b.subarray(0, 5).toString() === "%PDF-"],
        [l.stl, ".stl", (b) => b.length > 84 && b.readUInt32LE(80) > 1000],
      ]) {
        const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 60000 }), page.getByRole("button", { name: label }).click()]);
        const name = dl.suggestedFilename();
        const buf = readFileSync(await dl.path());
        expect(name === `TLFX-100_TWIST_L1000_UBR100-PDR100${ext}`, `${tag}: nome file ${name}`);
        expect(check(buf), `${tag}: contenuto valido ${name} (${buf.length} byte)`);
      }

      // 6. Aggiungi alla richiesta (pulsante del riepilogo)
      await page.locator("aside").getByRole("button", { name: l.add }).click();
      await page.locator('[data-request-button]').waitFor();

      // 7. Secondo pezzo dai prodotti pronti: seamless WR-75
      await page.locator("#pronti").scrollIntoViewIfNeeded();
      await page.locator("#pronti label", { hasText: l.seamless }).click();
      await page.locator("#pronti select").selectOption("WR-75");
      await page.locator('[data-ready-item="seamless:WR-75"] button.btn-primary').click();
      await shot("4-prodotti-pronti");

      // 8. La tua richiesta: quantità, note, 2 file
      await page.goto(BASE + l.request, { waitUntil: "load" });
      await page.locator("[data-request-items] > li").first().waitFor();
      const count = await page.locator("[data-request-items] > li").count();
      expect(count === 2, `${tag}: 2 pezzi nella richiesta (${count})`);
      await page.getByRole("spinbutton", { name: `${l.quantityOf} TLFX-100 · TWIST · L1000 · UBR100/PDR100`, exact: true }).fill("4");
      await page.getByPlaceholder(l.notes).first().fill("Consegna entro novembre, imballo singolo.");
      await page.locator("[data-file-input]").setInputFiles([fileA, fileB]);
      expect((await page.locator("[data-file-list] li").count()) === 2, `${tag}: 2 file in elenco`);
      await page.getByLabel(l.company, { exact: false }).first().fill("Radiolink Srl");
      await page.getByLabel(l.name).fill("Marco Bassi");
      await page.getByLabel(l.email, { exact: false }).first().fill("acquisti@radiolink.example");
      await page.getByLabel(l.country).fill(l.country_v);
      await page.locator('form input[type="checkbox"]').check();
      await shot("5-richiesta", true);

      // 9a. Invio fallito (solo un giro): messaggio chiaro, dati conservati
      if (tag === "it/1440") {
        await page.route("**/api/quote", (route) => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ ok: false, error: "notConfigured" }) }));
        await page.getByRole("button", { name: l.submit }).click();
        await page.locator("[data-send-error]").waitFor({ timeout: 30000 });
        expect((await page.locator("[data-request-items] > li").count()) === 2, `${tag}: pezzi conservati dopo l'errore`);
        expect((await page.getByLabel(l.name).inputValue()) === "Marco Bassi", `${tag}: dati del cliente conservati`);
        await shot("5b-errore-invio");
        await page.unroute("**/api/quote");
      }

      // 9b. Invio simulato riuscito: controllo del contenuto della richiesta
      let posted = "";
      await page.route("**/api/quote", (route) => {
        posted = route.request().postDataBuffer()?.toString("latin1") ?? "";
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, number: MOCK_NUMBER }) });
      });
      await page.getByRole("button", { name: l.submit }).click();
      await page.waitForURL((u) => u.pathname === l.sent, { timeout: 30000 });
      const payload = JSON.parse(posted.match(/name="payload"\r\n\r\n(.*?)\r\n--/s)?.[1] ?? "{}");
      expect(payload.items?.length === 2, `${tag}: 2 pezzi inviati`);
      expect(payload.items[0].qty === 4 && payload.items[0].code.includes("L1000"), `${tag}: quantità e codice del primo pezzo`);
      expect((posted.match(/name="files"/g) ?? []).length === 2, `${tag}: 2 file allegati`);
      expect((posted.match(/name="drawings"/g) ?? []).length === 1, `${tag}: 1 disegno PDF generato`);
      expect(payload.customer?.company === "Radiolink Srl" && payload.privacy === true, `${tag}: dati cliente e consenso`);

      // 10. Conferma
      await page.locator("[data-request-number]").waitFor();
      const number = (await page.locator("[data-request-number]").innerText()).trim();
      expect(number === MOCK_NUMBER, `${tag}: numero richiesta (${number})`);
      await shot("6-conferma");

      expect(errors.length === 0, `${tag}: errori JS: ${errors.join(" | ")}`);
      console.log(`OK  ${tag}  ${code}`);
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
