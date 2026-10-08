import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight, Check, FileDown, FilePlus2 } from "lucide-react";
import { routing, type Locale } from "@/i18n/routing";
import { VISIBLE_FAMILIES, familyBySlug, familyModel, familySlug } from "@/data/families";
import { buildMetadata } from "@/lib/seo";
import { breadcrumbsFor } from "@/lib/page";
import { familyTexts } from "@/lib/families-text";
import { Breadcrumbs, PageHeader, WithTodo } from "@/components/ui/Bits";
import { JsonLd } from "@/components/ui/JsonLd";
import { PageMessages } from "@/components/ui/PageMessages";
import { LocalLink as Link } from "@/components/ui/LocalLink";
import { QuoteLink, ShopLink, localizedHref } from "@/components/ui/TrackedLink";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { Stagger } from "@/components/motion/Stagger";
import { MagneticButton } from "@/components/motion/MagneticButton";
import { ExplodedPart } from "@/components/domain/ExplodedPart";
import { ProductGrid } from "@/components/sections/ProductsSection";
import { SpecTables } from "@/components/tables/SpecTables";
import { FamilyGallery } from "@/components/sections/PeopleAndPhotos";
import { AddCustomButton } from "@/components/request/AddCustomButton";
import { FamilyDemo3D } from "@/components/configurator/FamilyDemo3D";
import { TYPE_PARAM } from "@/data/configurator/defaults";

type Props = PageProps<"/[locale]/prodotti/[famiglia]">;

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => VISIBLE_FAMILIES.map((f) => ({ locale, famiglia: familySlug(f, locale) })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, famiglia } = await params;
  const family = familyBySlug(famiglia, locale as Locale);
  if (!family) return {};
  const t = await getTranslations({ locale, namespace: "products.items" });
  const m = await getTranslations({ locale, namespace: "meta.family" });
  const name = t(`${family.key}.name`);
  const description = t(`${family.key}.description`);
  return buildMetadata({
    locale: locale as Locale,
    href: Object.fromEntries(routing.locales.map((l) => [l, { pathname: "/prodotti/[famiglia]" as const, params: { famiglia: familySlug(family, l) } }])) as Record<Locale, { pathname: "/prodotti/[famiglia]"; params: { famiglia: string } }>,
    title: fitTitle(m("title", { name }), name),
    description: fitDescription(description),
  });
}

function fitTitle(full: string, name: string): string {
  return full.length <= 60 ? full : `${name} | Tecnolambro`;
}

/** ≤ 155 caratteri: frasi intere se bastano a una buona lunghezza, altrimenti taglio a fine parola. */
function fitDescription(text: string): string {
  if (text.length <= 155) return text;
  const sentence = text.slice(0, text.lastIndexOf(".", 154) + 1);
  if (sentence.length >= 100) return sentence;
  const cut = text.slice(0, 152);
  return `${cut.slice(0, cut.lastIndexOf(" ")).replace(/[,;:]$/, "")}…`;
}

