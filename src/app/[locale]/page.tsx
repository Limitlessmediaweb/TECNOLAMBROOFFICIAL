import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { buildMetadata } from "@/lib/seo";
import { Intro } from "@/components/domain/Intro";
import { Hero } from "@/components/sections/Hero";
import { WrMarquee } from "@/components/sections/WrMarquee";
import { CompanySection } from "@/components/sections/CompanySection";
import { ProductsSection } from "@/components/sections/ProductsSection";
import {
  BandFinderSection,
  ProcessSection,
  HistorySection,
  QualitySection,
  ShopSection,
  FaqPreviewSection,
  FinalCta,
} from "@/components/sections/HomeSections";
import { QuoteSection } from "@/components/sections/QuoteSection";

export async function generateMetadata({ params }: PageProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta.home" });
  return buildMetadata({ locale: locale as Locale, href: "/", title: t("title"), description: t("description") });
}

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("intro");

  return (
    <>
      <Intro tagline={t("tagline")} skipLabel={t("skip")} label={t("label")} />
      <Hero />
      <Lazy>
        <WrMarquee />
        <CompanySection />
      </Lazy>
      <Lazy>
        <ProductsSection />
      </Lazy>
      <Lazy>
        <BandFinderSection />
      </Lazy>
      <Lazy>
        <ProcessSection />
        <HistorySection />
      </Lazy>
      <Lazy>
        <QualitySection />
        <ShopSection />
        <FaqPreviewSection />
      </Lazy>
      <Lazy>
        <QuoteSection />
        <FinalCta href={{ pathname: "/", hash: "preventivo" }} />
      </Lazy>
    </>
  );
}

/**
 * Boundary di Suspense attorno ai blocchi sotto la piega. L'HTML è identico (niente fallback:
 * il contenuto è statico), ma React idrata ogni blocco come unità separata a priorità più
 * bassa e cede il main thread tra un blocco e l'altro: niente task lunghi di idratazione (TBT).
 */
function Lazy({ children }: { children: ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>;
}
