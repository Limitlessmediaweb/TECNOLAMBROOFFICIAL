#!/usr/bin/env node
/**
 * Schede tecniche PDF A4, in tutte le lingue del sito, generate una volta (non a richiesta):
 *  - una per ogni misura WR: dati della misura, dati elettrici twistabile e seamless, dimensioni,
 *    lunghezze standard, flange, disegno, ISO 9001 · ISO 14001, contatti, QR verso la pagina della misura;
 *  - una per ogni famiglia visibile: descrizione, misure, dati (o disegno), QR verso la pagina della famiglia.
 * Le pagine sono HTML stampate da Chromium (Playwright): così il cinese usa i font di sistema.
 * Uscita: public/schede/<lingua>/wr-90.pdf, public/schede/<lingua>/<famiglia>.pdf (+ indice.json).
 * Uso: npm run datasheets   (da rilanciare quando cambiano dati o traduzioni, poi commit dei PDF)
 */
import { build } from "esbuild";
import { chromium } from "playwright";
import QRCode from "qrcode";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const OUT = join(ROOT, "public", "schede");
const TMP = join(ROOT, "test-output", "datasheets-data.mjs");
mkdirSync(join(ROOT, "test-output"), { recursive: true });
await build({
  entryPoints: [join(ROOT, "scripts", "datasheets", "entry.ts")],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: TMP,
  alias: { "@": join(ROOT, "src") },
  logLevel: "warning",
});
const D = await import(pathToFileURL(TMP).href);
const b64 = (p) => readFileSync(p).toString("base64");
const LOGO = `data:image/png;base64,${b64(join(ROOT, "public", "brand", "logo.png"))}`;
const FONT = `data:font/woff2;base64,${b64(join(ROOT, "src", "app", "fonts", "archivo-var-latin.woff2"))}`;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function tr(messages) {
  return (path, vars = {}) => {
    let v = path.split(".").reduce((o, k) => o?.[k], messages);
    if (typeof v !== "string") return path;
    for (const [k, x] of Object.entries(vars)) v = v.replaceAll(`{${k}}`, String(x));
    return v;
  };
}

const CSS = `
@font-face { font-family: Archivo; font-weight: 300 800; src: url(${FONT}) format("woff2"); }
@page { size: A4; margin: 14mm 14mm 16mm; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: Archivo, "PingFang SC", "Microsoft YaHei", "Noto Sans SC", Arial, sans-serif; color: #171e2c; font-size: 9pt; line-height: 1.35; }
header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1.5pt solid #0066cc; padding-bottom: 8pt; }
header img { width: 40mm; }
header .meta { text-align: right; font-size: 8pt; color: #495765; text-transform: uppercase; letter-spacing: .08em; }
h1 { font-size: 19pt; font-weight: 800; margin: 9pt 0 2pt; letter-spacing: -.01em; }
.sub { color: #495765; font-size: 9.5pt; }
h2 { font-size: 10.5pt; font-weight: 700; margin: 9pt 0 4pt; color: #0066cc; text-transform: uppercase; letter-spacing: .06em; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 14pt; }
table { width: 100%; border-collapse: collapse; font-size: 9pt; }
th, td { text-align: left; padding: 1.7pt 5pt; border-bottom: .6pt solid #ced7de; vertical-align: top; }
th { background: #e5ebf0; font-weight: 700; }
td.n, th.n { text-align: right; font-variant-numeric: tabular-nums; }
.kv td:first-child { color: #495765; width: 48%; }
.drawing { border: .6pt solid #ced7de; margin-top: 4pt; padding: 2mm 0; }
.drawing svg { width: 54%; height: auto; display: block; margin: 0 auto; }
.chips span { display: inline-block; border: .8pt solid #6e8191; border-radius: 99pt; padding: 1pt 7pt; margin: 0 3pt 3pt 0; font-size: 8.5pt; }
footer { position: fixed; bottom: 0; left: 0; right: 0; display: flex; justify-content: space-between; align-items: flex-end; gap: 12pt; border-top: .8pt solid #ced7de; padding-top: 6pt; font-size: 8pt; color: #495765; }
footer .cta { color: #0066cc; font-weight: 700; font-size: 9pt; }
footer .qr { text-align: center; font-size: 7pt; }
footer .qr svg { width: 20mm; height: 20mm; display: block; }
.iso { font-weight: 700; letter-spacing: .06em; color: #171e2c; }
.note { font-size: 7.5pt; color: #495765; margin-top: 4pt; }
.page-body { padding-bottom: 26mm; }
`;

