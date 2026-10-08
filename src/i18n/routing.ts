import { defineRouting } from "next-intl/routing";
import { DEFAULT_LOCALE, LOCALES, ROUTE_SLUGS, type Locale } from "./locales";

export { LOCALES as locales, isLocale } from "./locales";
export type { Locale } from "./locales";

/** Indirizzi tradotti per tutte le lingue (le lingue senza traduzione usano l'indirizzo inglese). */
function localizedPathnames() {
  const out: Record<string, Record<Locale, string>> = {};
  for (const [internal, slugs] of Object.entries(ROUTE_SLUGS)) {
    out[internal] = Object.fromEntries(LOCALES.map((l) => [l, slugs[l] ?? slugs.en])) as Record<Locale, string>;
  }
  return out as Record<keyof typeof ROUTE_SLUGS, Record<Locale, string>>;
}

export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  // Italiano su "/", le altre lingue con il prefisso (/en, /es, /zh, /de). Nessun redirect automatico
  // in base al browser: gli URL restano stabili per SEO e per chi condivide un link (la lingua del
  // browser si propone con un banner, vedi components/ui/LanguageBanner.tsx).
  localePrefix: "as-needed",
  localeDetection: false,
  // Gli hreflang li generiamo noi (metadata + sitemap) con NEXT_PUBLIC_SITE_URL, non con l'host della richiesta.
  alternateLinks: false,
  pathnames: localizedPathnames() as {
    "/": Record<Locale, string>;
    "/prodotti": Record<Locale, string>;
    "/prodotti/tabelle": Record<Locale, string>;
    "/prodotti/[famiglia]": Record<Locale, string>;
    "/prodotti/guida-flessibile/[wr]": Record<Locale, string>;
    "/su-misura": Record<Locale, string>;
    "/azienda": Record<Locale, string>;
    "/qualita": Record<Locale, string>;
    "/contatti": Record<Locale, string>;
    "/faq": Record<Locale, string>;
    "/privacy": Record<Locale, string>;
    "/termini": Record<Locale, string>;
    "/cookie": Record<Locale, string>;
    "/shop": Record<Locale, string>;
    "/shop/richiesta": Record<Locale, string>;
    "/shop/richiesta/inviata": Record<Locale, string>;
  },
});

export type AppPathname = keyof typeof routing.pathnames;

/** Rotte senza parametri, usabili come stringa nei link. */
export type StaticPathname = Exclude<AppPathname, "/prodotti/[famiglia]" | "/prodotti/guida-flessibile/[wr]">;
