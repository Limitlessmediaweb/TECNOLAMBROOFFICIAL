import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ShieldCheck, Gauge, Link2 } from "lucide-react";
import type { Locale } from "@/i18n/routing";
import { pageMetadata, breadcrumbsFor } from "@/lib/page";
import { Breadcrumbs, PageHeader, WithTodo } from "@/components/ui/Bits";
import { JsonLd } from "@/components/ui/JsonLd";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { Reveal } from "@/components/motion/Reveal";
import { ProcessSection, FinalCta } from "@/components/sections/HomeSections";

export async function generateMetadata({ params }: PageProps<"/[locale]/qualita">): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, "quality", "/qualita");
}

export default async function QualityPage({ params }: PageProps<"/[locale]/qualita">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("qualityPage");

  return (
    <>
      <JsonLd data={await breadcrumbsFor(locale as Locale, [{ name: t("title"), href: "/qualita" }])} />
      <PageHeader
        crumbs={<Breadcrumbs items={[{ label: t("title") }]} />}
        title={
          <SplitReveal as="h1" immediate className="text-display-l font-extrabold uppercase wdth-wide [overflow-wrap:break-word] [hyphens:auto] md:[overflow-wrap:normal] lg:text-[clamp(3rem,5.4vw,5.5rem)]">
            {t("title")}
          </SplitReveal>
        }
        intro={<p>{t("intro")}</p>}
      />

      <section className="border-t border-line" aria-labelledby="cert-title">
        <div className="container-site grid gap-4 py-16 lg:grid-cols-12 lg:py-24">
          <Reveal className="flex flex-col gap-5 border border-dashed border-line-strong p-7 lg:col-span-7 lg:p-10">
            <ShieldCheck aria-hidden="true" className="size-8 text-accent" strokeWidth={1.5} />
            <h2 id="cert-title" className="text-display-m font-bold">
              {t("certTitle")}
            </h2>
            <p className="text-lead">
              <WithTodo text={t("certTodo")} />
            </p>
            <p className="text-muted">{t("certNote")}</p>
          </Reveal>
          <div className="grid gap-4 lg:col-span-5">
            <Reveal className="flex flex-col gap-4 border border-line bg-surface p-7">
              <Gauge aria-hidden="true" className="size-7 text-primary-ink" strokeWidth={1.5} />
              <h2 className="text-display-s font-bold">{t("controlsTitle")}</h2>
              <p className="text-muted">{t("controlsBody")}</p>
              <p className="text-sm">
                <WithTodo text={t("controlsTodo")} />
              </p>
            </Reveal>
            <Reveal className="flex flex-col gap-4 border border-line bg-surface p-7" delay={0.1}>
              <Link2 aria-hidden="true" className="size-7 text-primary-ink" strokeWidth={1.5} />
              <h2 className="text-display-s font-bold">{t("chainTitle")}</h2>
              <p className="text-muted">{t("chainBody")}</p>
            </Reveal>
          </div>
        </div>
      </section>

      <ProcessSection />
      <FinalCta />
    </>
  );
}
