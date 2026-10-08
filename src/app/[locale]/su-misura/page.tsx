import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { FileText, Gauge, Plug, Boxes, FileCode2, Clock, FlaskConical } from "lucide-react";
import type { Locale } from "@/i18n/routing";
import { pageMetadata, breadcrumbsFor } from "@/lib/page";
import { Breadcrumbs, PageHeader, WithTodo } from "@/components/ui/Bits";
import { JsonLd } from "@/components/ui/JsonLd";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { Stagger } from "@/components/motion/Stagger";
import { QuoteLink } from "@/components/ui/TrackedLink";
import { ExplodedPart } from "@/components/domain/ExplodedPart";
import { ProcessSection } from "@/components/sections/HomeSections";
import { QuoteSection } from "@/components/sections/QuoteSection";

export async function generateMetadata({ params }: PageProps<"/[locale]/su-misura">): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, "custom", "/su-misura");
}

const SEND_ICONS = [FileText, Gauge, Plug, Boxes];

export default async function CustomPage({ params }: PageProps<"/[locale]/su-misura">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("customPage");
  const nav = await getTranslations("nav");
  const page = await getTranslations("products.page");
  const send = t.raw("send") as { title: string; body: string }[];

  return (
    <>
      <JsonLd data={await breadcrumbsFor(locale as Locale, [{ name: t("title"), href: "/su-misura" }])} />
      <PageHeader
        crumbs={<Breadcrumbs items={[{ label: t("title") }]} />}
        title={
          <SplitReveal as="h1" immediate className="text-display-l font-extrabold uppercase wdth-wide [overflow-wrap:break-word] [hyphens:auto] md:[overflow-wrap:normal] lg:text-[clamp(3rem,5.4vw,5.5rem)]">
            {t("title")}
          </SplitReveal>
        }
        intro={<p>{t("intro")}</p>}
      >
        <QuoteLink source="custom_header" className="btn btn-primary">
          {nav("quote")}
        </QuoteLink>
      </PageHeader>

      <section className="section-y border-t border-line" aria-labelledby="send-title">
        <div className="container-site">
          <h2 id="send-title" className="text-display-l font-bold">
            {t("sendTitle")}
          </h2>
          <Stagger as="ol" className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {send.map((item, i) => {
              const Icon = SEND_ICONS[i];
              return (
                <li key={item.title} className="flex flex-col gap-4 border border-line bg-surface p-6">
                  <Icon aria-hidden="true" className="size-6 text-accent" strokeWidth={1.5} />
                  <h3 className="text-display-s font-bold">{item.title}</h3>
                  <p className="text-muted">{item.body}</p>
                </li>
              );
            })}
          </Stagger>
        </div>
      </section>

      <ExplodedPart
        family="offset"
        locale={locale}
        title={page("drawingLabel", { name: t("title") })}
        caption={page("drawingCaption")}
        labels={{ flange: page("partFlange"), body: page("partBody"), gasket: page("partGasket") }}
      />

      <section className="border-t border-line" aria-label={t("formatsTitle")}>
        <div className="container-site grid gap-px bg-line py-px md:grid-cols-3">
          {[
            { icon: FileCode2, title: t("formatsTitle"), body: t("formatsBody") },
            { icon: Clock, title: t("timeTitle"), body: t("timeBody") },
            { icon: FlaskConical, title: t("testTitle"), body: t("testBody") },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex flex-col gap-4 bg-bg p-7 lg:p-10">
              <Icon aria-hidden="true" className="size-6 text-primary-ink" strokeWidth={1.5} />
              <h2 className="text-display-s font-bold">{title}</h2>
              <p className="text-muted">
                <WithTodo text={body} />
              </p>
            </div>
          ))}
        </div>
      </section>

      <ProcessSection />
      <QuoteSection title={t("formTitle")} defaultFamily="other" />
    </>
  );
}
