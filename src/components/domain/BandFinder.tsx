"use client";

import { useId, useMemo, useRef, useState } from "react";
import NextLink from "next/link";
import { useClientLocale, useT } from "@/lib/client-i18n";
import { Minus, Plus, ArrowRight } from "lucide-react";
import { FREQ_RANGE, SIZES, cutoffGHz, num, sizesFor } from "@/data/waveguides";

const formatGHz = (value: number, locale: string, digits = 2) => num(value, locale, 0, digits);
import { track } from "@/lib/analytics";
import { cn } from "@/lib/cn";

const LN_MIN = Math.log(FREQ_RANGE.min);
const LN_MAX = Math.log(FREQ_RANGE.max);
const STEPS = 1000;

const toPos = (ghz: number) => (Math.log(ghz) - LN_MIN) / (LN_MAX - LN_MIN);
const fromSlider = (v: number) => Math.round(Math.exp(LN_MIN + (v / STEPS) * (LN_MAX - LN_MIN)) * 10) / 10;
const toSlider = (ghz: number) => Math.round(toPos(ghz) * STEPS);

/** Percentuale CSS arrotondata: evita differenze di idratazione tra Math.log server e client. */
const pct = (v: number) => `${(v * 100).toFixed(2)}%`;

/** Tacche dell'asse logaritmico */
const TICKS = [3, 5, 10, 20, 40];

export type PrefillDetail = { size?: string; frequency?: string };

/**
 * contactPath: percorso localizzato della pagina contatti (calcolato sul server),
 * usato quando il form non è nella stessa pagina.
 */
