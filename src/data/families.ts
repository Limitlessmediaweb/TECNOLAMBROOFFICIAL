import type { Locale } from "@/i18n/routing";
import type { PartType } from "./configurator/types";
import { WR_LIST } from "./waveguides";

/**
 * Famiglie di prodotto. Per aggiungerne una: una voce qui, i testi in messages/*.json →
 * products.items.<key>, e (se serve) un tipo nel configuratore (data/configurator/types.ts).
 * Le pagine si generano da sole.
 */
export type FamilyKey = "twistable" | "seamless" | "bends" | "twists" | "offsets" | "pending";

/** Tabella elettrica della famiglia in src/data/waveguides.ts */
export type FamilyTable = "twist" | "seamless";

/** Disegno della card e della pagina (components/domain/PartDrawings.tsx) */
export type DrawingKind = "flexible" | "bend" | "twist" | "offset";

export type Family = {
  key: FamilyKey;
  slug: Record<Locale, string>;
  /** tipo di pezzo nel configuratore (null = nessuno) */
  partType: PartType | null;
  /** true = non compare nel sito (segnaposto in attesa dei dati del titolare) */
  hidden: boolean;
  /** tabella elettrica, null = pezzi senza tabella */
  table: FamilyTable | null;
  drawing: DrawingKind;
  /** misure disponibili */
  sizes: readonly string[];
};

export const FAMILIES: readonly Family[] = [
  { key: "twistable", slug: { it: "guida-flessibile-twistabile", en: "twistable-flexible-waveguide" }, partType: "twistable", hidden: false, table: "twist", drawing: "flexible", sizes: WR_LIST },
  { key: "seamless", slug: { it: "guida-flessibile-seamless", en: "seamless-flexible-waveguide" }, partType: "seamless", hidden: false, table: "seamless", drawing: "flexible", sizes: WR_LIST },
  { key: "bends", slug: { it: "curve", en: "bends" }, partType: "bend", hidden: false, table: null, drawing: "bend", sizes: WR_LIST },
  { key: "twists", slug: { it: "twist", en: "twists" }, partType: "twist", hidden: false, table: null, drawing: "twist", sizes: WR_LIST },
  { key: "offsets", slug: { it: "disassati", en: "offsets" }, partType: "offset", hidden: false, table: null, drawing: "offset", sizes: WR_LIST },
  // [FAMIGLIA DA DEFINIRE]: il titolare la fornirà (data/pending.ts). Nascosta finché hidden = true.
  { key: "pending", slug: { it: "famiglia-da-definire", en: "family-to-be-defined" }, partType: null, hidden: true, table: null, drawing: "bend", sizes: [] },
] as const;

export const VISIBLE_FAMILIES = FAMILIES.filter((f) => !f.hidden);

export function familyByKey(key: string): Family | undefined {
  return VISIBLE_FAMILIES.find((f) => f.key === key);
}

export function familyBySlug(slug: string, locale: Locale): Family | undefined {
  return VISIBLE_FAMILIES.find((f) => f.slug[locale] === slug);
}

export function familyForType(type: PartType): Family | undefined {
  return VISIBLE_FAMILIES.find((f) => f.partType === type);
}

export function isFamilyKey(value: string): value is FamilyKey {
  return VISIBLE_FAMILIES.some((f) => f.key === value);
}
