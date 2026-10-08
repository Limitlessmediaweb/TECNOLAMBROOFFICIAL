import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { pageMetadata } from "@/lib/page";
import { Breadcrumbs, PageHeader } from "@/components/ui/Bits";
import { PageMessages } from "@/components/ui/PageMessages";
import { localizedHref } from "@/components/ui/TrackedLink";
import { RequestForm } from "@/components/request/RequestForm";

export async function generateMetadata({ params }: PageProps<"/[locale]/shop/richiesta">): Promise<Metadata> {
  const { locale } = await params;
  const meta = await pageMetadata(locale, "request", "/shop/richiesta");
  // Pagina personale (lista nel browser): fuori dai motori di ricerca
  return { ...meta, robots: { index: false, follow: true } };
}

export default async function RequestPage({ params }: PageProps<"/[locale]/shop/richiesta">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("request");
  const shop = await getTranslations("shop");

  return (
    <PageMessages namespaces={["configurator"]}>
      <PageHeader
        crumbs={<Breadcrumbs items={[{ label: shop("breadcrumb"), href: "/shop" }, { label: t("title") }]} />}
        title={<h1 className="text-display-l font-extrabold uppercase wdth-wide">{t("title")}</h1>}
        intro={<p>{t("intro")}</p>}
      />
      <div className="container-site pb-24">
        <RequestForm
          privacyHref={await localizedHref("/privacy")}
          sentPath={await localizedHref("/shop/richiesta-inviata")}
          shopPath={await localizedHref("/shop")}
        />
      </div>
    </PageMessages>
  );
}
