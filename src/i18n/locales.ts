/**
 * Lingue del sito. Per aggiungerne una (es. il francese):
 *  1. aggiungi il codice a LOCALES e una riga in LOCALE_META;
 *  2. crea messages/<codice>.json (stesse chiavi di messages/it.json; `npm run i18n:check` segnala le mancanti);
 *  3. facoltativo: indirizzi tradotti in ROUTE_SLUGS e slug delle famiglie in data/families.ts (senza, si usano quelli inglesi).
 * Il resto (rotte, hreflang, sitemap, selettore della lingua, formati di numeri e date) si adegua da solo.
 */
export const LOCALES = ["it", "en", "es", "zh", "de"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "it";

export type LocaleMeta = {
  /** etichetta nel selettore della lingua */
  label: string;
  /** nome della lingua nella lingua stessa */
  name: string;
  /** attributo lang e hreflang */
  hreflang: string;
  /** locale per Intl (numeri, date) */
  intl: string;
  /** og:locale */
  og: string;
  /** lingua nuova: noindex finché NEXT_PUBLIC_NEW_LOCALES_NOINDEX=true */
  review?: boolean;
};

export const LOCALE_META: Record<Locale, LocaleMeta> = {
  it: { label: "IT", name: "Italiano", hreflang: "it", intl: "it-IT", og: "it_IT" },
  en: { label: "EN", name: "English", hreflang: "en", intl: "en-GB", og: "en_GB" },
  es: { label: "ES", name: "Español", hreflang: "es", intl: "es-ES", og: "es_ES", review: true },
  zh: { label: "中文", name: "简体中文", hreflang: "zh-Hans", intl: "zh-Hans-CN", og: "zh_CN", review: true },
  de: { label: "DE", name: "Deutsch", hreflang: "de", intl: "de-DE", og: "de_DE", review: true },
};

/** Locale Intl (numeri, date) per un codice lingua del sito, anche sconosciuto. */
export function intlLocale(locale: string): string {
  return LOCALE_META[locale as Locale]?.intl ?? "en-GB";
}

/** Separatore decimale della lingua ("," in italiano, spagnolo e tedesco; "." in inglese e cinese) */
export function decimalSep(locale: string): string {
  return (1.5).toLocaleString(intlLocale(locale)).charAt(1);
}

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/** Valore nella lingua richiesta, con ripiego su inglese e poi italiano (testi nei dati, non nei messaggi). */
export function pick<T>(values: Partial<Record<Locale, T>> & { it: T }, locale: string): T {
  return values[locale as Locale] ?? values.en ?? values.it;
}

/** Lingue da far rivedere a un madrelingua: noindex finché NEXT_PUBLIC_NEW_LOCALES_NOINDEX=true (predefinito). */
export function isReviewLocale(locale: string): boolean {
  return Boolean(LOCALE_META[locale as Locale]?.review) && (process.env.NEXT_PUBLIC_NEW_LOCALES_NOINDEX ?? "true") === "true";
}

/**
 * Indirizzi tradotti delle pagine. Chiave = percorso interno (italiano). Le lingue senza voce usano
 * l'indirizzo inglese; il cinese usa quelli inglesi (più leggibili e condivisibili).
 */
export const ROUTE_SLUGS: Record<string, Partial<Record<Locale, string>> & { it: string; en: string }> = {
  "/": { it: "/", en: "/" },
  "/prodotti": { it: "/prodotti", en: "/products", es: "/productos", de: "/produkte" },
  "/prodotti/tabelle": { it: "/prodotti/tabelle", en: "/products/tables", es: "/productos/tablas", de: "/produkte/tabellen" },
  "/prodotti/[famiglia]": { it: "/prodotti/[famiglia]", en: "/products/[famiglia]", es: "/productos/[famiglia]", de: "/produkte/[famiglia]" },
  "/prodotti/guida-flessibile/[wr]": {
    it: "/prodotti/guida-flessibile/[wr]",
    en: "/products/flexible-waveguide/[wr]",
    es: "/productos/guia-de-ondas-flexible/[wr]",
    de: "/produkte/flexibler-hohlleiter/[wr]",
  },
  "/su-misura": { it: "/su-misura", en: "/custom", es: "/a-medida", de: "/sonderanfertigung" },
  "/azienda": { it: "/azienda", en: "/company", es: "/empresa", de: "/unternehmen" },
  "/qualita": { it: "/qualita", en: "/quality", es: "/calidad", de: "/qualitaet" },
  "/contatti": { it: "/contatti", en: "/contact", es: "/contacto", de: "/kontakt" },
  "/faq": { it: "/faq", en: "/faq" },
  "/privacy": { it: "/privacy", en: "/privacy", es: "/privacidad", de: "/datenschutz" },
  "/termini": { it: "/termini", en: "/terms", es: "/terminos", de: "/nutzungsbedingungen" },
  "/cookie": { it: "/cookie", en: "/cookies" },
  "/shop": { it: "/shop", en: "/shop" },
  "/shop/richiesta": { it: "/shop/richiesta", en: "/shop/request", es: "/shop/solicitud", de: "/shop/anfrage" },
  "/shop/richiesta/inviata": { it: "/shop/richiesta/inviata", en: "/shop/request/sent", es: "/shop/solicitud/enviada", de: "/shop/anfrage/gesendet" },
};
