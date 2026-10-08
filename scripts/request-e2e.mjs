#!/usr/bin/env node
/**
 * Flusso completo della richiesta di preventivo, con l'API in modalità test (nessuna email vera).
 * Avvio del sito:  QUOTE_TEST_MODE=1 QUOTE_BCC_EMAIL=copia@example.test npx next start --port 3211
 * Poi:            BASE=http://localhost:3211 npm run test:request
 *
 * 1. "La tua richiesta": twistabile WR-90 L600 (×2) + curva E WR-75 90° (con note) + pezzo su disegno
 *    con 2 file (×3); cliente tedesco (dicitura reverse charge); invio → pagina "inviata";
 *    controllo di oggetto, intestazioni, allegati (PDF, GLB, file, richiesta.json) e anteprime HTML
 *    salvate in test-output/quote/<numero>/.
 * 2. Modulo breve (contatti): crea una richiesta "su disegno" valida.
 * 3. Invio fallito: messaggio chiaro, dati e pezzi conservati.
 * 4. Anti-spam: invio in meno di 3 secondi → successo finto, nessuna email.
 */
import { chromium } from "playwright";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE ?? "http://localhost:3211";
const ROOT = process.cwd();
const OUT = join(ROOT, "test-output", "quote");
const FIX = join(ROOT, "test-output", "fixtures");
mkdirSync(FIX, { recursive: true });

let failures = 0;
const check = (cond, msg) => {
  if (cond) console.log("  ✓", msg);
  else {
    failures++;
    console.error("  ✗", msg);
  }
};

// file di prova del cliente
const stepFile = join(FIX, "flangia-speciale.step");
const pdfFile = join(FIX, "disegno-cliente.pdf");
writeFileSync(stepFile, "ISO-10303-21;\nHEADER;\nFILE_DESCRIPTION(('test'),'2;1');\nENDSEC;\nDATA;\nENDSEC;\nEND-ISO-10303-21;\n");
writeFileSync(pdfFile, "%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");

const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

const folder = (number) => join(OUT, number);
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));

/* ------------------------------------------------------------- 1. richiesta completa */
console.log("\n1. La tua richiesta (3 pezzi)");
await page.goto(`${BASE}/shop?tipo=twistabile&wr=90&l=600&f1=UBR100&f2=PBR100#configura`, { waitUntil: "networkidle" });
await page.waitForFunction(() => document.querySelector("[data-part-code]")?.textContent?.includes("L600"));
await page.locator("[data-add-configured]").click();
await page.goto(`${BASE}/shop?tipo=curva&piano=E&wr=75&ang=90&l1=100&l2=100&f1=UBR120&f2=UBR120#configura`, { waitUntil: "networkidle" });
await page.waitForFunction(() => document.querySelector("[data-part-code]")?.textContent?.startsWith("CURVA-E · WR-75"));
await page.locator("[data-add-configured]").click();

await page.goto(`${BASE}/shop/richiesta`, { waitUntil: "networkidle" });
check((await page.locator("[data-request-item]").count()) === 2, "2 pezzi configurati in lista");
check((await page.locator("[data-notes]").first().inputValue()) === "", "note vuote all'inizio");
check((await page.locator("[data-notes]").first().getAttribute("placeholder"))?.startsWith("Es. pressurizzazione"), "segnaposto delle note");

// pezzo su disegno con 2 file
const custom = page.locator("#su-disegno");
await custom.locator("[data-custom-field=description]").fill("Curva piano H 45° con flange UG-39/U, uscita a 300 mm");
await custom.locator("[data-custom-field=wr]").selectOption("unknown");
await custom.locator("[data-custom-field=freq]").fill("9,4");
await custom.locator("[data-custom-field=qty]").fill("3");
await custom.locator("[data-custom-file-input]").setInputFiles([stepFile, pdfFile]);
await custom.locator("[data-add-custom]").click();
await page.waitForFunction(() => document.querySelectorAll("[data-request-item]").length === 3);
check(true, "pezzo su disegno aggiunto");
await page.waitForFunction(() => document.querySelector("[data-request-item=custom]")?.textContent?.includes("flangia-speciale.step"));
check(true, "file del pezzo su disegno mostrati");

// quantità e note diverse
await page.locator("[data-qty]").nth(0).fill("2");
await page.locator("[data-notes]").nth(1).fill("Pressurizzazione a 0,5 bar");

