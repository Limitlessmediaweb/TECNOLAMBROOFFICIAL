import type { Metadata } from "next";
import { getPathname } from "@/i18n/switch-path";
import { routing, type Locale, type AppPathname } from "@/i18n/routing";
import { LOCALE_META, isReviewLocale, pick } from "@/i18n/locales";
import { COMPANY, ENV } from "@/data/site";
import { CERTIFICATIONS, CERT_BODY } from "@/data/certifications";

type Href = Parameters<typeof getPathname>[0]["href"];

/** URL assoluto di una rotta nella lingua indicata ("/" per l'italiano, "/en/..." per l'inglese). */
export function absoluteUrl(href: Href, locale: Locale): string {
  const path = getPathname({ href, locale });
  return `${ENV.siteUrl}${path === "/" ? "" : path}` || ENV.siteUrl;
}

/** Varianti dello stesso href per lingua: utile quando lo slug cambia (famiglie). */
export type LocalizedHref = Href | (Partial<Record<Locale, Href>> & { it: Href; en: Href });

function hrefFor(href: LocalizedHref, locale: Locale): Href {
  if (typeof href === "object" && href !== null && "it" in href && "en" in href) {
    const byLocale = href as Partial<Record<Locale, Href>> & { en: Href };
    return byLocale[locale] ?? byLocale.en;
  }
  return href as Href;
}

/** Lingue pubblicate per i motori di ricerca (le lingue in revisione restano fuori finché sono noindex). */
export function indexedLocales(): Locale[] {
  return routing.locales.filter((l) => !isReviewLocale(l));
}

export function alternatesFor(href: LocalizedHref, locale: Locale): Metadata["alternates"] {
  const languages: Record<string, string> = {};
  for (const l of indexedLocales()) languages[LOCALE_META[l].hreflang] = absoluteUrl(hrefFor(href, l), l);
  languages["x-default"] = absoluteUrl(hrefFor(href, routing.defaultLocale), routing.defaultLocale);
  return { canonical: absoluteUrl(hrefFor(href, locale), locale), languages };
}

export function buildMetadata({
  locale,
  href,
  title,
  description,
}: {
  locale: Locale;
  href: LocalizedHref;
  title: string;
  description: string;
}): Metadata {
  const url = absoluteUrl(hrefFor(href, locale), locale);
  const ogImage = `${ENV.siteUrl}${locale === routing.defaultLocale ? "" : `/${locale}`}/opengraph-image`;
  return {
    title: { absolute: title },
    description,
    alternates: alternatesFor(href, locale),
    openGraph: {
      type: "website",
      url,
      title,
      description,
      siteName: COMPANY.brandFull,
      locale: LOCALE_META[locale].og,
      alternateLocale: indexedLocales()
        .filter((l) => l !== locale)
        .map((l) => LOCALE_META[l].og),
      images: [{ url: ogImage, width: 1200, height: 630, alt: COMPANY.brandFull }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

/* ------------------------------------------------------------------ JSON-LD */

const ORG_ID = `${ENV.siteUrl}/#organization`;
const BUSINESS_ID = `${ENV.siteUrl}/#miradolo`;
const SITE_ID = `${ENV.siteUrl}/#website`;

export function organizationJsonLd(locale: Locale) {
  const op = COMPANY.operationalAddress;
  const lg = COMPANY.legalAddress;
  const description = pick(
    {
      it: `Progettiamo, costruiamo e collaudiamo guida d’onda flessibile twistabile e seamless, curve, twist e disassati dal ${COMPANY.founded}.`,
      en: `We design, build and test twistable and seamless flexible waveguide, bends, twists and offsets since ${COMPANY.founded}.`,
      es: `Diseñamos, fabricamos y probamos guía de ondas flexible torsionable y sin costura, codos, torsiones y desplazamientos desde ${COMPANY.founded}.`,
      zh: `自${COMPANY.founded}年起，我们设计、制造并检测可扭转软波导、无缝软波导、弯波导、扭波导和偏移波导。`,
      de: `Wir entwickeln, fertigen und prüfen seit ${COMPANY.founded} flexible verdrehbare und nahtlose Hohlleiter, Bögen, Twists und Versätze.`,
    },
    locale,
  );

  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": ORG_ID,
      name: COMPANY.brandFull,
      legalName: COMPANY.legalName,
      alternateName: "Tecnolambro S.a.s.",
      url: ENV.siteUrl,
      logo: `${ENV.siteUrl}/brand/logo.png`,
      foundingDate: String(COMPANY.founded),
      vatID: COMPANY.vatFull,
      email: COMPANY.email,
      telephone: COMPANY.phone,
      description,
      address: {
        "@type": "PostalAddress",
        streetAddress: lg.street,
        postalCode: lg.postalCode,
        addressLocality: lg.city,
        addressRegion: lg.province,
        addressCountry: lg.country,
      },
      hasCredential: CERTIFICATIONS.map((c) => ({
        "@type": "EducationalOccupationalCredential",
        name: `${c.standard} – ${c.system.en}`,
        credentialCategory: "certification",
        identifier: c.number,
        dateCreated: c.firstIssue,
        validUntil: c.expiry,
        recognizedBy: { "@type": "Organization", name: CERT_BODY.name },
      })),
      contactPoint: [COMPANY.phone, COMPANY.phone2].map((telephone) => ({
        "@type": "ContactPoint",
        contactType: "sales",
        email: COMPANY.email,
        telephone,
        availableLanguage: ["Italian", "English"],
        areaServed: "Worldwide",
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      "@id": BUSINESS_ID,
      name: `${COMPANY.brandFull} · Miradolo Terme`,
      parentOrganization: { "@id": ORG_ID },
      url: ENV.siteUrl,
      image: `${ENV.siteUrl}/brand/logo.png`,
      email: COMPANY.email,
      telephone: COMPANY.phone,
      vatID: COMPANY.vatFull,
      description,
      address: {
        "@type": "PostalAddress",
        streetAddress: op.street,
        postalCode: op.postalCode,
        addressLocality: op.city,
        addressRegion: op.province,
        addressCountry: op.country,
      },
      openingHoursSpecification: COMPANY.hours.map((h) => ({
        "@type": "OpeningHoursSpecification",
        dayOfWeek: h.days.map((d) => ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][d]),
        opens: h.opens,
        closes: h.closes,
      })),
      // TODO: "geo" quando il titolare conferma le coordinate della sede.
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": SITE_ID,
      name: COMPANY.brandFull,
      url: ENV.siteUrl,
      inLanguage: indexedLocales().map((l) => LOCALE_META[l].hreflang),
      publisher: { "@id": ORG_ID },
    },
  ];
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({ "@type": "ListItem", position: i + 1, name: item.name, item: item.url })),
  };
}

export function faqJsonLd(items: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: stripTodo(item.a) },
    })),
  };
}

export type { AppPathname };

/** I segnaposto non vanno nei dati strutturati. */
export function stripTodo(text: string): string {
  return text.replace(/\s*\[(?:DA COMPLETARE|TO BE COMPLETED)[^\]]*\]\s*/g, " ").trim();
}
