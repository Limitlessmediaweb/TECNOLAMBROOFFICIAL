import { getTranslations } from "next-intl/server";
import { ArrowRight, Check, ShieldCheck, Ruler, Zap, FlaskConical } from "lucide-react";
import { LocalLink as Link } from "@/components/ui/LocalLink";
import { BandFinder } from "@/components/domain/BandFinder";
import { FaqAccordion } from "@/components/domain/FaqAccordion";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { PinnedSteps } from "@/components/motion/PinnedSteps";
import { HorizontalScroll } from "@/components/motion/HorizontalScroll";
import { Reveal } from "@/components/motion/Reveal";
import { DrawUnderline } from "@/components/motion/DrawUnderline";
import { ParallaxLayer } from "@/components/motion/ParallaxLayer";
import { MagneticButton } from "@/components/motion/MagneticButton";
import { QuoteLink, ShopLink } from "@/components/ui/TrackedLink";
import { WithTodo } from "@/components/ui/Bits";
import { IsoBadges } from "@/components/sections/Certifications";
import { FAQ_PREVIEW } from "@/data/faq";
import { COMPANY } from "@/data/site";
import { localizedHref, type Href } from "@/components/ui/TrackedLink";

/* ------------------------------------------------------------ BandFinder */

export async function BandFinderSection({ formOnPage = true }: { formOnPage?: boolean }) {
  const t = await getTranslations("bandFinder");
  const contactPath = await localizedHref("/contatti");
  const configurePath = await localizedHref("/shop");
  return (
    <section id="bande" className="section-y border-t border-line bg-surface/40" aria-labelledby="band-title">
      <div className="container-site">
        <div className="mb-12 max-w-3xl">
          <SplitReveal id="band-title" className="text-display-l font-bold">
            {t("title")}
          </SplitReveal>
          <p className="mt-5 max-w-[52ch] text-lead text-muted">{t("body")}</p>
        </div>
        <BandFinder formOnPage={formOnPage} contactPath={contactPath} configurePath={configurePath} />
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- Process */

export async function ProcessSection() {
  const t = await getTranslations("process");
  const steps = t.raw("steps") as { title: string; body: string }[];
  return (
    <div className="border-t border-line">
      <PinnedSteps
        steps={steps}
        heading={
          <SplitReveal className="max-w-[14ch] text-display-l font-bold" by="words">
            {t("title")}
          </SplitReveal>
        }
      />
    </div>
  );
}

/* --------------------------------------------------------------- History */

export async function HistorySection({ headingLevel = 2 }: { headingLevel?: 2 | 3 }) {
  const t = await getTranslations("history");
  const items = t.raw("items") as { label: string; body: string }[];
  const H = `h${headingLevel}` as "h2" | "h3";
  return (
    <HorizontalScroll
      className="border-t border-line"
      label={t("titleShort")}
      heading={
        <div className="flex flex-wrap items-end justify-between gap-6">
          <H className="max-w-[18ch] text-display-l font-bold">{t("title")}</H>
          <span aria-hidden="true" className="font-display text-[clamp(4.5rem,12vw,11rem)] font-extrabold leading-none text-transparent wdth-xwide [-webkit-text-stroke:1.5px_var(--c-accent)]">
            {COMPANY.founded}
          </span>
        </div>
      }
    >
      <ol className="flex gap-5 lg:gap-8">
        {items.map((item, i) => (
          <li key={item.label} className="relative w-[78vw] max-w-[26rem] shrink-0 snap-start border-t border-accent/70 pt-6 sm:w-[22rem] lg:w-[26rem]">
            <span aria-hidden="true" className="absolute -top-[5px] left-0 size-2.5 rounded-full bg-accent" />
            <p className={i === 0 ? "font-display text-display-m font-extrabold text-accent wdth-wide" : "font-display text-display-s font-bold wdth-wide"}>{item.label}</p>
            <p className="mt-3 text-muted">{item.body}</p>
          </li>
        ))}
      </ol>
    </HorizontalScroll>
  );
}

/* --------------------------------------------------------------- Quality */

export async function QualitySection() {
  const t = await getTranslations("qualitySection");
  const qualityHref = await localizedHref("/qualita");
  const controls = t.raw("controls") as string[];
  const icons = [Zap, Ruler, FlaskConical];
  return (
    <section className="section-y border-t border-line" aria-labelledby="quality-title">
      <div className="container-site grid gap-10 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-5">
          <SplitReveal id="quality-title" className="max-w-[14ch] text-display-l font-bold">
            {t("title")}
          </SplitReveal>
          <p className="mt-5 max-w-[44ch] text-lead text-muted">{t("body")}</p>
          <Link href="/qualita" className="mt-8 inline-flex items-center gap-2 font-medium underline decoration-accent underline-offset-4 hover:text-accent">
            {t("cta")}
            <ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.75} />
          </Link>
        </div>
        <Reveal className="grid gap-4 sm:grid-cols-2 lg:col-span-7">
          <div className="flex flex-col gap-4 border border-line bg-surface p-6">
            <ShieldCheck aria-hidden="true" className="size-7 text-accent" strokeWidth={1.5} />
            <h3 className="text-display-s font-bold">{t("certTitle")}</h3>
            <p className="text-sm text-muted">{t("certBody")}</p>
            <IsoBadges href={qualityHref} />
          </div>
          <div className="flex flex-col gap-4 border border-line bg-surface p-6">
            <h3 className="text-display-s font-bold">{t("controlsTitle")}</h3>
            <ul className="grid gap-3">
              {controls.map((c, i) => {
                const Icon = icons[i] ?? Check;
                return (
                  <li key={c} className="flex items-center gap-3 text-muted">
                    <Icon aria-hidden="true" className="size-5 shrink-0 text-primary-ink" strokeWidth={1.5} />
                    {c}
                  </li>
                );
              })}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ Shop */

export async function ShopSection() {
  const t = await getTranslations("shopSection");
  const points = t.raw("points") as string[];
  return (
    <section className="relative isolate overflow-hidden border-y border-accent/40 bg-[color-mix(in_srgb,var(--c-accent)_9%,var(--c-bg))]" aria-labelledby="shop-title">
      <ParallaxLayer className="pointer-events-none absolute -right-20 top-0 -z-10 h-full w-[60%] opacity-40" speed={18}>
        <svg aria-hidden="true" viewBox="0 0 400 400" className="h-full w-full">
          {Array.from({ length: 9 }).map((_, i) => (
            <rect key={i} x={40 + i * 14} y={60 + i * 14} width={320 - i * 28} height={160 - i * 14} fill="none" stroke="var(--c-accent)" strokeWidth="1" opacity={0.15 + i * 0.06} />
          ))}
        </svg>
      </ParallaxLayer>
      <div className="container-site grid gap-10 py-16 lg:grid-cols-12 lg:items-center lg:py-24">
        <div className="lg:col-span-7">
          <h2 id="shop-title" className="max-w-[18ch] text-display-l font-bold">
            {t("title")}
          </h2>
          <p className="mt-5 max-w-[50ch] text-lead text-muted">{t("body")}</p>
        </div>
        <div className="lg:col-span-5">
          <ul className="grid gap-3">
            {points.map((p) => (
              <li key={p} className="flex items-center gap-3 font-medium">
                <Check aria-hidden="true" className="size-5 text-accent" strokeWidth={2} />
                {p}
              </li>
            ))}
          </ul>
          <MagneticButton className="mt-8 inline-block">
            <ShopLink source="shop_section" className="btn btn-primary">
              {t("cta")}
            </ShopLink>
          </MagneticButton>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------- FAQ */

export async function FaqPreviewSection() {
  const t = await getTranslations("faqSection");
  const f = await getTranslations("faq.items");
  const c = await getTranslations("common");
  const items = FAQ_PREVIEW.map((item) => ({ id: item.id, q: f(`${item.id}.q`), a: <WithTodo text={f(`${item.id}.a`)} /> }));
  return (
    <section className="section-y border-t border-line" aria-labelledby="faq-title">
      <div className="container-site grid gap-10 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-4">
          <h2 id="faq-title" className="text-display-l font-bold">
            {t("title")}
          </h2>
          <p className="mt-5 max-w-[36ch] text-muted">{t("body")}</p>
          <Link href="/faq" className="btn btn-ghost mt-8">
            {c("allQuestions")}
            <ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.75} />
          </Link>
        </div>
        <div className="lg:col-span-8">
          <FaqAccordion items={items} />
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- Final CTA */

export async function FinalCta({ href }: { href?: Href } = {}) {
  const t = await getTranslations("finalCta");
  return (
    <section className="section-y border-t border-line" aria-labelledby="final-title">
      <div className="container-site text-center">
        <h2 id="final-title" className="mx-auto max-w-[16ch] text-display-l font-extrabold uppercase wdth-wide [overflow-wrap:break-word] sm:text-display-xl">
          {t("title")}
        </h2>
        <p className="mx-auto mt-6 max-w-[40ch] text-lead text-muted">
          {(() => {
            // sottolineata solo la parola chiave prima dei due punti: il resto va a capo su telefono
            const [key, ...rest] = t("body").split(":");
            return rest.length ? (
              <>
                <DrawUnderline>{key}</DrawUnderline>:{rest.join(":")}
              </>
            ) : (
              t("body")
            );
          })()}
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <MagneticButton>
            <QuoteLink source="final_cta" href={href} className="btn btn-primary">
              {t("quote")}
              <ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.75} />
            </QuoteLink>
          </MagneticButton>
          <ShopLink source="final_cta" className="btn btn-ghost">
            {t("shop")}
          </ShopLink>
        </div>
      </div>
    </section>
  );
}