function page({ locale, t, title, sub, body, url, qrLabel }) {
  return QRCode.toString(url, { type: "svg", margin: 0, color: { dark: "#171e2c", light: "#ffffff" } }).then(
    (qr) => `<!doctype html><html lang="${D.LOCALE_META[locale].hreflang}"><head><meta charset="utf-8"><style>${CSS}</style></head><body>
<header><img src="${LOGO}" alt="Tecnolambro"><div class="meta">${esc(t("tables.sheetTitle"))}<br>${esc(new Intl.DateTimeFormat(D.intlLocale(locale), { dateStyle: "long" }).format(new Date()))}</div></header>
<div class="page-body">
<h1>${esc(title)}</h1><p class="sub">${esc(sub)}</p>
${body}
</div>
<footer>
  <div>
    <div class="cta">${esc(t("tables.sheetFooter"))}</div>
    <div>${esc(D.COMPANY.legalName)} · ${esc(D.COMPANY.operationalAddress.street)}, ${esc(D.COMPANY.operationalAddress.postalCode)} ${esc(D.COMPANY.operationalAddress.city)} (${esc(D.COMPANY.operationalAddress.province)}) · ${esc(D.COMPANY.email)} · ${esc(D.COMPANY.phone)}</div>
    <div class="iso">ISO 9001:2015 · ISO 14001:2015</div>
  </div>
  <div class="qr">${qr}<div>${esc(qrLabel)}</div></div>
</footer>
</body></html>`,
  );
}

