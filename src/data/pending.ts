import type { Locale } from "@/i18n/routing";

/**
 * Dati che il titolare deve ancora fornire. Finché un valore è `null`:
 *  - il blocco corrispondente NON si vede (nessun buco nel layout);
 *  - con NEXT_PUBLIC_DEMO=true compare un badge giallo "manca: …" (solo anteprima).
 * Le foto si attivano da sole quando i file compaiono nelle cartelle di public/foto/ (vedi data/photos.ts).
 */
export const PENDING = {
  /** Citazione di Marco Pasquini per "Chi guida Tecnolambro". Non inventarla. */
  ownerQuote: null as (Partial<Record<Locale, string>> & { it: string; en: string }) | null,
  /** Quarta famiglia di prodotto (oggi hidden: true in data/families.ts) */
  pendingFamily: null as { name: Partial<Record<Locale, string>> & { it: string; en: string } } | null,
  /** Foto reali: prodotti, officina, titolare (si leggono dalle cartelle, qui solo il promemoria) */
  photos: null as null | true,
};

/** Etichette dei dati mancanti, per i badge in anteprima. */
/** Solo anteprima (NEXT_PUBLIC_DEMO=true): le lingue senza voce usano l'inglese, vedi pick() */
export const PENDING_LABELS: Record<string, Partial<Record<Locale, string>> & { it: string; en: string }> = {
  ownerQuote: { it: "citazione del titolare", en: "owner quote" },
  ownerPhoto: { it: "foto di Marco Pasquini", en: "photo of Marco Pasquini" },
  workshopPhotos: { it: "foto dell'officina", en: "workshop photos" },
  productPhotos: { it: "foto dei prodotti", en: "product photos" },
  certPdf: { it: "PDF dell'attestato", en: "certificate PDF" },
  pendingFamily: { it: "quarta famiglia di prodotto", en: "fourth product family" },
};
