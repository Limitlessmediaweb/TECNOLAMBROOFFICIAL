/**
 * Tabelle tecniche ufficiali Tecnolambro della guida d'onda flessibile.
 *
 * DA VERIFICARE CON L'UFFICIO TECNICO TECNOLAMBRO: i valori sono stati trascritti a mano da
 * un'immagine a bassa risoluzione delle tabelle originali (riunione del 7 ottobre 2026).
 * Ogni numero va confrontato con la scheda tecnica ufficiale prima del lancio.
 *
 * Le dimensioni interne a × b delle guide sono invece valori standard EIA (non dati Tecnolambro):
 * servono alla ricerca per frequenza (taglio del modo TE10).
 */

export type Size = {
  /** Designazione EIA, es. "WR-90" */
  wr: string;
  /** Designazione IEC 60153-2, es. "R100" */
  iec: string;
  /** Designazione britannica DEF, es. "WG16" */
  wg: string;
  /** Banda di lavoro in GHz (tabella 1) */
  min: number;
  max: number;
  /** Lato largo / stretto interni standard EIA, mm */
  a: number;
  b: number;
};

/** Le 14 misure delle tabelle, dalla più alta in frequenza (WR-22) alla più bassa (WR-284). */
export const SIZES: readonly Size[] = [
  { wr: "WR-22", iec: "R400", wg: "WG23", min: 33.0, max: 50.1, a: 5.69, b: 2.84 },
  { wr: "WR-28", iec: "R320", wg: "WG22", min: 26.4, max: 40.1, a: 7.11, b: 3.56 },
  { wr: "WR-34", iec: "R260", wg: "WG21", min: 21.7, max: 33.0, a: 8.64, b: 4.32 },
  { wr: "WR-42", iec: "R220", wg: "WG20", min: 17.6, max: 26.7, a: 10.67, b: 4.32 },
  { wr: "WR-51", iec: "R180", wg: "WG19", min: 14.5, max: 22.0, a: 12.95, b: 6.48 },
  { wr: "WR-62", iec: "R140", wg: "WG18", min: 11.9, max: 18.0, a: 15.8, b: 7.9 },
  { wr: "WR-75", iec: "R120", wg: "WG17", min: 9.84, max: 15.0, a: 19.05, b: 9.53 },
  { wr: "WR-90", iec: "R100", wg: "WG16", min: 8.2, max: 12.5, a: 22.86, b: 10.16 },
  { wr: "WR-112", iec: "R84", wg: "WG15", min: 6.58, max: 10.0, a: 28.5, b: 12.62 },
  { wr: "WR-137", iec: "R70", wg: "WG14", min: 5.38, max: 8.18, a: 34.85, b: 15.8 },
  { wr: "WR-159", iec: "R58", wg: "WG13", min: 4.64, max: 7.05, a: 40.39, b: 20.19 },
  { wr: "WR-187", iec: "R48", wg: "WG12", min: 3.94, max: 5.99, a: 47.55, b: 22.15 },
  { wr: "WR-229", iec: "R40", wg: "WG11A", min: 3.22, max: 4.9, a: 58.17, b: 29.08 },
  { wr: "WR-284", iec: "R32", wg: "WG10", min: 2.6, max: 3.95, a: 72.14, b: 34.04 },
] as const;

export const SIZE_BY_WR: ReadonlyMap<string, Size> = new Map(SIZES.map((s) => [s.wr, s]));
export const WR_LIST = SIZES.map((s) => s.wr);

/** "WR-90 · R100 · WG16" */
export function sizeLabel(s: Size): string {
  return `${s.wr} · ${s.iec} · ${s.wg}`;
}

/** Numero IEC senza la R (100 per R100): usato nei codici TLFX e nelle flange. */
export function iecNumber(s: Size): string {
  return s.iec.slice(1);
}