// cliente
await page.locator("input[name=company]").fill("Prova Mikrowellen GmbH");
await page.locator("input[name=name]").fill("Anna Prova");
await page.locator("input[name=email]").fill("anna@example.test");
await page.locator("input[name=phone]").fill("+49 30 1234567");
await page.locator("[data-country]").fill("Germania");
const vatLabel = await page.locator("label[for$=vat]").textContent();
check(vatLabel?.includes("reverse charge"), `dicitura P.IVA per paese UE: "${vatLabel?.trim()}"`);
await page.locator("[data-vat]").fill("DE123456789");
await page.locator("[data-privacy]").check();
check(await page.locator("[data-submit]").isVisible(), "riepilogo con invio fisso a destra (desktop)");
await page.waitForTimeout(3200);
await page.locator("[data-submit]").click();
await page.waitForURL(/\/shop\/richiesta\/inviata/, { timeout: 60000 });
const number = (await page.locator("[data-request-number]").textContent())?.trim() ?? "";
const ymd = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(new Date()).slice(2).replace(/-/g, "");
check(new RegExp(`^TL-${ymd}-[0-9]{4}$`).test(number), `numero richiesta ${number} (TL-AAMMGG-XXXX)`);
check((await page.locator("ol li").count()) === 3, "3 passi nella pagina inviata");
const [pdfDl] = await Promise.all([page.waitForEvent("download"), page.locator("[data-summary-pdf]").click()]);
const sumPath = join(folder(number), "riepilogo-scaricato.pdf");
mkdirSync(folder(number), { recursive: true });
await pdfDl.saveAs(sumPath);
check(readFileSync(sumPath).subarray(0, 5).toString() === "%PDF-", "riepilogo PDF scaricabile");
check(await page.locator('a[href^="https://wa.me/393755771084"]').count() > 0, "link WhatsApp nella pagina inviata");
check(await page.locator('a[href="tel:+393755771084"]').count() > 0, "telefono nella pagina inviata");

const office = readJson(join(folder(number), "ufficio.json"));
const client = readJson(join(folder(number), "cliente.json"));
console.log(`    oggetto: ${office.subject}`);
check(office.subject === `[Preventivo ${number}] Prova Mikrowellen GmbH · Germania · 6 pezzi`, "oggetto [Preventivo …] Azienda · Paese · n pezzi");
check(office.replyTo === "anna@example.test", "Reply-To = cliente");
check(office.bcc === "copia@example.test", "BCC da QUOTE_BCC_EMAIL");
check(office.to === "info@tecnolambro.it", "destinatario info@tecnolambro.it");
const names = office.attachments.map((a) => a.filename);
console.log(`    allegati ufficio: ${names.join(", ")}`);
check(names.filter((n) => n.endsWith(".pdf") && n !== "disegno-cliente.pdf").length === 2, "2 disegni PDF generati");
check(names.filter((n) => n.endsWith(".glb")).length === 2, "2 modelli GLB");
check(names.includes("flangia-speciale.step") && names.includes("disegno-cliente.pdf"), "2 file del cliente");
check(names.includes("richiesta.json"), "richiesta.json");
const record = readJson(join(folder(number), "ufficio-allegati", "richiesta.json"));
check(record.items.length === 3 && record.items[0].qty === 2 && record.items[2].qty === 3, "quantità nel payload (2, 1, 3)");
check(record.items[1].notes === "Pressurizzazione a 0,5 bar", "note del pezzo nel payload");
check(record.items[1].spec?.type === "bend" && record.items[1].spec?.plane === "E" && record.items[1].spec?.wr === "WR-75", "configurazione della curva nel payload");
check(record.items[2].files?.length === 2, "file associati al pezzo su disegno");
check(record.customer.countryCode === "DE" && record.locale === "it", "paese (DE) e lingua del sito");
check(record.meta?.page?.startsWith("/shop/richiesta"), "pagina di provenienza");
const html = readFileSync(join(folder(number), "ufficio.html"), "utf8");
check(html.includes("Rispondi al cliente") && html.includes("mailto:anna%40example.test"), "pulsante Rispondi al cliente");
check(html.includes("Lingua del sito") && html.includes("Provenienza"), "lingua e provenienza nell'email");
check(client.to === "anna@example.test" && client.attachments.length === 2 && client.attachments.every((a) => a.filename.endsWith(".pdf")), "email al cliente con i 2 disegni PDF");
const chtml = readFileSync(join(folder(number), "cliente.html"), "utf8");
check(chtml.includes("entro 24 ore lavorative") && chtml.includes("wa.me/393755771084") && chtml.includes("+39 375 577 1084"), "email al cliente: 24 ore, WhatsApp, cellulare");
check(!chtml.includes("Pressurizzazione"), "le note non vengono ripetute al cliente");
await page.goto(`${BASE}/shop/richiesta`, { waitUntil: "networkidle" });
check((await page.locator("[data-request-item]").count()) === 0, "richiesta svuotata dopo l'invio riuscito");

