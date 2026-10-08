import type { Locale } from "@/i18n/routing";

/**
 * Foto reali (in arrivo). Cartelle:
 *   public/foto/prodotti/<famiglia>/   twistable, seamless, bends, twists, offsets
 *   public/foto/officina/              es. lavorazione-1.jpg, collaudo-1.jpg, magazzino-1.jpg
 *   public/foto/persone/marco-pasquini.jpg
 * I blocchi compaiono quando i file ci sono. Testi alternativi: qui per nome di file; se manca,
 * se ne genera uno descrittivo dal contesto (famiglia o reparto dell'officina).
 */
export const PHOTO_DIRS = {
  products: (family: string) => `foto/prodotti/${family}`,
  workshop: "foto/officina",
  people: "foto/persone",
} as const;

export const OWNER_PHOTO = ["foto/persone/marco-pasquini.jpg", "foto/persone/marco-pasquini.webp"] as const;

/** Testi alternativi specifici (chiave = percorso pubblico, es. "/foto/officina/collaudo-1.jpg"). */
export const PHOTO_ALTS: Record<string, Record<Locale, string>> = {};

/** Reparti dell'officina riconosciuti dal nome del file. */
export const WORKSHOP_AREAS = ["lavorazione", "collaudo", "magazzino"] as const;
export type WorkshopArea = (typeof WORKSHOP_AREAS)[number];

export function workshopArea(path: string): WorkshopArea | null {
  const name = path.toLowerCase();
  return WORKSHOP_AREAS.find((a) => name.includes(a)) ?? null;
}
