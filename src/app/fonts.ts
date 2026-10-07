import localFont from "next/font/local";

/*
 * Font self-hosted e alleggeriti (fontTools: solo latino + simboli usati, niente hinting,
 * assi variabili limitati ai valori usati). Da 160 KB a 111 KB complessivi: meno byte
 * prima del primo paint su mobile. Licenza SIL Open Font License 1.1 (Archivo, IBM Plex).
 */

/** Archivo variabile: wght 300-800, wdth 62-125 (115-125% titoli, 62% accenti). */
export const archivo = localFont({
  src: [{ path: "./fonts/archivo-var-latin.woff2", weight: "300 800", style: "normal" }],
  variable: "--font-archivo",
  display: "swap",
  declarations: [{ prop: "font-stretch", value: "62% 125%" }],
  adjustFontFallback: "Arial",
});

/** IBM Plex Sans variabile: wght 400-600. */
export const plexSans = localFont({
  src: [{ path: "./fonts/ibm-plex-sans-var-latin.woff2", weight: "400 600", style: "normal" }],
  variable: "--font-plex-sans",
  display: "swap",
  adjustFontFallback: "Arial",
});

/** IBM Plex Mono 400 e 500 (dati tecnici, numeri tabulari). */
export const plexMono = localFont({
  src: [
    { path: "./fonts/ibm-plex-mono-400-latin.woff2", weight: "400", style: "normal" },
    { path: "./fonts/ibm-plex-mono-500-latin.woff2", weight: "500", style: "normal" },
  ],
  variable: "--font-plex-mono",
  display: "swap",
  adjustFontFallback: false,
});

export const fontVariables = `${archivo.variable} ${plexSans.variable} ${plexMono.variable}`;
