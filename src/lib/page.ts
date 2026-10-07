import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { buildMetadata, absoluteUrl, breadcrumbJsonLd, type LocalizedHref } from "./seo";

/** Metadata di una pagina interna dai testi meta.<ns>.{title,description}. */
export async function pageMetadata(locale: string, ns: string, href: LocalizedHref): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: `meta.${ns}` });
  return buildMetadata({ locale: locale as Locale, href, title: t("title"), description: t("description") });
}

type Href = Parameters<typeof absoluteUrl>[0];

/** BreadcrumbList JSON-LD: Home + voci della pagina. */
export async function breadcrumbsFor(locale: Locale, items: { name: string; href: Href }[]) {
  const t = await getTranslations({ locale, namespace: "common" });
  return breadcrumbJsonLd([{ name: t("home"), url: absoluteUrl("/", locale) }, ...items.map((i) => ({ name: i.name, url: absoluteUrl(i.href, locale) }))]);
}
