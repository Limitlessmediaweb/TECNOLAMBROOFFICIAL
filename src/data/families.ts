import type { Locale } from "@/i18n/routing";
import { WR_LIST } from "./waveguides";

/**
 * Famiglie di prodotto. Per aggiungerne una: una voce qui, i testi in messages/*.json →
 * products.items.<key>, e (se serve) un disegno in PartDrawings. Le pagine si generano da sole.
 */
export type FamilyKey = "twistable" | "seamless" | "bends" | "pending";

/** Tabella elettrica della famiglia in src/data/waveguides.ts */
export type FamilyTable = "twist" | "seamless";

export type Family = {
  key: FamilyKey;
  slug: Record<Locale, string>;
  /** true = si compone nel configuratore (tipo → misura → lunghezza → flange) */
  configurable: boolean;
  /** true = non compare nel sito (segnaposto in attesa dei dati del titolare) */
  hidden: boolean;
  /** tabella elettrica, null = pezzi su richiesta/disegno senza tabella */
  table: FamilyTable | null;
  /** disegno della card e della pagina */
  drawing: "flexible" | "bends";
  /** sigla nel codice generato del pezzo, es. "TLFX-100 · TWIST · L600" */
  codeTag?: string;
  /** misure disponibili (dalle tabelle) */
  sizes: readonly string[];
};

export const FAMILIES: readonly Family[] = [
  {
    key: "twistable",
    slug: { it: "guida-flessibile-twistabile", en: "twistable-flexible-waveguide" },
    configurable: true,
    hidden: false,
    table: "twist",
    drawing: "flexible",
    codeTag: "TWIST",
    sizes: WR_LIST,
  },
  {
    key: "seamless",
    slug: { it: "guida-flessibile-seamless", en: "seamless-flexible-waveguide" },
    configurable: true,
    hidden: false,
    table: "seamless",
    drawing: "flexible",
    codeTag: "SEAMLESS",
    sizes: WR_LIST,
  },
  {
    key: "bends",
    slug: { it: "curve-twist-disassati", en: "bends-twists-offsets" },
    configurable: false,
    hidden: false,
    table: null,
    drawing: "bends",
    sizes: [],
  },
  {
    // [FAMIGLIA DA DEFINIRE]: il titolare la fornirà nei prossimi giorni. Nascosta finché hidden = true.
    key: "pending",
    slug: { it: "famiglia-da-definire", en: "family-to-be-defined" },
    configurable: false,
    hidden: true,
    table: null,
    drawing: "bends",
    sizes: [],
  },
] as const;

export const VISIBLE_FAMILIES = FAMILIES.filter((f) => !f.hidden);
export const CONFIGURABLE_FAMILIES = VISIBLE_FAMILIES.filter((f) => f.configurable);

export function familyByKey(key: string): Family | undefined {
  return VISIBLE_FAMILIES.find((f) => f.key === key);
}

export function familyBySlug(slug: string, locale: Locale): Family | undefined {
  return VISIBLE_FAMILIES.find((f) => f.slug[locale] === slug);
}

export function isFamilyKey(value: string): value is FamilyKey {
  return VISIBLE_FAMILIES.some((f) => f.key === value);
}

/**
 * Pezzi "pronti" del catalogo: misura per misura delle famiglie configurabili.
 * `inStock` = badge "Disponibile a magazzino · spedizione in 48 ore": lo decide l'azienda,
 * di default nessuna misura lo mostra. Esempio: STOCK.add("twistable:WR-90").
 */
export const STOCK: ReadonlySet<string> = new Set<string>([]);

export function inStock(family: FamilyKey, wr: string): boolean {
  return STOCK.has(`${family}:${wr}`);
}
