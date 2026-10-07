import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { pageMetadata, breadcrumbsFor } from "@/lib/page";
import { familyTexts } from "@/lib/families-text";
import { Breadcrumbs, PageHeader } from "@/components/ui/Bits";
import { JsonLd } from "@/components/ui/JsonLd";
import { PageMessages } from "@/components/ui/PageMessages";
import { localizedHref } from "@/components/ui/TrackedLink";
import { SpecTables } from "@/components/tables/SpecTables";
import { FinalCta } from "@/components/sections/HomeSections";

export async function generateMetadata({ params }: PageProps<"/[locale]/prodotti/tabelle">): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, "tables", "/prodotti/tabelle");
}

export default async function TablesPage({ params }: PageProps<"/[locale]/prodotti/tabelle">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("tables");
  const page = await getTranslations("products.page");
  const { names } = await familyTexts();

  return (
    <PageMessages namespaces={["tables", "configurator"]}>
      <JsonLd
        data={await breadcrumbsFor(locale as Locale, [
          { name: page("title"), href: "/prodotti" },
          { name: t("title"), href: "/prodotti/tabelle" },
        ])}
      />
      <PageHeader
        crumbs={<Breadcrumbs items={[{ label: page("title"), href: "/prodotti" }, { label: t("title") }]} />}
        title={<h1 className="text-display-l font-extrabold uppercase wdth-wide [overflow-wrap:break-word]">{t("title")}</h1>}
        intro={<p>{t("intro")}</p>}
      />
      <section className="container-site pb-20" aria-label={t("title")}>
        <SpecTables configurePath={await localizedHref("/shop")} familyNames={names} />
      </section>
      <FinalCta />
    </PageMessages>
  );
}
