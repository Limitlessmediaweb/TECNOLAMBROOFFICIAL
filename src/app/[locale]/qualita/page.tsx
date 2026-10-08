import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Gauge, Link2 } from "lucide-react";
import { CertificationCards } from "@/components/sections/Certifications";
import type { Locale } from "@/i18n/routing";
import { pageMetadata, breadcrumbsFor } from "@/lib/page";
import { Breadcrumbs, PageHeader } from "@/components/ui/Bits";
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
        <div className="container-site py-16 lg:py-24">
          <h2 id="cert-title" className="text-display-m font-bold">
            {t("certTitle")}
          </h2>
          <p className="mt-3 text-muted">{t("certIntro")}</p>
          <div className="mt-8">
            <CertificationCards />
          </div>
        </div>
      </section>

      <section className="border-t border-line" aria-label={t("controlsTitle")}>
        <div className="container-site grid gap-4 py-16 md:grid-cols-2">
          <Reveal className="flex flex-col gap-4 border border-line bg-surface p-7">
            <Gauge aria-hidden="true" className="size-7 text-primary-ink" strokeWidth={1.5} />
            <h2 className="text-display-s font-bold">{t("controlsTitle")}</h2>
            <p className="text-muted">{t("controlsBody")}</p>
          </Reveal>
          <Reveal className="flex flex-col gap-4 border border-line bg-surface p-7" delay={0.1}>
            <Link2 aria-hidden="true" className="size-7 text-primary-ink" strokeWidth={1.5} />
            <h2 className="text-display-s font-bold">{t("chainTitle")}</h2>
            <p className="text-muted">{t("chainBody")}</p>
          </Reveal>
        </div>
      </section>

      <ProcessSection />
      <FinalCta />
    </>
  );
}