/* ------------------------------------------------------------- 2. modulo breve */
console.log("\n2. Modulo breve (contatti)");
await page.goto(`${BASE}/contatti`, { waitUntil: "networkidle" });
const form = page.locator("[data-short-form]");
check(await form.locator("[data-configure-link]").isVisible(), "link «Hai già una misura? Configura il pezzo →»");
await form.locator("input[name=name]").fill("Marco Prova");
await form.locator("input[name=email]").fill("marco@example.test");
await form.locator("textarea[name=message]").fill("Ci servono 4 twist WR-62 a 90° con flange UBR140.");
await form.locator("[data-short-file]").setInputFiles([pdfFile]);
await form.locator("input[type=checkbox]").check();
await page.waitForTimeout(3200);
await form.locator("button[type=submit]").click();
await page.waitForURL(/\/shop\/richiesta\/inviata/, { timeout: 30000 });
const n2 = (await page.locator("[data-request-number]").textContent())?.trim() ?? "";
const r2 = readJson(join(folder(n2), "ufficio-allegati", "richiesta.json"));
check(r2.source === "contact" && r2.items[0].code === "SU DISEGNO" && r2.message.includes("twist WR-62"), `richiesta su disegno ${n2} creata dal modulo breve`);
check(readJson(join(folder(n2), "ufficio.json")).attachments.some((a) => a.filename === "disegno-cliente.pdf"), "file allegato dal modulo breve");

/* ------------------------------------------------------------- 3. invio fallito */
console.log("\n3. Invio fallito");
await page.goto(`${BASE}/shop?tipo=twist&wr=90#configura`, { waitUntil: "networkidle" });
await page.locator("[data-add-configured]").click();
await page.goto(`${BASE}/shop/richiesta`, { waitUntil: "networkidle" });
await page.route("**/api/quote", (route) => route.fulfill({ status: 502, contentType: "application/json", body: JSON.stringify({ ok: false, error: "server" }) }));
for (const [sel, v] of [["input[name=company]", "Prova Srl"], ["input[name=name]", "Luca Prova"], ["input[name=email]", "luca@example.test"], ["[data-country]", "Italia"]]) await page.locator(sel).fill(v);
await page.locator("[data-privacy]").check();
await page.waitForTimeout(3200);
await page.locator("[data-submit]").click();
await page.locator("[data-send-error]:visible").first().waitFor({ timeout: 30000 });
const errText = await page.locator("[data-send-error]:visible").first().textContent();
check(errText?.includes("info@tecnolambro.it"), `messaggio d'errore con il link a info@: "${errText?.trim().slice(0, 80)}…"`);
check((await page.locator("[data-request-item]").count()) === 1, "pezzi conservati dopo l'errore");
check((await page.locator("input[name=company]").inputValue()) === "Prova Srl", "dati del cliente conservati");
await page.unroute("**/api/quote");

/* ------------------------------------------------------------- 4. anti-spam */
console.log("\n4. Anti-spam");
const before = existsSync(OUT) ? readdirSync(OUT).length : 0;
const res = await page.evaluate(async () => {
  const body = new FormData();
  body.append("payload", JSON.stringify({ source: "contact", locale: "it", items: [{ kind: "contact", code: "SU DISEGNO", qty: 1, notes: "" }], customer: { name: "Bot", email: "bot@example.test", company: "", country: "" }, message: "spam spam spam spam", privacy: true, elapsedMs: 400 }));
  const r = await fetch("/api/quote", { method: "POST", body });
  return r.json();
});
check(res.ok === true && readdirSync(OUT).length === before, "invio in meno di 3 s: risposta ok, nessuna email");

check(!errors.some((e) => !/Failed to load resource/.test(e)), `nessun errore JavaScript${errors.length ? `: ${errors.join(" | ")}` : ""}`);
await browser.close();
console.log(failures ? `\n${failures} controlli falliti` : "\nTutti i controlli superati");
process.exit(failures ? 1 : 0);
