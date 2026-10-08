import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { pageMetadata, breadcrumbsFor } from "@/lib/page";
import { faqJsonLd } from "@/lib/seo";
import { FAQ } from "@/data/faq";
import { faqText } from "@/lib/faq-text";
import { Breadcrumbs, PageHeader, WithTodo, isOnlyPlaceholder } from "@/components/ui/Bits";
import { ENV } from "@/data/site";
import { JsonLd } from "@/components/ui/JsonLd";
import { QuoteLink } from "@/components/ui/TrackedLink";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { FaqAccordion } from "@/components/domain/FaqAccordion";

export async function generateMetadata({ params }: PageProps<"/[locale]/faq">): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, "faq", "/faq");
}

export default async function FaqPage({ params }: PageProps<"/[locale]/faq">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("faqPage");
  const faq = await faqText();
  const nav = await getTranslations("nav");
  // senza dati (solo segnaposto) la domanda non si mostra fuori dall'anteprima
  const raw = FAQ.map((item) => ({ id: item.id, ...faq(item.id) })).filter((item) => ENV.demo || !isOnlyPlaceholder(item.a));

  return (
    <>
      <JsonLd data={faqJsonLd(raw)} />
      <JsonLd data={await breadcrumbsFor(locale as Locale, [{ name: t("title"), href: "/faq" }])} />
      <PageHeader
        crumbs={<Breadcrumbs items={[{ label: nav("faq") }]} />}
        title={
          <SplitReveal as="h1" immediate className="text-display-l font-extrabold uppercase wdth-wide [overflow-wrap:break-word] [hyphens:auto] md:[overflow-wrap:normal] lg:text-[clamp(3rem,5.4vw,5.5rem)]">
            {t("title")}
          </SplitReveal>
        }
        intro={<p>{t("intro")}</p>}
      />
      <section className="container-site grid gap-10 pb-24 lg:grid-cols-12 lg:gap-8" aria-label={t("title")}>
        <div className="lg:col-span-8">
          <FaqAccordion headingLevel={2} items={raw.map((item) => ({ id: item.id, q: item.q, a: <WithTodo text={item.a} /> }))} />
        </div>
        <aside className="lg:col-span-4">
          <div className="flex flex-col gap-4 border border-line bg-surface p-6 lg:sticky lg:top-28">
            <h2 className="text-display-s font-bold">{t("notFound")}</h2>
            <p className="text-muted">{t("notFoundBody")}</p>
            <QuoteLink source="faq_aside" className="btn btn-primary self-start">
              {nav("quote")}
            </QuoteLink>
          </div>
        </aside>
      </section>
    </>
  );
}
