import { getLocale, getTranslations } from "next-intl/server";
import { ArrowUpRight, Factory, FlaskConical, Radar, RadioTower, SatelliteDish, Tv } from "lucide-react";
import { LocalLink as Link } from "@/components/ui/LocalLink";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { Stagger } from "@/components/motion/Stagger";
import { SIZES, range } from "@/data/waveguides";
import { wrSlug } from "@/lib/wr-page";

const APPS = [
  { key: "radar", Icon: Radar },
  { key: "telecom", Icon: RadioTower },
  { key: "satcom", Icon: SatelliteDish },
  { key: "broadcast", Icon: Tv },
  { key: "research", Icon: FlaskConical },
  { key: "industry", Icon: Factory },
] as const;

/** Dove si usano le guide d'onda: sei settori, testi generici (nessun cliente citato). */
export async function ApplicationsSection({ headingLevel = 2 }: { headingLevel?: 2 | 3 }) {
  const t = await getTranslations("applications");
  const H = `h${headingLevel + 1}` as "h3" | "h4";
  return (
    <section className="section-y border-t border-line" aria-labelledby="apps-section-title">
      <div className="container-site">
        <SplitReveal id="apps-section-title" as={headingLevel === 2 ? "h2" : "h3"} className="max-w-[18ch] text-display-l font-bold">
          {t("title")}
        </SplitReveal>
        <p className="mt-5 max-w-[56ch] text-lead text-muted">{t("body")}</p>
        <Stagger as="ul" className="mt-12 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {APPS.map(({ key, Icon }) => (
            <li key={key} className="flex flex-col gap-4 bg-bg p-6 sm:p-7">
              <Icon aria-hidden="true" className="size-7 text-accent" strokeWidth={1.5} />
              <H className="text-display-s font-bold">{t(`items.${key}.title`)}</H>
              <p className="text-muted">{t(`items.${key}.body`)}</p>
            </li>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

/** Le 14 misure, ognuna con la sua pagina. */
export async function SizeIndex() {
  const t = await getTranslations("wrPage");
  const locale = await getLocale();
  return (
    <section className="section-y border-t border-line" aria-labelledby="size-index-title">
      <div className="container-site">
        <h2 id="size-index-title" className="text-display-m font-bold">
          {t("indexTitle")}
        </h2>
        <p className="mt-3 max-w-[60ch] text-muted">{t("indexBody")}</p>
        <ul className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {SIZES.map((s) => (
            <li key={s.wr}>
              <Link
                href={{ pathname: "/prodotti/guida-flessibile/[wr]", params: { wr: wrSlug(s.wr) } }}
                className="group flex h-full flex-col gap-1 border border-line bg-surface p-4 transition-colors hover:border-accent"
              >
                <span className="flex items-center justify-between font-display text-lg font-bold wdth-wide">
                  {s.wr}
                  <ArrowUpRight aria-hidden="true" className="size-4 text-muted transition-colors group-hover:text-accent" strokeWidth={1.75} />
                </span>
                <span className="annot tabular text-primary-ink">{range(s.min, s.max, locale)} GHz</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
