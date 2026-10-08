import { defineRouting } from "next-intl/routing";

export const locales = ["it", "en"] as const;
export type Locale = (typeof locales)[number];

export const routing = defineRouting({
  locales,
  defaultLocale: "it",
  // Italiano su "/", inglese su "/en". Nessun redirect automatico in base al browser:
  // gli URL restano stabili per SEO e per chi condivide un link.
  localePrefix: "as-needed",
  localeDetection: false,
  // Gli hreflang li generiamo noi (metadata + sitemap) con NEXT_PUBLIC_SITE_URL, non con l'host della richiesta.
  alternateLinks: false,
  pathnames: {
    "/": "/",
    "/prodotti": { it: "/prodotti", en: "/products" },
    "/prodotti/tabelle": { it: "/prodotti/tabelle", en: "/products/tables" },
    "/prodotti/[famiglia]": { it: "/prodotti/[famiglia]", en: "/products/[famiglia]" },
    "/prodotti/guida-flessibile/[wr]": { it: "/prodotti/guida-flessibile/[wr]", en: "/products/flexible-waveguide/[wr]" },
    "/su-misura": { it: "/su-misura", en: "/custom" },
    "/azienda": { it: "/azienda", en: "/company" },
    "/qualita": { it: "/qualita", en: "/quality" },
    "/contatti": { it: "/contatti", en: "/contact" },
    "/faq": "/faq",
    "/privacy": "/privacy",
    "/termini": { it: "/termini", en: "/terms" },
    "/cookie": { it: "/cookie", en: "/cookies" },
    "/shop": "/shop",
    "/shop/richiesta": { it: "/shop/richiesta", en: "/shop/request" },
    "/shop/richiesta/inviata": { it: "/shop/richiesta/inviata", en: "/shop/request/sent" },
  },
});

export type AppPathname = keyof typeof routing.pathnames;

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

/** Rotte senza parametri, usabili come stringa nei link. */
export type StaticPathname = Exclude<AppPathname, "/prodotti/[famiglia]" | "/prodotti/guida-flessibile/[wr]">;
