/** Dati aziendali veri (dal brief). Non aggiungere dati non forniti dal titolare. */
export const COMPANY = {
  brand: "Tecnolambro",
  brandFull: "Tecnolambro Microwave Components",
  legalName: "Tecnolambro S.a.s. di Pasquini Marco & C.",
  vat: "08639310153",
  vatFull: "IT08639310153",
  founded: 1987,
  email: "info@tecnolambro.it",
  pec: "tecnolambrosnc@pec.it",
  /** Cellulare: il primo numero da mostrare */
  phone: "+39 375 577 1084",
  phoneHref: "tel:+393755771084",
  /** Fisso: secondo numero */
  phone2: "+39 0382 75385",
  phone2Href: "tel:+39038275385",
  /** WhatsApp sul cellulare */
  whatsapp: "393755771084",
  /**
   * Orari della sede operativa (lunedì-venerdì 8:00-12:00 e 13:30-17:30, sabato e domenica chiuso).
   * Giorni ISO: 1 = lunedì.
   */
  hours: [
    { days: [1, 2, 3, 4, 5], opens: "08:00", closes: "12:00" },
    { days: [1, 2, 3, 4, 5], opens: "13:30", closes: "17:30" },
  ],
  legalAddress: {
    street: "Via Privata delle Betulle 1",
    postalCode: "20078",
    city: "San Colombano al Lambro",
    province: "MI",
    region: "Lombardia",
    country: "IT",
  },
  operationalAddress: {
    street: "Via degli Spinedi 20",
    postalCode: "27010",
    city: "Miradolo Terme",
    province: "PV",
    region: "Lombardia",
    country: "IT",
  },
} as const;

/** Testo precompilato di WhatsApp, nella lingua del sito. */
export const WHATSAPP_TEXT = {
  it: "Buongiorno, vorrei informazioni su una guida d’onda",
  en: "Hello, I’d like information about a waveguide",
} as const;

export function whatsappHref(locale: string): string {
  return `https://wa.me/${COMPANY.whatsapp}?text=${encodeURIComponent(locale === "en" ? WHATSAPP_TEXT.en : WHATSAPP_TEXT.it)}`;
}

/** Anni di attività calcolati dall'anno corrente (fondazione 1987). */
export function yearsActive(now = new Date()): number {
  return now.getFullYear() - COMPANY.founded;
}

export const ENV = {
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.tecnolambro.com").replace(/\/$/, ""),
  allowIndexing: process.env.NEXT_PUBLIC_ALLOW_INDEXING === "true",
  plausibleDomain: process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN ?? "",
  limitlessUrl: process.env.NEXT_PUBLIC_LIMITLESS_URL ?? "https://www.limitlessmedia.it",
  demo: (process.env.NEXT_PUBLIC_DEMO ?? "true") === "true",
} as const;