/** Tabella 1 — Guida d'onda flessibile TWISTABILE, caratteristiche elettriche. */
export type TwistRow = {
  wr: string;
  /** Return loss in dB per lunghezza 300 / 600 / 1000 mm */
  rl300: number;
  rl600: number;
  rl1000: number;
  /** Attenuazione dB/m */
  att: number;
  /** Potenza CW in W, potenza di picco in kW (null = non indicata) */
  cw: number | null;
  peak: number | null;
};

export const TWIST_TABLE: readonly TwistRow[] = [
  { wr: "WR-22", rl300: 19.5, rl600: 18.5, rl1000: 17.5, att: 2.3, cw: null, peak: null },
  { wr: "WR-28", rl300: 21.0, rl600: 19.7, rl1000: 18.8, att: 2.1, cw: 75, peak: 20 },
  { wr: "WR-34", rl300: 21.7, rl600: 20.8, rl1000: 19.4, att: 1.5, cw: 85, peak: 32 },
  { wr: "WR-42", rl300: 23.0, rl600: 22.1, rl1000: 20.1, att: 1.2, cw: 100, peak: 42 },
  { wr: "WR-51", rl300: 24.9, rl600: 23.7, rl1000: 23.1, att: 1.1, cw: 200, peak: 85 },
  { wr: "WR-62", rl300: 27.3, rl600: 25.7, rl1000: 24.3, att: 0.9, cw: 400, peak: 115 },
  { wr: "WR-75", rl300: 27.3, rl600: 25.7, rl1000: 24.9, att: 0.55, cw: 750, peak: 120 },
  { wr: "WR-90", rl300: 28.3, rl600: 26.4, rl1000: 25.7, att: 0.42, cw: 1000, peak: 210 },
  { wr: "WR-112", rl300: 28.3, rl600: 26.4, rl1000: 25.7, att: 0.36, cw: 1500, peak: 320 },
  { wr: "WR-137", rl300: 29.4, rl600: 27.3, rl1000: 26.4, att: 0.3, cw: 2000, peak: 550 },
  { wr: "WR-159", rl300: 29.4, rl600: 27.3, rl1000: 26.4, att: 0.22, cw: 2500, peak: 620 },
  { wr: "WR-187", rl300: 29.4, rl600: 27.3, rl1000: 26.4, att: 0.17, cw: 3000, peak: 1250 },
  { wr: "WR-229", rl300: 30.7, rl600: 29.4, rl1000: 28.3, att: 0.14, cw: 4000, peak: 1550 },
  { wr: "WR-284", rl300: 30.7, rl600: 29.4, rl1000: 28.3, att: 0.12, cw: 4000, peak: 2000 },
] as const;

/** Tabella 2 — Guida d'onda flessibile SEAMLESS. `null` su tutti i valori = "su richiesta". */
export type SeamlessRow = {
  wr: string;
  /** VSWR per lunghezza 600 mm */
  vswr600: number | null;
  att: number | null;
  cw: number | null;
  peak: number | null;
};

export const SEAMLESS_TABLE: readonly SeamlessRow[] = [
  { wr: "WR-22", vswr600: 1.35, att: 1.2, cw: 200, peak: 10 },
  { wr: "WR-28", vswr600: 1.2, att: 1.6, cw: 600, peak: 20 },
  { wr: "WR-34", vswr600: null, att: null, cw: null, peak: null },
  { wr: "WR-42", vswr600: 1.12, att: 0.9, cw: 800, peak: 40 },
  { wr: "WR-51", vswr600: 1.08, att: 0.6, cw: 1000, peak: 70 },
  { wr: "WR-62", vswr600: 1.06, att: 0.45, cw: 1500, peak: 100 },
  { wr: "WR-75", vswr600: 1.06, att: 0.4, cw: 2000, peak: 140 },
  { wr: "WR-90", vswr600: 1.07, att: 0.3, cw: 3000, peak: 180 },
  { wr: "WR-112", vswr600: 1.07, att: 0.25, cw: 4000, peak: 300 },
  { wr: "WR-137", vswr600: 1.07, att: 0.2, cw: 5000, peak: 500 },
  { wr: "WR-159", vswr600: null, att: null, cw: null, peak: null },
  { wr: "WR-187", vswr600: 1.08, att: 0.19, cw: 6500, peak: 1300 },
  { wr: "WR-229", vswr600: 1.09, att: 0.18, cw: 8000, peak: 1500 },
  { wr: "WR-284", vswr600: 1.07, att: 0.15, cw: 10000, peak: 2000 },
] as const;

