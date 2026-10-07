import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Info, Truck, FileText } from "lucide-react";
import type { Locale } from "@/i18n/routing";
import { pageMetadata, breadcrumbsFor } from "@/lib/page";
import { getCommerce } from "@/lib/commerce";
import { ENV } from "@/data/site";
import { Breadcrumbs, PageHeader } from "@/components/ui/Bits";
import { JsonLd } from "@/components/ui/JsonLd";
import { QuoteLink, localizedHref } from "@/components/ui/TrackedLink";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { ShopCatalog } from "@/components/shop/ShopCatalog";
import { ShopMessages } from "@/components/shop/ShopMessages";

export async function generateMetadata({ params }: PageProps<"/[locale]/shop">): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, "shop", "/shop");
}

export default async function ShopPage({ params }: PageProps<"/[locale]/shop">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("shop");
  const products = await getCommerce().listProducts(locale as Locale);
  const shopPath = await localizedHref("/shop");

  return (
    <ShopMessages namespaces={["shop"]}>
      <JsonLd data={await breadcrumbsFor(locale as Locale, [{ name: t("breadcrumb"), href: "/shop" }])} />
      <PageHeader
        crumbs={<Breadcrumbs items={[{ label: t("breadcrumb") }]} />}
        title={
          <SplitReveal
            as="h1"
            immediate
            className="text-display-l font-extrabold uppercase wdth-wide [overflow-wrap:break-word] [hyphens:auto] md:[overflow-wrap:normal] lg:text-[clamp(3rem,5.4vw,5.5rem)]"
          >
            {t("title")}
          </SplitReveal>
        }
        intro={<p>{t("intro")}</p>}
      >
        {ENV.demo ? (
          <div role="note" className="flex max-w-3xl gap-3 border border-line-strong bg-surface p-4">
            <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-accent" strokeWidth={1.75} />
            <p className="text-sm">
              <span className="todo mr-2">{t("demoNotice")}</span>
              <span className="text-muted">{t("demoNoticeBody")}</span>
            </p>
          </div>
        ) : null}
      </PageHeader>

      <section className="container-site pb-16" aria-label={t("title")}>
        <ShopCatalog products={products} shopPath={shopPath} />
      </section>

      <section className="border-t border-line" aria-label={t("shipping48")}>
        <div className="container-site grid gap-4 py-12 md:grid-cols-3">
          <p className="flex items-center gap-3">
            <Truck aria-hidden="true" className="size-5 shrink-0 text-primary" strokeWidth={1.75} />
            {t("shipping48")}
          </p>
          <p className="flex items-center gap-3">
            <FileText aria-hidden="true" className="size-5 shrink-0 text-primary" strokeWidth={1.75} />
            {t("invoice")}
          </p>
          <QuoteLink source="shop_footer" className="font-medium underline decoration-accent underline-offset-4 hover:text-accent">
            {t("quoteFallback")}
          </QuoteLink>
        </div>
      </section>
    </ShopMessages>
  );
}
