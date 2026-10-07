import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Radio, Satellite } from "lucide-react";
import type { Locale } from "@/i18n/routing";
import { pageMetadata, breadcrumbsFor } from "@/lib/page";
import { Breadcrumbs, PageHeader, WithTodo } from "@/components/ui/Bits";
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
          <ShopLink source="ham_header" query={{ linea: "ham" }} className="btn btn-primary">
            {nav("shop")}
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
              <Satellite aria-hidden="true" className="size-7 text-accent" strokeWidth={1.5} />
              <p className="text-lead">{t("bandQo")}</p>
            </li>
          </Stagger>
        </div>
      </section>

      <section className="border-t border-line" aria-labelledby="ham-products">
        <div className="container-site grid gap-4 py-16 md:grid-cols-2">
          <div className="flex flex-col gap-4 border border-dashed border-line-strong p-7">
            <h2 id="ham-products" className="text-display-m font-bold">
              {t("productsTitle")}
            </h2>
            <p>
              <WithTodo text={t("productsTodo")} />
            </p>
          </div>
          <div className="flex flex-col gap-4 border border-accent/50 bg-[color-mix(in_srgb,var(--c-accent)_9%,var(--c-bg))] p-7">
            <h2 className="text-display-m font-bold">{t("shopTitle")}</h2>
            <p className="text-muted">{t("shopBody")}</p>
            <ShopLink source="ham_bottom" query={{ linea: "ham" }} className="btn btn-primary mt-auto self-start">
              {nav("shop")}
            </ShopLink>
          </div>
        </div>
      </section>

      <BandFinderSection formOnPage={false} />
    </>
  );
}
