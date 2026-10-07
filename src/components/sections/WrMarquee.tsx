import { getLocale, getTranslations } from "next-intl/server";
import { Marquee } from "@/components/motion/Marquee";
import { BANDS, formatRange } from "@/data/bands";

/** Nastro con tutte le misure WR e le bande di lavoro (dati standard). */
export async function WrMarquee() {
  const t = await getTranslations("marquee");
  const locale = await getLocale();

  return (
    <Marquee label={t("label")} className="border-y border-line bg-surface py-5">
      {BANDS.map((band) => (
        <span key={band.wr} className="flex items-baseline gap-3 px-7 sm:px-9">
          {/* sezione rettangolare della guida, in scala a × b */}
          <span
            aria-hidden="true"
            className="inline-block self-center border border-accent/80"
            style={{ width: `${band.a * 0.55}px`, height: `${band.b * 0.55}px`, minWidth: 6, minHeight: 3 }}
          />
          <span className="font-display text-2xl font-bold wdth-wide sm:text-[1.75rem]">{band.wr}</span>
          <span className="annot whitespace-nowrap text-primary-ink">{formatRange(band, locale)}</span>
        </span>
      ))}
    </Marquee>
  );
}