export function BandFinder({ formOnPage = false, contactPath, configurePath }: { formOnPage?: boolean; contactPath: string; configurePath: string }) {
  const t = useT("bandFinder");
  const locale = useClientLocale();
  const [freq, setFreq] = useState(10.5);
  const used = useRef(false);
  const sliderId = useId();
  const resultId = useId();

  const matches = useMemo(() => sizesFor(freq), [freq]);
  const primary = matches[0];
  const f = formatGHz(freq, locale, 1);

  const update = (next: number) => {
    const clamped = Math.min(FREQ_RANGE.max, Math.max(FREQ_RANGE.min, Math.round(next * 10) / 10));
    setFreq(clamped);
    if (!used.current) {
      used.current = true;
      track("band_finder_use");
    }
  };

  const askSize = primary?.wr ?? "other";

  const onAsk = (e: React.MouseEvent) => {
    track("cta_quote_click", { source: "band_finder", size: askSize });
    if (!formOnPage) return;
    const target = document.getElementById("preventivo");
    if (!target) return;
    e.preventDefault();
    const detail: PrefillDetail = { size: primary?.wr, frequency: String(freq) };
    window.dispatchEvent(new CustomEvent<PrefillDetail>("tl:prefill", { detail }));
    if (window.__lenis) window.__lenis.scrollTo(target, { offset: -88 });
    else target.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => target.querySelector<HTMLElement>("input, select, textarea")?.focus({ preventScroll: true }), 900);
  };

  return (
    <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
      {/* Comando */}
      <div className="min-w-0 lg:col-span-5">
        <div className="border border-line bg-surface p-5 sm:p-7">
          <label htmlFor={sliderId} className="annot uppercase tracking-[0.14em] text-muted">
            {t("label")}
          </label>
          <p className="mt-2 flex items-baseline gap-3 font-display font-extrabold wdth-wide" aria-hidden="true">
            <span className="tabular text-[clamp(3.5rem,2.4rem+4.5vw,6.5rem)] leading-none">{f}</span>
            <span className="text-display-s font-medium text-accent">{t("unit")}</span>
          </p>

          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              onClick={() => update(freq - 0.1)}
              className="grid size-11 shrink-0 place-items-center rounded-full border border-line-strong hover:border-accent"
              aria-label={t("decrease")}
            >
              <Minus aria-hidden="true" className="size-4" strokeWidth={1.75} />
            </button>
            <input
              id={sliderId}
              type="range"
              min={0}
              max={STEPS}
              step={1}
              value={toSlider(freq)}
              onChange={(e) => update(fromSlider(Number(e.target.value)))}
              aria-valuetext={`${f} GHz`}
              aria-describedby={resultId}
              className="h-11 w-full cursor-pointer"
            />
            <button
              type="button"
              onClick={() => update(freq + 0.1)}
              className="grid size-11 shrink-0 place-items-center rounded-full border border-line-strong hover:border-accent"
              aria-label={t("increase")}
            >
              <Plus aria-hidden="true" className="size-4" strokeWidth={1.75} />
            </button>
          </div>
          <div aria-hidden="true" className="relative mx-14 mt-1 h-5">
            {TICKS.map((tick) => (
              <span key={tick} className="annot absolute -translate-x-1/2 text-muted" style={{ left: pct(toPos(tick)) }}>
                {tick}
              </span>
            ))}
          </div>

          <div id={resultId} aria-live="polite" className="mt-6 min-h-[4.5rem] text-lead">
            {matches.length === 0 ? (
              <p>{t("none")}</p>
            ) : (
              <p>
                {matches.length === 1 ? t("result", { freq: f }) : t("resultMany", { freq: f })}{" "}
                {matches.map((m, i) => (
                  <span key={m.wr}>
                    {i > 0 ? ` ${t("or")} ` : ""}
                    <strong className="font-mono font-medium text-accent">{m.wr}</strong>
                  </span>
                ))}
                .
              </p>
            )}
            {primary ? (
              <p className="annot mt-2 text-muted">
                {t("cutoff")} {formatGHz(cutoffGHz(primary), locale, 2)} GHz · {t("inside")} {formatGHz(primary.a, locale)} × {formatGHz(primary.b, locale)} mm
              </p>
            ) : null}
          </div>

          <NextLink
            href={
              primary
                ? `${configurePath}?${new URLSearchParams({ tipo: "twistable", misura: primary.wr })}#configura`
                : `${contactPath}?${new URLSearchParams({ ghz: String(freq) })}#preventivo`
            }
            onClick={primary ? () => track("cta_shop_click", { source: "band_finder", size: primary.wr }) : onAsk}
            className="btn btn-primary mt-6 w-full sm:w-auto"
          >
            {primary ? t("cta") : t("ctaCustom")}
            <ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.75} />
          </NextLink>
        </div>
      </div>

      {/* Tabella delle bande con asse logaritmico */}
      <div className="min-w-0 lg:col-span-7">
        <div className="relative overflow-x-auto" data-lenis-prevent>
          <table className="spec-table min-w-[34rem]">
            <caption className="sr-only">{t("tableCaption")}</caption>
            <thead>
              <tr>
                <th scope="col">{t("colSize")}</th>
                <th scope="col">{t("colIec")}</th>
                <th scope="col">{t("colBand")}</th>
                <th scope="col" className="w-[44%]">
                  <span className="sr-only">{t("colBand")}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {SIZES.map((band) => {
                const on = matches.includes(band);
                return (
                  <tr key={band.wr} aria-current={on ? "true" : undefined} className={cn("transition-colors", on && "bg-surface-2")}>
                    <td className={cn("pl-3 transition-colors", on ? "text-accent" : "text-fg")}>{band.wr}</td>
                    <td className="annot whitespace-nowrap text-muted">
                      {band.iec} · {band.wg}
                    </td>
                    <td className={cn("tabular whitespace-nowrap transition-colors", on ? "text-fg" : "text-muted")}>
                      {formatGHz(band.min, locale)}-{formatGHz(band.max, locale)}
                    </td>
                    <td aria-hidden="true" className="relative">
                      <span
                        className={cn(
                          "absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full transition-colors duration-300",
                          on ? "bg-accent" : "bg-line-strong",
                        )}
                        style={{ left: pct(toPos(band.min)), width: pct(toPos(band.max) - toPos(band.min)) }}
                      />
                      {/* cursore della frequenza */}
                      <span className="absolute -inset-y-px w-px bg-accent/70" style={{ left: pct(toPos(freq)) }} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="annot mt-3 text-muted">{t("standardNote")}</p>
      </div>
    </div>
  );
}
