import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowDown, ArrowRight, PencilRuler, Truck, Upload } from "lucide-react";
import type { Locale } from "@/i18n/routing";
import { pageMetadata, breadcrumbsFor } from "@/lib/page";
import { publicExists } from "@/lib/public-files";
import { Breadcrumbs, PageHeader, WithTodo } from "@/components/ui/Bits";
import { JsonLd } from "@/components/ui/JsonLd";
import { PageMessages } from "@/components/ui/PageMessages";
import { LocalLink as Link } from "@/components/ui/LocalLink";
import { localizedHref } from "@/components/ui/TrackedLink";
import { TrustBar } from "@/components/ui/TrustBar";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { FaqAccordion } from "@/components/domain/FaqAccordion";
import { Configurator } from "@/components/configurator/Configurator";
import { ReadyCatalog } from "@/components/configurator/ReadyCatalog";
import { TypeTiles } from "@/components/configurator/TypeTiles";
import { SHOP_FAQ } from "@/data/faq";
import { faqText } from "@/lib/faq-text";

export async function generateMetadata({ params }: PageProps<"/[locale]/shop">): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, "shop", "/shop");
}

/** Miniature statiche dei modelli 3D (public/render, generate da scripts/render-thumbs.mjs) */
const THUMB_KEYS = ["twistable", "seamless", "bend-E", "bend-H", "twist", "offset"] as const;
function thumbs(): Record<string, string> {
  return Object.fromEntries(THUMB_KEYS.filter((k) => publicExists(`render/${k}.webp`)).map((k) => [k, `/render/${k}.webp`]));
}

/** "Configura il tuo pezzo": due strade (misura o disegno), tipi, configuratore, prodotti pronti. Niente prezzi né pagamento. */
export default async function ShopPage({ params }: PageProps<"/[locale]/shop">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("shop");
  const faq = await faqText();
  const how = t.raw("how") as string[];
  const requestPath = await localizedHref("/shop/richiesta");
  const th = thumbs();

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
      />

      <div className="container-site pb-10">
        <TrustBar />
      </div>

      {/* due strade: ho la misura / ho un disegno */}
      <section className="container-site pb-14" aria-label={t("choiceLabel")}>
        <div className="grid gap-4 md:grid-cols-2">
          <a href="#configura" className="group flex flex-col gap-3 border border-accent/60 bg-[color-mix(in_srgb,var(--c-accent)_9%,var(--c-bg))] p-7 transition-colors hover:border-accent" data-choice="measure">
            <PencilRuler aria-hidden="true" className="size-7 text-accent" strokeWidth={1.5} />
            <span className="text-display-s font-bold">{t("choiceMeasure")}</span>
            <span className="text-muted">{t("choiceMeasureBody")}</span>
            <span className="mt-auto inline-flex items-center gap-2 pt-2 font-medium text-primary-ink">
              {t("choiceMeasureCta")}
              <ArrowDown aria-hidden="true" className="size-4 transition-transform group-hover:translate-y-0.5" strokeWidth={1.75} />
            </span>
          </a>
          <Link href={{ pathname: "/shop/richiesta", hash: "su-disegno" }} className="group flex flex-col gap-3 border border-line bg-surface p-7 transition-colors hover:border-accent" data-choice="drawing">
            <Upload aria-hidden="true" className="size-7 text-accent" strokeWidth={1.5} />
            <span className="text-display-s font-bold">{t("choiceDrawing")}</span>
            <span className="text-muted">{t("choiceDrawingBody")}</span>
            <span className="mt-auto inline-flex items-center gap-2 pt-2 font-medium text-primary-ink">
              {t("choiceDrawingCta")}
              <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5" strokeWidth={1.75} />
            </span>
          </Link>
        </div>
      </section>

      <section className="container-site pb-14" aria-labelledby="types-title">
        <h2 id="types-title" className="mb-6 text-display-m font-bold">
          {t("typesTitle")}
        </h2>
        <TypeTiles thumbs={th} />
      </section>

      <section id="configura" className="section-y scroll-mt-20 border-t border-line" aria-labelledby="compose-title">
        <div className="container-site">
          <div className="mb-10 max-w-3xl">
            <h2 id="compose-title" className="text-display-l font-bold">
              {t("composeTitle")}
            </h2>
            <p className="mt-4 text-lead text-muted">{t("composeBody")}</p>
          </div>
          <Configurator requestPath={requestPath} />
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
          <ReadyCatalog thumbs={th} />
        </div>
      </section>

      <section className="section-y border-t border-line" aria-labelledby="how-title">
        <div className="container-site">
          <h2 id="how-title" className="mb-8 text-display-m font-bold">
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
            <span>{t("stockNote")}</span>
            <span className="inline-flex items-center gap-2">
              <Truck aria-hidden="true" className="size-4" strokeWidth={1.75} />
              {t("shipping")}
            </span>
          </p>
        </div>
      </section>

      <section className="section-y border-t border-line" aria-labelledby="shop-faq-title">
        <div className="container-site grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <h2 id="shop-faq-title" className="text-display-m font-bold">
              {t("faqTitle")}
            </h2>
            <Link href="/faq" className="btn btn-ghost mt-6">
              {t("faqAll")}
            </Link>
          </div>
          <div className="lg:col-span-8">
            <FaqAccordion headingLevel={3} items={SHOP_FAQ.map((id) => ({ id, q: faq(id).q, a: <WithTodo text={faq(id).a} /> }))} />
          </div>
        </div>
      </section>
    </PageMessages>
  );
}
