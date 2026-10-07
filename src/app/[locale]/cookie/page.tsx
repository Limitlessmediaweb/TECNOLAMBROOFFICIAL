import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/page";
import { LegalPage } from "@/components/sections/LegalPage";

export async function generateMetadata({ params }: PageProps<"/[locale]/cookie">): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, "cookie", "/cookie");
}

export default async function CookiePage({ params }: PageProps<"/[locale]/cookie">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <LegalPage ns="cookie" href="/cookie" locale={locale as Locale} />;
}
