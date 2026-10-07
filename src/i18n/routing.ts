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
    "/prodotti/[famiglia]": { it: "/prodotti/[famiglia]", en: "/products/[famiglia]" },
    "/su-misura": { it: "/su-misura", en: "/custom" },
    "/azienda": { it: "/azienda", en: "/company" },
    "/qualita": { it: "/qualita", en: "/quality" },
    "/radioamatori": { it: "/radioamatori", en: "/ham-radio" },
    "/contatti": { it: "/contatti", en: "/contact" },
    "/faq": "/faq",
    "/privacy": "/privacy",
    "/termini": { it: "/termini", en: "/terms" },
    "/cookie": { it: "/cookie", en: "/cookies" },
    "/shop": "/shop",
    "/shop/[handle]": "/shop/[handle]",
    "/shop/ordine": { it: "/shop/ordine", en: "/shop/order" },
    "/shop/ordine-inviato": { it: "/shop/ordine-inviato", en: "/shop/order-sent" },
  },
});

export type AppPathname = keyof typeof routing.pathnames;

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

/** Rotte senza parametri, usabili come stringa nei link. */
export type StaticPathname = Exclude<AppPathname, "/prodotti/[famiglia]" | "/shop/[handle]">;
