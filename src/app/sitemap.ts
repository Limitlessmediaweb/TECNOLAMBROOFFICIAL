import type { MetadataRoute } from "next";
import { routing, type StaticPathname } from "@/i18n/routing";
import { absoluteUrl } from "@/lib/seo";
import { VISIBLE_FAMILIES } from "@/data/families";

const STATIC: { href: StaticPathname; priority: number; changeFrequency: "monthly" | "yearly" }[] = [
  { href: "/", priority: 1, changeFrequency: "monthly" },
  { href: "/prodotti", priority: 0.9, changeFrequency: "monthly" },
  { href: "/prodotti/tabelle", priority: 0.8, changeFrequency: "monthly" },
  { href: "/su-misura", priority: 0.9, changeFrequency: "monthly" },
  { href: "/contatti", priority: 0.8, changeFrequency: "yearly" },
  { href: "/azienda", priority: 0.7, changeFrequency: "yearly" },
  { href: "/qualita", priority: 0.6, changeFrequency: "yearly" },
  { href: "/radioamatori", priority: 0.6, changeFrequency: "monthly" },
  { href: "/faq", priority: 0.6, changeFrequency: "monthly" },
  { href: "/shop", priority: 0.9, changeFrequency: "monthly" },
  { href: "/privacy", priority: 0.2, changeFrequency: "yearly" },
  { href: "/termini", priority: 0.2, changeFrequency: "yearly" },
  { href: "/cookie", priority: 0.2, changeFrequency: "yearly" },
];

/** Tutte le rotte pubbliche in italiano e inglese, con gli alternates hreflang. */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const entries: MetadataRoute.Sitemap = [];

  for (const page of STATIC) {
    const languages = Object.fromEntries(routing.locales.map((l) => [l, absoluteUrl(page.href, l)]));
    for (const locale of routing.locales) {
      entries.push({ url: absoluteUrl(page.href, locale), lastModified, changeFrequency: page.changeFrequency, priority: page.priority, alternates: { languages } });
    }
  }

  for (const family of VISIBLE_FAMILIES) {
    const hrefFor = (l: (typeof routing.locales)[number]) => ({ pathname: "/prodotti/[famiglia]" as const, params: { famiglia: family.slug[l] } });
    const languages = Object.fromEntries(routing.locales.map((l) => [l, absoluteUrl(hrefFor(l), l)]));
    for (const locale of routing.locales) {
      entries.push({ url: absoluteUrl(hrefFor(locale), locale), lastModified, changeFrequency: "monthly", priority: 0.8, alternates: { languages } });
    }
  }

  // La tua richiesta e la conferma sono pagine noindex: escluse.
  return entries;
}
