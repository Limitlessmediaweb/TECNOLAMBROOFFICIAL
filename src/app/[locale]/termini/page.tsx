import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/page";
import { LegalPage } from "@/components/sections/LegalPage";

export async function generateMetadata({ params }: PageProps<"/[locale]/termini">): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, "terms", "/termini");
}

export default async function TermsPage({ params }: PageProps<"/[locale]/termini">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <LegalPage ns="terms" href="/termini" locale={locale as Locale} />;
}
