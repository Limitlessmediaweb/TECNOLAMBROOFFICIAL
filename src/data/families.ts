import type { Locale } from "@/i18n/routing";
import type { PartType } from "./configurator/types";
import { WR_LIST } from "./waveguides";

/**
 * Famiglie di prodotto. Una famiglia nuova si aggiunge solo con dati (guida passo passo in
 * docs/aggiungere-prodotti.md): una voce qui, i testi in messages/*.json → products.items.<key>,
 * le foto in public/foto/prodotti/<key>/. Pagina, card, sitemap e richiesta si generano da sole.
 */
export type FamilyKey = "twistable" | "seamless" | "bends" | "twists" | "offsets" | "pending" | (string & {});

/** Tabella elettrica della famiglia in src/data/waveguides.ts */
export type FamilyTable = "twist" | "seamless";

/** Disegno della card e della pagina (components/domain/PartDrawings.tsx) */
export type DrawingKind = "flexible" | "bend" | "twist" | "offset";

export type Family = {
  key: FamilyKey;
  /** indirizzo della pagina per lingua; le lingue mancanti usano lo slug inglese */
  slug: Partial<Record<Locale, string>> & { it: string; en: string };
  /** tipo di pezzo nel configuratore (null = nessuno) */
  partType: PartType | null;
  /** true = non compare nel sito (segnaposto in attesa dei dati del titolare) */
  hidden: boolean;
  /** tabella elettrica, null = pezzi senza tabella */
  table: FamilyTable | null;
  drawing: DrawingKind;
  /** misure disponibili */
  sizes: readonly string[];
  /**
   * Modello 3D dimostrativo della pagina famiglia: di solito il tipo del configuratore (partType);
   * "straight" = tratto rigido con flange, per le famiglie senza configuratore; null = nessun 3D.
   * Se omesso vale partType.
   */
  model3d?: PartType | "straight" | null;
};

/** Modello 3D dimostrativo della famiglia (vedi Family.model3d) */
export function familyModel(f: Family): PartType | "straight" | null {
  return f.model3d === undefined ? f.partType : f.model3d;
}

export const FAMILIES: readonly Family[] = [
  { key: "twistable", slug: { it: "guida-flessibile-twistabile", en: "twistable-flexible-waveguide", es: "guia-de-ondas-flexible-torsionable", de: "flexibler-verdrehbarer-hohlleiter" }, partType: "twistable", hidden: false, table: "twist", drawing: "flexible", sizes: WR_LIST },
  { key: "seamless", slug: { it: "guida-flessibile-seamless", en: "seamless-flexible-waveguide", es: "guia-de-ondas-flexible-sin-costura", de: "nahtloser-flexibler-hohlleiter" }, partType: "seamless", hidden: false, table: "seamless", drawing: "flexible", sizes: WR_LIST },
  { key: "bends", slug: { it: "curve", en: "bends", es: "codos", de: "boegen" }, partType: "bend", hidden: false, table: null, drawing: "bend", sizes: WR_LIST },
  { key: "twists", slug: { it: "twist", en: "twists", es: "torsiones", de: "twists" }, partType: "twist", hidden: false, table: null, drawing: "twist", sizes: WR_LIST },
  { key: "offsets", slug: { it: "disassati", en: "offsets", es: "desplazamientos", de: "versatz" }, partType: "offset", hidden: false, table: null, drawing: "offset", sizes: WR_LIST },
  // [FAMIGLIA DA DEFINIRE]: il titolare la fornirà (data/pending.ts). Nascosta finché hidden = true.
  { key: "pending", slug: { it: "famiglia-da-definire", en: "family-to-be-defined" }, partType: null, hidden: true, table: null, drawing: "bend", sizes: [] },
] as const;

export const VISIBLE_FAMILIES = FAMILIES.filter((f) => !f.hidden);

export function familyByKey(key: string): Family | undefined {
  return VISIBLE_FAMILIES.find((f) => f.key === key);
}

/** Slug della famiglia nella lingua (ripiego sull'inglese) */
export function familySlug(f: Family, locale: string): string {
  return f.slug[locale as Locale] ?? f.slug.en;
}

export function familyBySlug(slug: string, locale: Locale): Family | undefined {
  return VISIBLE_FAMILIES.find((f) => familySlug(f, locale) === slug);
}

export function familyForType(type: PartType): Family | undefined {
  return VISIBLE_FAMILIES.find((f) => f.partType === type);
}

export function isFamilyKey(value: string): value is FamilyKey {
  return VISIBLE_FAMILIES.some((f) => f.key === value);
}