export function isOnRequest(row: SeamlessRow): boolean {
  return row.vswr600 === null && row.att === null && row.cw === null && row.peak === null;
}

/**
 * Tabella 3 — Dimensioni della guida flessibile (codici TLFX), ottone OT 80 UNI 4897.
 * A × B: ingombro esterno dell'ondulazione · C × D: fondo dell'ondulazione · P: passo
 * r / R: raggi interno ed esterno degli spigoli. `null` = non indicato (TLFX-180).
 * `note` segnala le righe con note a piè di tabella (asterischi della tabella originale).
 */
export type DimRow = {
  code: string;
  wr: string;
  A: number | null;
  B: number | null;
  C: number | null;
  D: number | null;
  P: number | null;
  r: number | null;
  R: number | null;
  /** tolleranza ± in mm */
  tol: number;
  min: number;
  max: number;
  /** attenuazione dB/m */
  att: number;
  vswr: number;
  /** note della tabella originale: "*" codice, "**" attenuazione, "***" VSWR */
  notes?: { code?: true; att?: true; vswr?: true };
};

export const DIM_TABLE: readonly DimRow[] = [
  { code: "TLFX-32", wr: "WR-284", A: 79.9, B: 39.2, C: 73.5, D: 33.1, P: 3.3, r: 4, R: 7, tol: 0.3, min: 2.6, max: 3.95, att: 0.15, vswr: 1.07 },
  { code: "TLFX-40", wr: "WR-229", A: 64.8, B: 34, C: 59.5, D: 28.5, P: 3.2, r: 4, R: 7, tol: 0.3, min: 3.2, max: 4.9, att: 0.18, vswr: 1.09 },
  { code: "TLFX-48", wr: "WR-187", A: 54.4, B: 26.7, C: 48, D: 20.4, P: 2.5, r: 3.2, R: 7, tol: 0.25, min: 3.94, max: 5.99, att: 0.19, vswr: 1.08 },
  { code: "TLFX-70", wr: "WR-137", A: 40, B: 20, C: 35.4, D: 15.1, P: 2.5, r: 3.5, R: 6, tol: 0.2, min: 5.8, max: 8.5, att: 0.2, vswr: 1.07 },
  { code: "TLFX-84", wr: "WR-112", A: 34, B: 16.7, C: 30.4, D: 12.1, P: 2.1, r: 3.5, R: 5.5, tol: 0.2, min: 7.0, max: 10, att: 0.25, vswr: 1.07 },
  { code: "TLFX-100", wr: "WR-90", A: 27.9, B: 13.8, C: 23.9, D: 9.4, P: 2, r: 3, R: 5, tol: 0.2, min: 8.2, max: 12.4, att: 0.3, vswr: 1.07 },
  { code: "TLFX-120", wr: "WR-75", A: 22.7, B: 12.2, C: 20, D: 9.4, P: 1.3, r: 2.75, R: 4, tol: 0.15, min: 10.0, max: 15.0, att: 0.4, vswr: 1.06 },
  { code: "TLFX-140", wr: "WR-62", A: 19.2, B: 10.3, C: 16.5, D: 7.4, P: 1.3, r: 2, R: 3.9, tol: 0.15, min: 12.4, max: 18.0, att: 0.45, vswr: 1.06 },
  { code: "TLFX-180", wr: "WR-51", A: null, B: null, C: null, D: null, P: null, r: null, R: null, tol: 0.15, min: 15.0, max: 22.0, att: 0.6, vswr: 1.08 },
  { code: "TLFX-220", wr: "WR-42", A: 13.4, B: 6.8, C: 11, D: 4, P: 1.2, r: 1.25, R: 3, tol: 0.15, min: 18.0, max: 26.5, att: 0.9, vswr: 1.12 },
  { code: "TLFX-320", wr: "WR-28", A: 9.6, B: 5.8, C: 7.6, D: 3.5, P: 1.2, r: 1.25, R: 2.5, tol: 0.15, min: 26.5, max: 40.0, att: 1.6, vswr: 1.2 },
  { code: "TLFX-400", wr: "WR-22", A: 8, B: 5.3, C: 6, D: 2.9, P: 1.2, r: 1.25, R: 2.4, tol: 0.15, min: 33.0, max: 50.0, att: 1.2, vswr: 1.35, notes: { code: true, att: true, vswr: true } },
] as const;

