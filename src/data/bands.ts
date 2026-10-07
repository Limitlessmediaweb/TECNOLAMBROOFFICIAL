/**
 * Bande standard delle guide d'onda rettangolari (EIA WR / IEC 60153 "R").
 * Dati standard di settore, non dati Tecnolambro: frequenze di lavoro raccomandate
 * per il modo TE10 e dimensioni interne nominali a × b.
 */
export type Band = {
  /** Designazione EIA, es. "WR-90" */
  wr: string;
  /** Designazione IEC 60153-2, es. "R100" */
  iec: string;
  /** Frequenza minima di lavoro in GHz */
  min: number;
  /** Frequenza massima di lavoro in GHz */
  max: number;
  /** Lato largo interno in mm */
  a: number;
  /** Lato stretto interno in mm */
  b: number;
};

export const BANDS: readonly Band[] = [
  { wr: "WR-229", iec: "R40", min: 3.3, max: 4.9, a: 58.17, b: 29.08 },
  { wr: "WR-159", iec: "R58", min: 4.9, max: 7.05, a: 40.39, b: 20.19 },
  { wr: "WR-137", iec: "R70", min: 5.85, max: 8.2, a: 34.85, b: 15.8 },
  { wr: "WR-112", iec: "R84", min: 7.05, max: 10, a: 28.5, b: 12.62 },
  { wr: "WR-90", iec: "R100", min: 8.2, max: 12.4, a: 22.86, b: 10.16 },
  { wr: "WR-75", iec: "R120", min: 10, max: 15, a: 19.05, b: 9.53 },
  { wr: "WR-62", iec: "R140", min: 12.4, max: 18, a: 15.8, b: 7.9 },
  { wr: "WR-51", iec: "R180", min: 15, max: 22, a: 12.95, b: 6.48 },
  { wr: "WR-42", iec: "R220", min: 18, max: 26.5, a: 10.67, b: 4.32 },
  { wr: "WR-28", iec: "R320", min: 26.5, max: 40, a: 7.11, b: 3.56 },
] as const;

export const BAND_RANGE = { min: 3, max: 40 } as const;

/** Frequenza di taglio del modo TE10 in GHz: fc = c / 2a */
export function cutoffGHz(band: Band): number {
  return 299.792458 / (2 * band.a);
}

/** Tutte le misure che coprono la frequenza data (le bande WR si sovrappongono). */
export function bandsFor(ghz: number): Band[] {
  return BANDS.filter((b) => ghz >= b.min && ghz <= b.max);
}

/** Formatta un numero con la virgola decimale per l'italiano, il punto per l'inglese. */
export function formatGHz(value: number, locale: string, digits = 2): string {
  return new Intl.NumberFormat(locale === "it" ? "it-IT" : "en-GB", {
    maximumFractionDigits: digits,
  }).format(value);
}

/** "8,2-12,4 GHz" / "8.2-12.4 GHz" */
export function formatRange(band: Band, locale: string): string {
  return `${formatGHz(band.min, locale)}-${formatGHz(band.max, locale)} GHz`;
}

export const WR_OPTIONS = BANDS.map((b) => b.wr);
