import { getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { LocalLink as Link } from "@/components/ui/LocalLink";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { Counter } from "@/components/motion/Counter";
import { Stagger } from "@/components/motion/Stagger";
import { PhotoPlaceholder } from "@/components/ui/Bits";
import { COMPANY, yearsActive } from "@/data/site";

/** L'azienda: frase forte e quattro dati veri (1986, anni di attività, guida flessibile in casa, 24 h). */
export async function CompanySection() {
  const t = await getTranslations("company");
  const about = await getTranslations("aboutPage");
  const years = yearsActive();

  return (
    <section className="section-y" aria-labelledby="company-title">
      <div className="container-site grid gap-12 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-7">
          <SplitReveal id="company-title" className="max-w-[18ch] text-display-l font-bold">
            {t("title")}
          </SplitReveal>
          <p className="mt-6 max-w-[56ch] text-lead text-muted">{t("body")}</p>
          <Link href="/azienda" className="mt-8 inline-flex items-center gap-2 font-medium text-fg underline decoration-accent underline-offset-4 hover:text-accent">
            {t("cta")}
            <ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.75} />
          </Link>
        </div>

        <PhotoPlaceholder ratio="4/3" caption={about("photoTodo")} className="lg:col-span-5 lg:mt-2" />

        <Stagger as="dl" className="grid grid-cols-2 gap-px border border-line bg-line lg:col-span-12 lg:grid-cols-4">
          <div className="flex flex-col gap-3 bg-bg p-5 sm:p-7">
            <dt className="text-sm text-muted">{t("factFounded")}</dt>
            <dd className="order-first font-display text-display-l font-extrabold tabular wdth-wide">
              <Counter value={COMPANY.founded} from={1950} />
            </dd>
          </div>
          <div className="flex flex-col gap-3 bg-bg p-5 sm:p-7">
            <dt className="text-sm text-muted">{t("factYears")}</dt>
            <dd className="order-first font-display text-display-l font-extrabold tabular wdth-wide">
              <Counter value={years} />
            </dd>
          </div>
          <div className="flex flex-col gap-3 bg-[color-mix(in_srgb,var(--c-accent)_10%,var(--c-bg))] p-5 sm:p-7">
            <dt className="text-sm text-muted">{t("factFlex")}</dt>
            <dd className="order-first font-display text-display-l font-extrabold text-accent wdth-normal">{t("factFlexValue")}</dd>
          </div>
          <div className="flex flex-col gap-3 bg-bg p-5 sm:p-7">
            <dt className="text-sm text-muted">{t("factReply")}</dt>
            <dd className="order-first font-display text-display-l font-extrabold tabular wdth-wide">{t("factReplyValue")}</dd>
          </div>
        </Stagger>
      </div>
    </section>
  );
}
