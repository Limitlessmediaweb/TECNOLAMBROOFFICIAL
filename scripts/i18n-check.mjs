#!/usr/bin/env node
/**
 * Controllo delle traduzioni (npm run i18n:check). Riferimento: messages/it.json.
 * Per ogni lingua segnala:
 *  - chiavi mancanti o in più (anche lunghezza degli elenchi);
 *  - segnaposto {x} e tag <link> / <mail> diversi dall'italiano;
 *  - testi rimasti uguali all'italiano o con parole italiane (probabilmente non tradotti).
 * Quando il sito cambia, basta tradurre le chiavi segnalate.
 * Uscita 1 se ci sono chiavi mancanti o segnaposto sbagliati; gli avvisi "non tradotto" non bloccano
 * (usa --strict per farli bloccare).
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const DIR = join(process.cwd(), "messages");
const strict = process.argv.includes("--strict");
const base = JSON.parse(readFileSync(join(DIR, "it.json"), "utf8"));
const locales = readdirSync(DIR)
  .filter((f) => /^[a-z]{2}\.json$/.test(f) && f !== "it.json")
  .map((f) => f.slice(0, 2));

/** chiave → valore (gli elenchi diventano chiave[0], chiave[1]…) */
function flatten(obj, prefix = "", out = new Map()) {
  if (Array.isArray(obj)) obj.forEach((v, i) => flatten(v, `${prefix}[${i}]`, out));
  else if (obj && typeof obj === "object") for (const [k, v] of Object.entries(obj)) flatten(v, prefix ? `${prefix}.${k}` : k, out);
  else out.set(prefix, obj);
  return out;
}
const tokens = (s) => (typeof s === "string" ? (s.match(/\{\w+\}|<\/?\w+>/g) ?? []).sort().join(" ") : "");

// testi che restano uguali in tutte le lingue: sigle, codici, nomi, numeri
const SAME_OK = /^([\d\s.,:–\-+()/%°×·]*|[A-Z0-9][A-Z0-9 ·\-/.:()]*|.*(Tecnolambro|LIMITLESS|PJR|ISO \d|WR-|TLFX|UBR|@|https?:).*|FAQ|Cookie|Cookies|Radar|Broadcast|Twist|Twists|Email|E-mail|Partner|Shop|Online|Hub|Seamless|PDF|STEP|STL|GLB|DWG|DXF|IGES)$/;
// parole italiane che non dovrebbero comparire in altre lingue
const ITALIAN = /\b(della|delle|degli|dalla|nella|sono|anche|questa|questo|preventivo|richiesta|misura|guida d’onda|lunghezza|flangia|scegli|invia|grazie|perché|più|già)\b/i;

const itFlat = flatten(base);
let errors = 0;
let warnings = 0;
for (const loc of locales) {
  const data = JSON.parse(readFileSync(join(DIR, `${loc}.json`), "utf8"));
  const flat = flatten(data);
  const missing = [...itFlat.keys()].filter((k) => !flat.has(k));
  const extra = [...flat.keys()].filter((k) => !itFlat.has(k));
  const badTokens = [...itFlat.keys()].filter((k) => flat.has(k) && tokens(itFlat.get(k)) !== tokens(flat.get(k)));
  const untranslated =
    loc === "en"
      ? []
      : [...itFlat.keys()].filter((k) => {
          const v = flat.get(k);
          if (typeof v !== "string" || !v.trim()) return false;
          if (/(^|\.)legal\./.test(k) && /Garante|Via |Betulle|Spinedi/.test(v)) return false;
          // le parole brevi uguali all'italiano sono spesso giuste (es. "Banda", "Tipo" in spagnolo)
          return (v === itFlat.get(k) && !SAME_OK.test(v) && v.length > 24) || ITALIAN.test(v.replace(/Via [^,]+|San Colombano al Lambro|Miradolo Terme|Garante per la protezione dei dati personali|Tecnolambro S\.a\.s\.[^,]*/g, ""));
        });
  console.log(`\n${loc}: ${flat.size} testi`);
  for (const k of missing) console.log(`  ✗ manca: ${k}`);
  for (const k of extra) console.log(`  ! in più (non c'è in it.json): ${k}`);
  for (const k of badTokens) console.log(`  ✗ segnaposto diversi: ${k}  it=[${tokens(itFlat.get(k))}] ${loc}=[${tokens(flat.get(k))}]`);
  for (const k of untranslated) console.log(`  ? forse non tradotto: ${k} = ${JSON.stringify(flat.get(k)).slice(0, 80)}`);
  errors += missing.length + badTokens.length;
  warnings += untranslated.length + extra.length;
  if (!missing.length && !badTokens.length && !untranslated.length) console.log("  ✓ completo");
}
console.log(`\n${errors} errori, ${warnings} avvisi`);
process.exit(errors || (strict && warnings) ? 1 : 0);
