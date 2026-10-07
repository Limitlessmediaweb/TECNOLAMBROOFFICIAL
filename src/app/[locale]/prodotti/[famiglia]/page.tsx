import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight, Check } from "lucide-react";
import { routing, type Locale } from "@/i18n/routing";
import { FAMILIES, familyBySlug, type Cell } from "@/data/products";
import { formatGHz } from "@/data/bands";
import { buildMetadata } from "@/lib/seo";
import { breadcrumbsFor } from "@/lib/page";
import { Breadcrumbs, DemoDataTag, PageHeader, WithTodo } from "@/components/ui/Bits";
import { JsonLd } from "@/components/ui/JsonLd";
import { QuoteLink, ShopLink } from "@/components/ui/TrackedLink";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { Stagger } from "@/components/motion/Stagger";
import { MagneticButton } from "@/components/motion/MagneticButton";
import { ExplodedPart } from "@/components/domain/ExplodedPart";
import { ProductGrid } from "@/components/sections/ProductsSection";

type Props = PageProps<"/[locale]/prodotti/[famiglia]">;

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => FAMILIES.map((f) => ({ locale, famiglia: f.slug[locale] })));
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
    href: {
      it: { pathname: "/prodotti/[famiglia]", params: { famiglia: family.slug.it } },
      en: { pathname: "/prodotti/[famiglia]", params: { famiglia: family.slug.en } },
    },
    // Formato del brief "[Famiglia] | Tecnolambro Microwave Components"; se supera 60 caratteri si accorcia.
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

function renderCell(cell: Cell, locale: string, tc: (k: string) => string) {
  if (typeof cell === "string") return cell;
  if ("k" in cell) return tc(cell.k);
  if ("r" in cell) return `${formatGHz(cell.r[0], locale)}-${formatGHz(cell.r[1], locale)}`;
  return `${cell.prefix ?? ""}${formatGHz(cell.n, locale)}${cell.suffix ?? ""}`;
}

export default async function FamilyPage({ params }: Props) {
  const { locale, famiglia } = await params;
  setRequestLocale(locale);
  const family = familyBySlug(famiglia, locale as Locale);
  if (!family) notFound();

  const t = await getTranslations("products");
  const page = await getTranslations("products.page");
  const nav = await getTranslations("nav");
  const name = t(`items.${family.key}.name`);
  const applications = t.raw(`items.${family.key}.applications`) as string[];
  const href = { pathname: "/prodotti/[famiglia]" as const, params: { famiglia: family.slug[locale as Locale] } };

  return (
    <>
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
          <MagneticButton>
            <QuoteLink source={`family_${family.key}`} href={{ pathname: "/contatti", query: { famiglia: family.key }, hash: "preventivo" }} className="btn btn-primary">
              {nav("quote")}
              <ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.75} />
            </QuoteLink>
          </MagneticButton>
          {family.key !== "custom" ? (
            <ShopLink source={`family_${family.key}`} className="btn btn-ghost">
              {nav("shop")}
            </ShopLink>
          ) : null}
        </div>
      </PageHeader>

      <ExplodedPart
        family={family.key}
        locale={locale}
        title={page("drawingLabel", { name })}
        caption={page("drawingCaption")}
        labels={{
          flange: page("partFlange"),
          body: page("partBody"),
          gasket: page("partGasket"),
          screws: page("partScrews"),
          cover: page("partCover"),
          horn: page("partHorn"),
          taper: page("partTaper"),
        }}
      />

      <section className="section-y border-t border-line" aria-labelledby="sizes-title">
        <div className="container-site grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-4">
            <h2 id="sizes-title" className="text-display-m font-bold">
              {family.key === "custom" ? page("processTitle") : page("tableTitle")}
            </h2>
            {family.table.demo ? (
              <div className="mt-5">
                <DemoDataTag />
              </div>
            ) : null}
          </div>
          <div className="min-w-0 lg:col-span-8">
            <div className="relative overflow-x-auto" data-lenis-prevent tabIndex={0} role="region" aria-labelledby="sizes-title">
              <table className="spec-table min-w-[36rem]">
                <caption className="sr-only">{page("tableCaption", { name })}</caption>
                <thead>
                  <tr>
                    {family.table.columns.map((c) => (
                      <th key={c} scope="col">
                        {t(`columns.${c}`)}
                      </th>
                    ))}
                    {family.sizes.length ? (
                      <th scope="col">
                        <span className="sr-only">{nav("quote")}</span>
                      </th>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {family.table.rows.map((row, i) => {
                    const size = typeof row[0] === "string" && row[0].startsWith("WR-") ? row[0] : null;
                    return (
                      <tr key={i}>
                        {row.map((cell, j) => (
                          <td key={j} className={j > 0 ? "text-muted" : undefined}>
                            {renderCell(cell, locale, (k) => t(`cells.${k}`))}
                          </td>
                        ))}
                        {family.sizes.length ? (
                          <td className="text-right">
                            {size ? (
                              <QuoteLink
                                source={`table_${family.key}`}
                                href={{ pathname: "/contatti", query: { misura: size, famiglia: family.key }, hash: "preventivo" }}
                                className="annot whitespace-nowrap text-accent underline underline-offset-4 hover:text-fg"
                              >
                                {page("askSize", { size })}
                              </QuoteLink>
                            ) : null}
                          </td>
                        ) : null}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

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
          {family.key !== "custom" ? (
            <div className="flex flex-col gap-4 border border-line bg-surface p-7">
              <h2 className="text-display-s font-bold">{page("shopTitle")}</h2>
              <p className="text-muted">{page("shopBody")}</p>
              <ShopLink source={`family_bottom_${family.key}`} className="btn btn-ghost mt-auto self-start">
                {nav("shop")}
              </ShopLink>
            </div>
          ) : null}
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
    </>
  );
}
