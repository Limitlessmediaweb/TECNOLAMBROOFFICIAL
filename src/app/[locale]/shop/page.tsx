import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowDown, FilePlus2, Truck } from "lucide-react";
import type { Locale } from "@/i18n/routing";
import { pageMetadata, breadcrumbsFor } from "@/lib/page";
import { familyTexts } from "@/lib/families-text";
import { Breadcrumbs, PageHeader } from "@/components/ui/Bits";
import { JsonLd } from "@/components/ui/JsonLd";
import { PageMessages } from "@/components/ui/PageMessages";
import { localizedHref } from "@/components/ui/TrackedLink";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { Configurator } from "@/components/configurator/Configurator";
import { ReadyCatalog } from "@/components/configurator/ReadyCatalog";
import { AddCustomButton } from "@/components/request/AddCustomButton";

export async function generateMetadata({ params }: PageProps<"/[locale]/shop">): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, "shop", "/shop");
}

/** "Configura il tuo pezzo": prodotti pronti dalle tabelle + configuratore. Niente prezzi né pagamento. */
export default async function ShopPage({ params }: PageProps<"/[locale]/shop">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("shop");
  const how = t.raw("how") as string[];
  const { names, short } = await familyTexts();
  const requestPath = await localizedHref("/shop/richiesta");

  return (
    <PageMessages namespaces={["shop", "configurator", "tables"]}>
      <JsonLd data={await breadcrumbsFor(locale as Locale, [{ name: t("title"), href: "/shop" }])} />
      <PageHeader
        crumbs={<Breadcrumbs items={[{ label: t("breadcrumb") }]} />}
        title={
          <SplitReveal as="h1" immediate className="text-display-l font-extrabold uppercase wdth-wide [overflow-wrap:break-word] [hyphens:auto] md:[overflow-wrap:normal] lg:text-[clamp(3rem,5.4vw,5.5rem)]">
            {t("title")}
          </SplitReveal>
        }
        intro={<p>{t("intro")}</p>}
      >
        <div className="flex flex-wrap gap-3">
          <a href="#pronti" className="btn btn-ghost">
            {t("readyTitle")}
            <ArrowDown aria-hidden="true" className="size-4" strokeWidth={1.75} />
          </a>
          <a href="#configura" className="btn btn-primary">
            {t("composeTitle")}
            <ArrowDown aria-hidden="true" className="size-4" strokeWidth={1.75} />
          </a>
        </div>
      </PageHeader>

      <section className="container-site pb-14" aria-labelledby="how-title">
        <h2 id="how-title" className="sr-only">
          {t("howTitle")}
        </h2>
        <ol className="grid gap-px border border-line bg-line sm:grid-cols-3">
          {how.map((step, i) => (
            <li key={step} className="flex items-center gap-4 bg-bg p-5">
              <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full border border-accent font-mono text-sm text-accent">
                {i + 1}
              </span>
              <span className="font-medium">{step}</span>
            </li>
          ))}
        </ol>
        <p className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted">
          <span>{t("priceNote")}</span>
          <span className="inline-flex items-center gap-2">
            <Truck aria-hidden="true" className="size-4" strokeWidth={1.75} />
            {t("shipping")}
          </span>
        </p>
      </section>

      <section id="configura" className="section-y scroll-mt-20 border-t border-line" aria-labelledby="compose-title">
        <div className="container-site">
          <div className="mb-10 max-w-3xl">
            <h2 id="compose-title" className="text-display-l font-bold">
              {t("composeTitle")}
            </h2>
            <p className="mt-4 text-lead text-muted">{t("composeBody")}</p>
          </div>
          <Configurator familyNames={names} familyShort={short} requestPath={requestPath} />
        </div>
      </section>

      <section id="pronti" className="section-y scroll-mt-20 border-t border-line bg-surface/40" aria-labelledby="ready-title">
        <div className="container-site">
          <div className="mb-10 max-w-3xl">
            <h2 id="ready-title" className="text-display-l font-bold">
              {t("readyTitle")}
            </h2>
            <p className="mt-4 text-lead text-muted">{t("readyBody")}</p>
          </div>
          <ReadyCatalog familyNames={names} />
        </div>
      </section>

      <section className="border-t border-line" aria-labelledby="bends-title">
        <div className="container-site grid gap-6 py-16 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <h2 id="bends-title" className="text-display-m font-bold">
              {t("bendsTitle")}
            </h2>
            <p className="mt-3 max-w-[60ch] text-muted">{t("bendsBody")}</p>
          </div>
          <AddCustomButton href={requestPath} label={t("bendsCta")} icon={<FilePlus2 aria-hidden="true" className="size-4" strokeWidth={1.75} />} />
        </div>
      </section>
    </PageMessages>
  );
}
