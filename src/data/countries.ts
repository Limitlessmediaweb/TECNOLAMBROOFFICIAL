import { intlLocale } from "@/i18n/locales";
/**
 * Paesi per la richiesta di preventivo: codici ISO 3166-1, nomi nella lingua del sito
 * (Intl.DisplayNames). Italia per prima, poi in ordine alfabetico.
 */
const CODES =
  "AD AE AF AG AI AL AM AO AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GT GU GW GY HK HN HR HT HU ID IE IL IM IN IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG US UY UZ VA VC VE VG VI VN VU WF WS XK YE YT ZA ZM ZW".split(
    " ",
  );

/** Stati membri dell'Unione europea (fatturazione in reverse charge per i clienti con partita IVA) */
export const EU = new Set(["AT", "BE", "BG", "CY", "CZ", "DE", "DK", "EE", "ES", "FI", "FR", "GR", "HR", "HU", "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PL", "PT", "RO", "SE", "SI", "SK"]);

export type Country = { code: string; name: string };

const cache = new Map<string, Country[]>();

export function countries(locale: string): Country[] {
  const hit = cache.get(locale);
  if (hit) return hit;
  let names: Intl.DisplayNames | null = null;
  try {
    names = new Intl.DisplayNames([intlLocale(locale)], { type: "region" });
  } catch {
    names = null;
  }
  const all = CODES.map((code) => ({ code, name: names?.of(code) ?? code }));
  const collator = new Intl.Collator(locale);
  const list = [all.find((c) => c.code === "IT")!, ...all.filter((c) => c.code !== "IT").sort((a, b) => collator.compare(a.name, b.name))];
  cache.set(locale, list);
  return list;
}

/** Codice del paese dal nome scritto (senza differenze di maiuscole e accenti). */
export function countryCode(name: string, locale: string): string | undefined {
  const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").trim().toLowerCase();
  const n = norm(name);
  if (!n) return undefined;
  return countries(locale).find((c) => norm(c.name) === n || c.code.toLowerCase() === n)?.code;
}