export const DIM_BY_WR: ReadonlyMap<string, DimRow> = new Map(DIM_TABLE.map((d) => [d.wr, d]));

export const MATERIAL = "OT 80 UNI 4897";

/**
 * Lunghezza L dalla tabella dimensioni: "da 1100 a 1300 mm" (lunghezza massima del pezzo,
 * secondo la misura) e "TLFX-400: L massima 3 piedi". Fuori limite il configuratore avvisa,
 * non blocca: "Possibile su richiesta".
 */
export const LENGTH_LIMITS = { maxMm: 1300, maxMmFor: { "WR-22": 914 } as Record<string, number> } as const;

export function maxLengthFor(wr: string): number {
  return LENGTH_LIMITS.maxMmFor[wr] ?? LENGTH_LIMITS.maxMm;
}

/** Scorciatoie di lunghezza (le stesse colonne della tabella return loss). */
export const LENGTH_PRESETS = [300, 600, 1000] as const;

/* ------------------------------------------------------------- frequenza */

export const FREQ_RANGE = { min: 2.6, max: 50 } as const;

/** Tutte le misure che coprono la frequenza (le bande si sovrappongono), dalla più grande alla più piccola. */
export function sizesFor(ghz: number): Size[] {
  return SIZES.filter((s) => ghz >= s.min && ghz <= s.max).reverse();
}

/** Misura consigliata: quella in cui la frequenza sta più al centro della banda. */
export function bestSizeFor(ghz: number): Size | undefined {
  const list = sizesFor(ghz);
  return list.sort((x, y) => centered(ghz, y) - centered(ghz, x))[0];
}

function centered(ghz: number, s: Size): number {
  const mid = (s.min + s.max) / 2;
  return 1 - Math.abs(ghz - mid) / ((s.max - s.min) / 2);
}

/** Frequenza di taglio del modo TE10 in GHz: fc = c / 2a */
export function cutoffGHz(s: Size): number {
  return 299.792458 / (2 * s.a);
}

/* ------------------------------------------------------------ formattazione */

const fmtCache = new Map<string, Intl.NumberFormat>();

/** Numero con il separatore della lingua (virgola in IT, punto in EN) e decimali fissi o variabili. */
export function num(value: number, locale: string, min = 0, max = min): string {
  const key = `${locale}-${min}-${max}`;
  let f = fmtCache.get(key);
  if (!f) {
    f = new Intl.NumberFormat(locale === "it" ? "it-IT" : "en-GB", { minimumFractionDigits: min, maximumFractionDigits: Math.max(min, max) });
    fmtCache.set(key, f);
  }
  return f.format(value);
}

/** "8,2–12,5" / "8.2–12.5" (GHz, unità nell'intestazione) */
export function range(min: number, max: number, locale: string): string {
  return `${num(min, locale, 1, 2)}–${num(max, locale, 1, 2)}`;
}