export default async function FamilyPage({ params }: Props) {
  const { locale, famiglia } = await params;
  setRequestLocale(locale);
  const family = familyBySlug(famiglia, locale as Locale);
  if (!family) notFound();

  const t = await getTranslations("products");
  const page = await getTranslations("products.page");
  const nav = await getTranslations("nav");
  const wr = await getTranslations("wrPage");
  const name = t(`items.${family.key}.name`);
  const applications = t.raw(`items.${family.key}.applications`) as string[];
  const href = { pathname: "/prodotti/[famiglia]" as const, params: { famiglia: familySlug(family, locale) } };
  const { names } = await familyTexts();
  const shopPath = await localizedHref("/shop");
  const shopQuery = family.partType ? { tipo: TYPE_PARAM[family.partType] } : undefined;
  const model = familyModel(family);
  const COMPOSE: Record<string, string> = { bends: "composeBends", twists: "composeTwists", offsets: "composeOffsets" };
  const composeLabel = COMPOSE[family.key] ? page(COMPOSE[family.key]) : nav("shop");

  return (
    <PageMessages namespaces={["tables", "configurator"]}>
      <JsonLd
        data={await breadcrumbsFor(locale as Locale, [
          { name: page("title"), href: "/prodotti" },
          { name, href },
        ])}
      />
      <PageHeader
        crumbs={<Breadcrumbs items={[{ label: page("title"), href: "/prodotti" }, { label: name }]} />}
        title={
          <SplitReveal as="h1" immediate className="text-display-l font-extrabold uppercase wdth-wide [overflow-wrap:break-word] [hyphens:auto] md:[overflow-wrap:normal] lg:text-[clamp(3rem,5.4vw,5.5rem)]">
            {name}
          </SplitReveal>
        }
        intro={<p>{t(`items.${family.key}.description`)}</p>}
      >
        <div className="flex flex-wrap gap-3">
          {family.partType ? (
            <MagneticButton>
              <ShopLink source={`family_${family.key}`} query={shopQuery} hash="configura" className="btn btn-primary">
                {composeLabel}
              </ShopLink>
            </MagneticButton>
          ) : null}
          <QuoteLink source={`family_${family.key}`} href={{ pathname: "/contatti", query: { famiglia: family.key }, hash: "preventivo" }} className={family.partType ? "btn btn-ghost" : "btn btn-primary"}>
            {nav("quote")}
            <ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.75} />
          </QuoteLink>
        </div>
      </PageHeader>

      <FamilyGallery family={family.key} familyName={name} />

      <ExplodedPart
        family={family.drawing}
        twist={family.key === "twistable"}
        locale={locale}
        title={page("drawingLabel", { name })}
        caption={page("drawingCaption")}
        labels={{ flange: page("partFlange"), body: page("partBody"), gasket: page("partGasket") }}
      />

      {model && !family.table ? (
        <section className="section-y border-t border-line" aria-labelledby="demo-title">
          <div className="container-site">
            <h2 id="demo-title" className="mb-3 text-display-m font-bold">
              {page("demoTitle")}
            </h2>
            <p className="mb-6 max-w-[60ch] text-muted">{page("demoBody")}</p>
            <a href={`/schede/${locale}/${family.key}.pdf`} download className="btn btn-ghost btn-sm mb-8" data-track="datasheet_download" data-source={`family_${family.key}`}>
              <FileDown aria-hidden="true" className="size-4" strokeWidth={1.75} />
              {wr("datasheet")}
            </a>
            <FamilyDemo3D type={model} shopPath={shopPath} name={name} ctaLabel={composeLabel} />
          </div>
        </section>
      ) : null}

      <section className="section-y border-t border-line" aria-labelledby="sizes-title">
        <div className="container-site">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <h2 id="sizes-title" className="text-display-m font-bold">
              {family.table ? page("tableTitle") : page("onRequestTitle")}
            </h2>
            {family.table ? (
              <Link href="/prodotti/tabelle" className="inline-flex min-h-11 items-center gap-2 font-medium underline decoration-accent underline-offset-4 hover:text-accent">
                {page("tablesLink")}
                <ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.75} />
              </Link>
            ) : null}
          </div>
          {family.table ? (
            <SpecTables defaultTab={family.table} configurePath={shopPath} familyNames={names} headingLevel={3} />
          ) : (
            <div className="grid gap-6 border border-accent/50 bg-[color-mix(in_srgb,var(--c-accent)_8%,var(--c-bg))] p-7 md:grid-cols-[1fr_auto] md:items-center">
              <p className="max-w-[60ch] text-lead">{page("onRequestBody")}</p>
              <AddCustomButton
                href={await localizedHref("/shop/richiesta")}
                label={family.partType ? nav("quote") : page("requestFamily", { name })}
                detail={name}
                icon={<FilePlus2 aria-hidden="true" className="size-4" strokeWidth={1.75} />}
              />
            </div>
          )}
        </div>
      </section>

      {applications.length ? (
        <section className="section-y border-t border-line" aria-labelledby="apps-title">
          <div className="container-site grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8">
            <h2 id="apps-title" className="text-display-m font-bold lg:col-span-4">
              {page("applicationsTitle")}
            </h2>
            <Stagger as="ul" className="grid gap-px border border-line bg-line sm:grid-cols-3 lg:col-span-8">
              {applications.map((a) => (
                <li key={a} className="flex flex-col gap-4 bg-bg p-6">
                  <Check aria-hidden="true" className="size-5 text-accent" strokeWidth={2} />
                  <span className="font-medium">
                    <WithTodo text={a} />
                  </span>
                </li>
              ))}
            </Stagger>
          </div>
        </section>
      ) : null}

      <section className="border-t border-line" aria-label={page("quoteTitle")}>
        <div className="container-site grid gap-4 py-16 md:grid-cols-2">
          <div className="flex flex-col gap-4 border border-accent/50 bg-[color-mix(in_srgb,var(--c-accent)_9%,var(--c-bg))] p-7">
            <h2 className="text-display-s font-bold">{page("quoteTitle")}</h2>
            <p className="text-muted">{page("quoteBody")}</p>
            <QuoteLink
              source={`family_bottom_${family.key}`}
              href={{ pathname: "/contatti", query: { famiglia: family.key }, hash: "preventivo" }}
              className="btn btn-primary mt-auto self-start"
            >
              {nav("quote")}
              <ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.75} />
            </QuoteLink>
          </div>
          <div className="flex flex-col gap-4 border border-line bg-surface p-7">
            <h2 className="text-display-s font-bold">{page("shopTitle")}</h2>
            <p className="text-muted">{page("shopBody")}</p>
            <ShopLink source={`family_bottom_${family.key}`} query={shopQuery} hash="configura" className="btn btn-ghost mt-auto self-start">
              {nav("shop")}
            </ShopLink>
          </div>
        </div>
      </section>

      <section className="section-y border-t border-line" aria-labelledby="others-title">
        <div className="container-site">
          <h2 id="others-title" className="mb-10 text-display-m font-bold">
            {page("others")}
          </h2>
          <ProductGrid exclude={family.key} />
        </div>
      </section>
    </PageMessages>
  );
}
