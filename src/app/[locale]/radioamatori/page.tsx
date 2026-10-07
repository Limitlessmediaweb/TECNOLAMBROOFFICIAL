import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Radio, SlidersHorizontal } from "lucide-react";
import type { Locale } from "@/i18n/routing";
import { pageMetadata, breadcrumbsFor } from "@/lib/page";
import { Breadcrumbs, PageHeader } from "@/components/ui/Bits";
import { JsonLd } from "@/components/ui/JsonLd";
import { ShopLink } from "@/components/ui/TrackedLink";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { Stagger } from "@/components/motion/Stagger";
import { MagneticButton } from "@/components/motion/MagneticButton";
import { BandFinderSection } from "@/components/sections/HomeSections";

export async function generateMetadata({ params }: PageProps<"/[locale]/radioamatori">): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, "ham", "/radioamatori");
}

/** Guide d'onda per i 10 GHz: porta al configuratore con WR-90 o WR-75 già scelte. */
export default async function HamPage({ params }: PageProps<"/[locale]/radioamatori">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("hamPage");
  const nav = await getTranslations("nav");

  return (
    <>
      <JsonLd data={await breadcrumbsFor(locale as Locale, [{ name: t("title"), href: "/radioamatori" }])} />
      <PageHeader
        crumbs={<Breadcrumbs items={[{ label: nav("ham") }]} />}
        title={
          <SplitReveal as="h1" immediate className="max-w-[18ch] text-display-l font-extrabold uppercase wdth-wide [overflow-wrap:break-word] [hyphens:auto] md:[overflow-wrap:normal] lg:text-[clamp(3rem,5.4vw,5.5rem)]">
            {t("title")}
          </SplitReveal>
        }
        intro={<p>{t("intro")}</p>}
      >
        <MagneticButton>
          <ShopLink source="ham_header" query={{ tipo: "twistable", misura: "WR-90" }} hash="configura" className="btn btn-primary">
            {t("configureWr90")}
          </ShopLink>
        </MagneticButton>
      </PageHeader>

      <section className="section-y border-t border-line" aria-labelledby="ham-bands">
        <div className="container-site">
          <h2 id="ham-bands" className="text-display-l font-bold">
            {t("bandsTitle")}
          </h2>
          <Stagger as="ul" className="mt-10 grid gap-4 md:grid-cols-2">
            <li className="flex flex-col gap-4 border border-line bg-surface p-7">
              <Radio aria-hidden="true" className="size-7 text-accent" strokeWidth={1.5} />
              <p className="text-lead">{t("band10")}</p>
            </li>
            <li className="flex flex-col gap-4 border border-line bg-surface p-7">
              <SlidersHorizontal aria-hidden="true" className="size-7 text-accent" strokeWidth={1.5} />
              <p className="text-lead">{t("bandCustom")}</p>
            </li>
          </Stagger>
        </div>
      </section>

      <section className="border-t border-line" aria-labelledby="ham-configure">
        <div className="container-site py-16">
          <div className="flex flex-col gap-4 border border-accent/50 bg-[color-mix(in_srgb,var(--c-accent)_9%,var(--c-bg))] p-7">
            <h2 id="ham-configure" className="text-display-m font-bold">
              {t("shopTitle")}
            </h2>
            <p className="max-w-[60ch] text-muted">{t("shopBody")}</p>
            <div className="mt-2 flex flex-wrap gap-3">
              <ShopLink source="ham_wr90" query={{ tipo: "twistable", misura: "WR-90" }} hash="configura" className="btn btn-primary">
                {t("configureWr90")}
              </ShopLink>
              <ShopLink source="ham_wr75" query={{ tipo: "twistable", misura: "WR-75" }} hash="configura" className="btn btn-ghost">
                {t("configureWr75")}
              </ShopLink>
            </div>
          </div>
        </div>
      </section>

      <BandFinderSection formOnPage={false} />
    </>
  );
}
