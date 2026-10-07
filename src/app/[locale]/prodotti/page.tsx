import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { pageMetadata, breadcrumbsFor } from "@/lib/page";
import { Breadcrumbs, PageHeader } from "@/components/ui/Bits";
import { JsonLd } from "@/components/ui/JsonLd";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { ProductGrid } from "@/components/sections/ProductsSection";
import { BandFinderSection, FinalCta } from "@/components/sections/HomeSections";
import { WrMarquee } from "@/components/sections/WrMarquee";
import { LocalLink as Link } from "@/components/ui/LocalLink";
import { ArrowRight } from "lucide-react";

export async function generateMetadata({ params }: PageProps<"/[locale]/prodotti">): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, "products", "/prodotti");
}

export default async function ProductsPage({ params }: PageProps<"/[locale]/prodotti">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("products.page");

  return (
    <>
      <JsonLd data={await breadcrumbsFor(locale as Locale, [{ name: t("title"), href: "/prodotti" }])} />
      <PageHeader
        crumbs={<Breadcrumbs items={[{ label: t("title") }]} />}
        title={
          <SplitReveal as="h1" immediate className="text-display-l font-extrabold uppercase wdth-wide [overflow-wrap:break-word] [hyphens:auto] md:[overflow-wrap:normal] lg:text-[clamp(3rem,5.4vw,5.5rem)]">
            {t("title")}
          </SplitReveal>
        }
        intro={<p>{t("intro")}</p>}
      />
      <section className="container-site pb-20" aria-label={t("title")}>
        <ProductGrid headingLevel={2} />
        <Link href="/prodotti/tabelle" className="btn btn-ghost mt-10">
          {t("tablesLink")}
          <ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.75} />
        </Link>
      </section>
      <WrMarquee />
      <BandFinderSection formOnPage={false} />
      <FinalCta />
    </>
  );
}
