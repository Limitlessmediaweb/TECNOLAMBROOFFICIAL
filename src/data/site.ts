/** Dati aziendali veri (dal brief). Non aggiungere dati non forniti dal titolare. */
export const COMPANY = {
  brand: "Tecnolambro",
  brandFull: "Tecnolambro Microwave Components",
  legalName: "Tecnolambro S.a.s. di Marco Pasquini & C.",
  vat: "08639310153",
  vatFull: "IT08639310153",
  founded: 1986,
  email: "info@tecnolambro.it",
  phone: "+39 0382 75385",
  phoneHref: "tel:+39038275385",
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

/** Anni di attività calcolati dall'anno corrente: il brief dice 39 (calcolo 2025), nel 2026 sono 40. */
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
