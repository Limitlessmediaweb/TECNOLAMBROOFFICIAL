import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Clock, Building2 } from "lucide-react";
import type { Locale } from "@/i18n/routing";
import { pageMetadata, breadcrumbsFor } from "@/lib/page";
import { Breadcrumbs } from "@/components/ui/Bits";
import { JsonLd } from "@/components/ui/JsonLd";
import { QuoteSection } from "@/components/sections/QuoteSection";
import { COMPANY } from "@/data/site";

export async function generateMetadata({ params }: PageProps<"/[locale]/contatti">): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, "contact", "/contatti");
}

export default async function ContactPage({ params }: PageProps<"/[locale]/contatti">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("contactPage");
  const nav = await getTranslations("nav");
  const footer = await getTranslations("footer");
  const common = await getTranslations("common");

  return (
    <>
      <JsonLd data={await breadcrumbsFor(locale as Locale, [{ name: nav("contact"), href: "/contatti" }])} />
      <div className="container-site pt-28 lg:pt-36">
        <Breadcrumbs items={[{ label: nav("contact") }]} />
      </div>
      {/* L'H1 della pagina è il titolo del blocco preventivo */}
      <div className="-mt-10 lg:-mt-16">
        <QuoteSection title={t("title")} body={t("intro")} headingLevel={1} />
      </div>

      <section className="border-t border-line" aria-label={t("company")}>
        <div className="container-site grid gap-4 py-16 md:grid-cols-2">
          <div className="flex flex-col gap-4 border border-line bg-surface p-7">
            <Clock aria-hidden="true" className="size-7 text-accent" strokeWidth={1.5} />
            <h2 className="text-display-s font-bold">{t("hoursTitle")}</h2>
            <p>
              {common("hoursWeek")}
              <br />
              {common("hoursWeekend")}
            </p>
          </div>
          <div className="flex flex-col gap-4 border border-line bg-surface p-7">
            <Building2 aria-hidden="true" className="size-7 text-accent" strokeWidth={1.5} />
            <h2 className="text-display-s font-bold">{t("company")}</h2>
            <p className="text-muted">
              {COMPANY.legalName}
              <br />
              {footer("vat")} <span className="tabular">{COMPANY.vat}</span>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
