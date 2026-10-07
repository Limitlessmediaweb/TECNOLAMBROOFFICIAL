import { getLocale, getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { TE10Field } from "@/components/domain/TE10Field";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { ScrambleText } from "@/components/motion/ScrambleText";
import { MagneticButton } from "@/components/motion/MagneticButton";
import { QuoteLink, ShopLink } from "@/components/ui/TrackedLink";
import { BANDS, formatRange } from "@/data/bands";
import { MotionToggle } from "@/components/ui/MotionToggle";

export async function Hero() {
  const t = await getTranslations("hero");
  const nav = await getTranslations("nav");
  const locale = await getLocale();
  const wr90 = BANDS.find((b) => b.wr === "WR-90")!;

  return (
    <section data-motion-host className="relative isolate flex min-h-[100dvh] flex-col overflow-hidden pt-16 lg:pt-[4.5rem]">
      {/* Campo TE10: sfondo vivo dell'hero */}
      <div className="absolute inset-0 -z-10">
        <TE10Field label={t("fieldLabel")} className="opacity-70 lg:opacity-100" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,transparent_45%,var(--c-bg)_96%)] lg:bg-[linear-gradient(90deg,var(--c-bg)_0%,color-mix(in_srgb,var(--c-bg)_70%,transparent)_34%,transparent_60%),linear-gradient(180deg,transparent_70%,var(--c-bg)_100%)]" />
      </div>

      <div className="container-site flex flex-1 flex-col justify-end pb-10 pt-[38svh] sm:pt-[34svh] lg:justify-center lg:pb-16 lg:pt-10">
        <SplitReveal
          as="h1"
          immediate
          delay={0.1}
          className="max-w-[13ch] font-display text-display-xl font-extrabold uppercase tracking-[-0.02em] wdth-wide"
        >
          <span className="block">{t("titleA")}</span>{" "}
          <span className="block font-light normal-case text-accent wdth-narrow">{t("titleB")}</span>
        </SplitReveal>

        <p className="mt-6 max-w-[44ch] text-lead text-muted">{t("sub")}</p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <MagneticButton>
            <QuoteLink source="hero" href={{ pathname: "/", hash: "preventivo" }} className="btn btn-primary">
              {nav("quote")}
              <ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.75} />
            </QuoteLink>
          </MagneticButton>
          <ShopLink source="hero" className="btn btn-ghost">
            {nav("shop")}
          </ShopLink>
        </div>
      </div>

      {/* Legenda tecnica del campo */}
      <aside
        aria-label={t("legendTitle")}
        className="container-site pb-8 lg:absolute lg:bottom-10 lg:right-0 lg:w-auto lg:pb-0"
      >
        <div className="flex items-center justify-end gap-4">
        <MotionToggle />
        <dl className="annot grid w-max grid-cols-[auto_auto] gap-x-6 gap-y-1 border-l border-accent/60 pl-4 text-muted">
          <dt>{t("legendMode")}</dt>
          <dd className="text-fg">
            <ScrambleText text="TE10" />
          </dd>
          <dt>{t("legendGuide")}</dt>
          <dd className="text-fg">
            <ScrambleText text={`${wr90.wr} · ${wr90.iec}`} />
          </dd>
          <dt>{t("legendBand")}</dt>
          <dd className="text-fg">
            <ScrambleText text={formatRange(wr90, locale)} />
          </dd>
        </dl>
        </div>
      </aside>
    </section>
  );
}
