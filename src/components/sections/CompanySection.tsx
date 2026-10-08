import { getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { LocalLink as Link } from "@/components/ui/LocalLink";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { Counter } from "@/components/motion/Counter";
import { Stagger } from "@/components/motion/Stagger";
import Image from "next/image";
import { publicExists, publicImages } from "@/lib/public-files";
import { PHOTO_DIRS } from "@/data/photos";
import { COMPANY, yearsActive } from "@/data/site";

/** L'azienda: frase forte e quattro dati veri (1987, anni di attività, collaudo al 100%, preventivo entro 24 ore). */
export async function CompanySection() {
  const t = await getTranslations("company");
  const about = await getTranslations("aboutPage");
  const years = yearsActive();
  // foto vera dell'officina appena c'è; fino ad allora il modello 3D del configuratore
  const photo = publicImages(PHOTO_DIRS.workshop)[0];
  const render = publicExists("render/twistable.webp") ? "/render/twistable.webp" : null;

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

        {photo ? (
          <figure className="relative aspect-[4/3] overflow-hidden border border-line lg:col-span-5 lg:mt-2">
            <Image src={photo} alt={about("workshopAlt")} fill sizes="(min-width: 1024px) 40vw, 100vw" className="object-cover" />
          </figure>
        ) : render ? (
          <figure className="grid aspect-[4/3] place-items-center border border-line bg-[radial-gradient(120%_90%_at_50%_30%,var(--c-surface),var(--c-surface-2))] p-6 lg:col-span-5 lg:mt-2">
            <Image src={render} alt={about("imageAlt")} width={640} height={400} sizes="(min-width: 1024px) 40vw, 100vw" className="h-auto w-full" />
          </figure>
        ) : null}

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
