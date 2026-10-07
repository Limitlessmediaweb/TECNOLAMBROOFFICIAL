/** Dati aziendali veri (dal brief). Non aggiungere dati non forniti dal titolare. */
export const COMPANY = {
  brand: "Tecnolambro",
  brandFull: "Tecnolambro Microwave Components",
  legalName: "Tecnolambro S.a.s. di Marco Pasquini & C.",
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
  legalAddress: {
    street: "Via delle Betulle 1",
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
