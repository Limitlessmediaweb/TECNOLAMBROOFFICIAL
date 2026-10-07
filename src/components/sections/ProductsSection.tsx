import { getLocale, getTranslations } from "next-intl/server";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { LocalLink as Link } from "@/components/ui/LocalLink";
import type { Locale } from "@/i18n/routing";
import { FAMILIES, type FamilyKey } from "@/data/products";
import { TiltCard } from "@/components/motion/TiltCard";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { Stagger } from "@/components/motion/Stagger";
import { ScrambleText } from "@/components/motion/ScrambleText";
import { PartDrawing } from "@/components/domain/PartDrawings";
import { cn } from "@/lib/cn";

/** Disposizione asimmetrica: righe di larghezza diversa invece di una griglia 3×2 uniforme. */
const LAYOUT: Record<FamilyKey, string> = {
  rigid: "lg:col-span-4",
  flexible: "lg:col-span-2 lg:row-span-2",
  feeds: "lg:col-span-2",
  transitions: "lg:col-span-2",
  flanges: "lg:col-span-3",
  custom: "lg:col-span-3",
};

function sizeRange(sizes: string[]): string | null {
  if (!sizes.length) return null;
  return sizes.length === 1 ? sizes[0] : `${sizes[0]} - ${sizes[sizes.length - 1]}`;
}

export async function ProductGrid({ exclude, headingLevel = 3 }: { exclude?: FamilyKey; headingLevel?: 2 | 3 }) {
  const t = await getTranslations("products.items");
  const s = await getTranslations("productsSection");
  const locale = (await getLocale()) as Locale;
  const H = `h${headingLevel}` as "h2" | "h3";
  const items = FAMILIES.filter((f) => f.key !== exclude);

  return (
    <Stagger as="ul" className={cn("grid gap-4 sm:grid-cols-2", exclude ? "lg:grid-cols-5" : "lg:grid-cols-6")}>
      {items.map((family) => {
        const range = sizeRange(family.sizes);
        const featured = family.key === "flexible" && !exclude;
        return (
          <li key={family.key} className={cn(!exclude && LAYOUT[family.key], exclude && "lg:col-span-1")}>
            <TiltCard className="h-full">
              <article
                className={cn(
                  "group relative flex h-full flex-col overflow-hidden border border-line bg-surface p-5 transition-colors duration-300 hover:border-accent sm:p-6",
                  featured && "bg-[color-mix(in_srgb,var(--c-accent)_8%,var(--c-surface))]",
                )}
              >
                <div className={cn("relative -mx-2 mb-5", featured ? "lg:my-auto lg:origin-center lg:scale-[1.3] lg:py-10" : "")}>
                  <PartDrawing family={family.key} compact className="h-auto w-full transition-transform duration-500 group-hover:scale-[1.03]" />
                </div>
                <H className="text-display-s font-bold">
                  <Link
                    href={{ pathname: "/prodotti/[famiglia]", params: { famiglia: family.slug[locale] } }}
                    className="after:absolute after:inset-0 after:content-['']"
                    aria-label={s("open", { name: t(`${family.key}.name`) })}
                  >
                    {t(`${family.key}.name`)}
                  </Link>
                </H>
                <p className="mt-2 text-muted">{t(`${family.key}.short`)}</p>
                <div className="mt-auto flex items-center justify-between gap-4 pt-6">
                  {range ? <ScrambleText text={range} trigger="hover" className="annot text-primary-ink" /> : <span className="annot text-primary-ink">PDF · DWG · DXF · STEP</span>}
                  <span aria-hidden="true" className="grid size-9 place-items-center rounded-full border border-line-strong transition-colors group-hover:border-accent group-hover:bg-accent group-hover:text-on-accent">
                    <ArrowUpRight className="size-4" strokeWidth={1.75} />
                  </span>
                </div>
              </article>
            </TiltCard>
          </li>
        );
      })}
    </Stagger>
  );
}

export async function ProductsSection() {
  const s = await getTranslations("productsSection");

  return (
    <section className="section-y border-t border-line" aria-labelledby="products-title">
      <div className="container-site">
        <SplitReveal id="products-title" className="max-w-[16ch] text-display-l font-bold">
          {s("title")}
        </SplitReveal>
        <p className="mt-5 max-w-[52ch] text-lead text-muted">{s("body")}</p>
        <div className="mt-12">
          <ProductGrid />
        </div>
        <Link href="/prodotti" className="btn btn-ghost mt-10">
          {s("cta")}
          <ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.75} />
        </Link>
      </div>
    </section>
  );
}
