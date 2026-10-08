import { SIZES, SIZE_BY_WR } from "@/data/waveguides";

/** "WR-90" → "wr-90" (indirizzo della pagina della misura) */
export function wrSlug(wr: string): string {
  return wr.toLowerCase();
}

/** "wr-90" → "WR-90" se è una delle 14 misure, altrimenti null */
export function wrFromSlug(slug: string): string | null {
  const wr = slug.toUpperCase();
  return SIZE_BY_WR.has(wr) ? wr : null;
}

/** Misure vicine in frequenza (precedente = più bassa, successiva = più alta) */
export function neighbours(wr: string): { lower?: string; higher?: string } {
  const i = SIZES.findIndex((s) => s.wr === wr);
  // SIZES va dalla più alta in frequenza (WR-22) alla più bassa (WR-284)
  return { higher: SIZES[i - 1]?.wr, lower: SIZES[i + 1]?.wr };
}