function drawing(locale, t, spec) {
  const flange = (f) => (f === "other" ? t("configurator.flangeOther") : f);
  const code = D.partReference(spec, { other: t("configurator.otherRef"), flexName: t("configurator.flexName.twistable"), customLabel: t("configurator.customRef") });
  return D.drawingSvg({
    spec,
    flangeA: flange(spec.f1),
    flangeB: flange(spec.f2),
    code,
    locale,
    palette: "print",
    labels: {
      side: t("configurator.sideView"), section: t("configurator.section"), note: t("configurator.drawingNote"), date: t("configurator.drawingDate"),
      scale: t("configurator.drawingScale"), material: t("configurator.drawingMaterial"), titleBlock: t("configurator.drawingTitleBlock"), dimsUnknown: t("configurator.dimsUnknown"),
      cw: t("configurator.dir.cw"), ccw: t("configurator.dir.ccw"), radiusStd: t("configurator.radiusStdShort"), planeE: t("configurator.plane.E"), planeH: t("configurator.plane.H"),
    },
    date: new Intl.DateTimeFormat(D.intlLocale(locale), { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date()),
  });
}

const absolute = (href, locale) => `${D.ENV.siteUrl}${D.getPathname({ href, locale })}`;

async function wrSheet(locale, t, size) {
  const n = (v, d = 0) => (v == null ? "—" : D.num(v, locale, d, d));
  const dim = D.DIM_BY_WR.get(size.wr);
  const tw = D.TWIST_TABLE.find((r) => r.wr === size.wr);
  const sm = D.SEAMLESS_TABLE.find((r) => r.wr === size.wr);
  const band = D.range(size.min, size.max, locale);
  const rows = [
    [t("wrPage.band"), `${band} GHz`],
    [t("wrPage.designations"), `${size.wr} · ${size.iec} · ${size.wg}`],
    [t("wrPage.inner"), `${n(size.a, 2)} × ${n(size.b, 2)} mm`],
    ...(dim
      ? [
          [t("wrPage.code"), dim.code],
          [t("wrPage.outer"), `${n(dim.A, 1)} × ${n(dim.B, 1)} mm`],
          [t("wrPage.root"), `${n(dim.C, 1)} × ${n(dim.D, 1)} mm`],
          [t("wrPage.pitch"), `${n(dim.P, 1)} mm`],
          [t("wrPage.tol"), `± ${n(dim.tol, 2)} mm`],
        ]
      : []),
    [t("wrPage.length"), `${D.standardLengths(size.wr).map((l) => n(l)).join(" · ")} mm`],
    [t("wrPage.material"), `${t("wrPage.brass")} ${D.MATERIAL}`],
  ];
  const kv = (list) => `<table class="kv">${list.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join("")}</table>`;
  const twist = tw
    ? kv([
        [t("wrPage.rl", { len: "300" }), `${n(tw.rl300, 1)} dB`],
        [t("wrPage.rl", { len: "600" }), `${n(tw.rl600, 1)} dB`],
        [t("wrPage.rl", { len: "1000" }), `${n(tw.rl1000, 1)} dB`],
        [t("wrPage.att"), `${n(tw.att, 2)} dB/m`],
        ...(tw.cw != null ? [[t("wrPage.cw"), `${n(tw.cw)} W`]] : []),
        ...(tw.peak != null ? [[t("wrPage.peak"), `${n(tw.peak)} kW`]] : []),
      ])
    : `<p>${esc(t("wrPage.onRequest"))}</p>`;
  const seam =
    sm && !D.isOnRequest(sm)
      ? kv([
          [t("wrPage.vswr600"), n(sm.vswr600, 2)],
          [t("wrPage.att"), `${n(sm.att, 2)} dB/m`],
          [t("wrPage.cw"), `${n(sm.cw)} W`],
          [t("wrPage.peak"), `${n(sm.peak)} kW`],
        ])
      : `<p>${esc(t("wrPage.onRequest"))}</p>`;
  const body = `
<div class="grid">
  <section><h2>${esc(t("wrPage.specsTitle"))}</h2>${kv(rows)}<p class="note">${esc(t("wrPage.innerNote"))}</p></section>
  <section>
    <h2>${esc(t("wrPage.electricalTitle"))} · ${esc(t("wrPage.twistable"))}</h2>${twist}
    <h2>${esc(t("wrPage.electricalTitle"))} · ${esc(t("wrPage.seamless"))}</h2>${seam}
    <h2>${esc(t("wrPage.flangesTitle"))}</h2><div class="chips">${D.flangesFor(size.wr).map((f) => `<span>${esc(f.label)}</span>`).join("")}</div>
  </section>
</div>
<h2>${esc(t("configurator.drawing"))}</h2>
<div class="drawing">${drawing(locale, t, { ...D.defaultSpec("twistable", size.wr), length: 600 })}</div>
<p class="note">${esc(t("wrPage.indicative"))}</p>`;
  const href = { pathname: "/prodotti/guida-flessibile/[wr]", params: { wr: D.wrSlug(size.wr) } };
  return page({ locale, t, title: t("wrPage.title", { wr: size.wr }), sub: t("wrPage.intro", { wr: size.wr, band, iec: size.iec, wg: size.wg }), body, url: absolute(href, locale), qrLabel: t("datasheet.qrSize") });
}

async function familySheet(locale, t, family) {
  const n = (v, d = 0) => (v == null ? "—" : D.num(v, locale, d, d));
  const name = t(`products.items.${family.key}.name`);
  let table = "";
  if (family.table === "twist") {
    table = `<table><tr><th>${esc(t("tables.size"))}</th><th>${esc(t("tables.freq"))}</th><th class="n">RL 300</th><th class="n">RL 600</th><th class="n">RL 1000</th><th class="n">${esc(t("tables.att"))}</th><th class="n">${esc(t("tables.cw"))}</th><th class="n">${esc(t("tables.peak"))}</th></tr>
${D.TWIST_TABLE.map((r) => { const s = D.SIZE_BY_WR.get(r.wr); return `<tr><td>${r.wr}</td><td>${D.range(s.min, s.max, locale)}</td><td class="n">${n(r.rl300, 1)}</td><td class="n">${n(r.rl600, 1)}</td><td class="n">${n(r.rl1000, 1)}</td><td class="n">${n(r.att, 2)}</td><td class="n">${n(r.cw)}</td><td class="n">${n(r.peak)}</td></tr>`; }).join("")}</table>`;
  } else if (family.table === "seamless") {
    table = `<table><tr><th>${esc(t("tables.size"))}</th><th>${esc(t("tables.freq"))}</th><th class="n">${esc(t("tables.vswr600"))}</th><th class="n">${esc(t("tables.att"))}</th><th class="n">${esc(t("tables.cw"))}</th><th class="n">${esc(t("tables.peak"))}</th></tr>
${D.SEAMLESS_TABLE.map((r) => { const s = D.SIZE_BY_WR.get(r.wr); return D.isOnRequest(r) ? `<tr><td>${r.wr}</td><td>${D.range(s.min, s.max, locale)}</td><td colspan="4">${esc(t("tables.onRequest"))}</td></tr>` : `<tr><td>${r.wr}</td><td>${D.range(s.min, s.max, locale)}</td><td class="n">${n(r.vswr600, 2)}</td><td class="n">${n(r.att, 2)}</td><td class="n">${n(r.cw)}</td><td class="n">${n(r.peak)}</td></tr>`; }).join("")}</table>`;
  } else {
    table = `<table><tr><th>${esc(t("tables.size"))}</th><th>${esc(t("tables.freq"))}</th><th>IEC</th><th>WG</th></tr>
${family.sizes.map((wr) => { const s = D.SIZE_BY_WR.get(wr); return `<tr><td>${wr}</td><td>${D.range(s.min, s.max, locale)}</td><td>${s.iec}</td><td>${s.wg}</td></tr>`; }).join("")}</table>`;
  }
  const apps = (() => {
    const raw = family.key && t(`products.items.${family.key}.applications`);
    return raw;
  })();
  const spec = family.partType ? { ...D.defaultSpec(family.partType, "WR-90"), ...(family.partType === "twistable" || family.partType === "seamless" ? { length: 600 } : {}) } : null;
  const body = `
<h2>${esc(family.table ? t("products.page.tableTitle") : t("datasheet.sizesTitle"))}</h2>${table}
${spec ? `<h2>${esc(t("configurator.drawing"))} · WR-90</h2><div class="drawing">${drawing(locale, t, spec)}</div>` : ""}
<p class="note">${esc(t("tables.indicative"))}</p>`;
  void apps;
  const href = { pathname: "/prodotti/[famiglia]", params: { famiglia: D.familySlug(family, locale) } };
  return page({ locale, t, title: name, sub: t(`products.items.${family.key}.description`), body, url: absolute(href, locale), qrLabel: t("datasheet.qrFamily") });
}

const browser = await chromium.launch();
const pg = await browser.newPage();
const index = {};
let count = 0;
for (const locale of D.LOCALES) {
  const messages = JSON.parse(readFileSync(join(ROOT, "messages", `${locale}.json`), "utf8"));
  const t = tr(messages);
  const dir = join(OUT, locale);
  mkdirSync(dir, { recursive: true });
  index[locale] = { sizes: [], families: [] };
  const jobs = [
    ...D.SIZES.map((s) => ({ file: `${D.wrSlug(s.wr)}.pdf`, html: () => wrSheet(locale, t, s), kind: "sizes", id: s.wr })),
    ...D.VISIBLE_FAMILIES.map((f) => ({ file: `${f.key}.pdf`, html: () => familySheet(locale, t, f), kind: "families", id: f.key })),
  ];
  for (const job of jobs) {
    await pg.setContent(await job.html(), { waitUntil: "load" });
    await pg.evaluate(() => document.fonts.ready);
    if (process.argv.includes("--preview") && ["zh/wr-90.pdf", "de/bends.pdf", "it/wr-90.pdf"].includes(`${locale}/${job.file}`)) {
      await pg.setViewportSize({ width: 794 - 106, height: 1123 - 113 });
      await pg.emulateMedia({ media: "print" });
      await pg.screenshot({ path: join(ROOT, "test-output", `scheda-${locale}-${job.file}.png`), fullPage: true });
      await pg.emulateMedia({ media: "screen" });
    }
    const pdf = await pg.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true });
    writeFileSync(join(dir, job.file), pdf);
    index[locale][job.kind].push(job.id);
    count++;
  }
  console.log(`${locale}: ${jobs.length} schede`);
}
writeFileSync(join(OUT, "indice.json"), JSON.stringify({ generated: new Date().toISOString(), ...index }, null, 2));
await browser.close();
console.log(`${count} schede in public/schede/`);
