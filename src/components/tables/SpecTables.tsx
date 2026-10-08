"use client";

import { ENV } from "@/data/site";
import { useId, useRef, useState, type KeyboardEvent } from "react";
import NextLink from "next/link";
import { FileDown, Search, SlidersHorizontal } from "lucide-react";
import { useClientLocale, useT } from "@/lib/client-i18n";
import { DIM_TABLE, MATERIAL, SEAMLESS_TABLE, SIZE_BY_WR, TWIST_TABLE, isOnRequest, num, range, type Size } from "@/data/waveguides";
import { track } from "@/lib/analytics";
import { TechDrawing } from "@/components/configurator/TechDrawing";
import { useDrawingLabels } from "@/components/configurator/Configurator";
import { cn } from "@/lib/cn";

export type TableTab = "twist" | "seamless" | "dims";
const TABS: TableTab[] = ["twist", "seamless", "dims"];

/** Colonna fissa: WR in evidenza, sotto IEC R e WG. */
function SizeHead({ size }: { size: Size }) {
  return (
    <span className="grid">
      <span className="font-display text-base font-bold wdth-wide">{size.wr}</span>
      <span className="annot text-muted">
        {size.iec} · {size.wg}
      </span>
    </span>
  );
}

/**
 * Tabelle tecniche ufficiali (twistabile, seamless, dimensioni) in tab accessibili.
 * Su telefono la tabella scorre di lato dentro il suo contenitore, con la misura fissa a sinistra.
 */
export function SpecTables({ defaultTab = "twist", configurePath, familyNames, headingLevel = 2 }: { defaultTab?: TableTab; configurePath: string; familyNames: Record<string, string>; headingLevel?: 2 | 3 }) {
  const t = useT("tables");
  const locale = useClientLocale();
  const uid = useId();
  const labels = useDrawingLabels();
  const [tab, setTab] = useState<TableTab>(defaultTab);
  const [ghz, setGhz] = useState("");
  const [busy, setBusy] = useState(false);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const H = `h${headingLevel}` as "h2" | "h3";

  const freq = Number(ghz.replace(",", "."));
  const filtering = ghz.trim() !== "" && Number.isFinite(freq) && freq > 0;
  const covers = (min: number, max: number) => filtering && freq >= min && freq <= max;
  const matchCount = filtering
    ? tab === "dims"
      ? DIM_TABLE.filter((d) => covers(d.min, d.max)).length
      : TWIST_TABLE.filter((r) => {
          const s = SIZE_BY_WR.get(r.wr)!;
          return covers(s.min, s.max);
        }).length
    : 0;
  const freqText = filtering ? num(freq, locale, 0, 2) : "";

  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const next = e.key === "ArrowRight" ? (i + 1) % TABS.length : e.key === "ArrowLeft" ? (i - 1 + TABS.length) % TABS.length : e.key === "Home" ? 0 : e.key === "End" ? TABS.length - 1 : -1;
    if (next < 0) return;
    e.preventDefault();
    setTab(TABS[next]);
    tabRefs.current[next]?.focus();
  };

  const configureHref = (wr: string, family?: string) => `${configurePath}?${new URLSearchParams(family ? { tipo: family, misura: wr } : { misura: wr })}#configura`;

  const datasheet = async () => {
    if (tab === "dims") return;
    setBusy(true);
    try {
      const { datasheetPdf, downloadBytes } = await import("@/lib/pdf");
      const family = tab === "twist" ? "twistable" : "seamless";
      const bytes = await datasheetPdf(tab, locale, {
        familyName: familyNames[family],
        sheetTitle: t("sheetTitle"),
        date: new Intl.DateTimeFormat(locale === "it" ? "it-IT" : "en-GB", { dateStyle: "long" }).format(new Date()),
        size: t("size"),
        freq: t("freq"),
        rl: t("rl"),
        att: t("att"),
        cw: t("cw"),
        peak: t("peak"),
        vswr600: t("vswr600"),
        onRequest: t("onRequest"),
        code: t("code"),
        tol: t("tol"),
        vswrMax: t("vswrMax"),
        dimsTitle: t("captionDims"),
        material: t("material", { material: MATERIAL }),
        notes: noteList(t),
        footer: t("sheetFooter"),
      });
      downloadBytes(bytes, `Tecnolambro_${family}_${locale}.pdf`, "application/pdf");
      track("download_datasheet", { family });
    } finally {
      setBusy(false);
    }
  };

  const configureCell = (wr: string, family?: string) => (
    <td className="text-right">
      <NextLink href={configureHref(wr, family)} className="btn btn-ghost btn-sm whitespace-nowrap" aria-label={t("configureLabel", { type: family ? familyNames[family] : "", size: wr })}>
        {t("configure")}
      </NextLink>
    </td>
  );
  const rowClass = (match: boolean) => cn(match && "is-match");
  const matchMark = (match: boolean) => (match ? <span className="sr-only"> ({t("covers")})</span> : null);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div role="tablist" aria-label={t("tabsLabel")} className="inline-flex flex-wrap rounded-full border border-line-strong p-1">
          {TABS.map((k, i) => (
            <button
              key={k}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              id={`${uid}-tab-${k}`}
              type="button"
              role="tab"
              aria-selected={tab === k}
              aria-controls={`${uid}-panel-${k}`}
              tabIndex={tab === k ? 0 : -1}
              onClick={() => setTab(k)}
              onKeyDown={(e) => onKey(e, i)}
              className={cn("min-h-10 rounded-full px-4 text-sm font-medium transition-colors", tab === k ? "bg-accent text-on-accent" : "text-muted hover:text-fg")}
            >
              {k === "twist" ? t("tabTwist") : k === "seamless" ? t("tabSeamless") : t("tabDims")}
            </button>
          ))}
        </div>
        <div className="field w-full max-w-[18rem]">
          <label htmlFor={`${uid}-ghz`} className="field-label flex items-center gap-2">
            <SlidersHorizontal aria-hidden="true" className="size-4 text-muted" strokeWidth={1.75} />
            {t("filterLabel")}
          </label>
          <div className="relative">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" strokeWidth={1.75} />
            <input id={`${uid}-ghz`} inputMode="decimal" autoComplete="off" className="input pl-9 tabular" placeholder={t("filterPlaceholder")} value={ghz} onChange={(e) => setGhz(e.target.value)} aria-describedby={`${uid}-ghz-status`} />
          </div>
          <p id={`${uid}-ghz-status`} className="annot min-h-5 text-primary-ink" aria-live="polite">
            {filtering ? (matchCount === 0 ? t("filterNone", { freq: freqText }) : matchCount === 1 ? t("filterOne", { freq: freqText }) : t("filterMany", { count: matchCount, freq: freqText })) : ""}
          </p>
        </div>
      </div>

      <div id={`${uid}-panel-${tab}`} role="tabpanel" aria-labelledby={`${uid}-tab-${tab}`} tabIndex={0} className="grid gap-5 outline-none">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <H className="text-display-s font-bold">{tab === "twist" ? t("captionTwist") : tab === "seamless" ? t("captionSeamless") : t("captionDims")}</H>
          {tab !== "dims" ? (
            <button type="button" className="btn btn-ghost btn-sm" onClick={datasheet} disabled={busy} aria-busy={busy}>
              <FileDown aria-hidden="true" className="size-4" strokeWidth={1.75} />
              {busy ? t("downloading") : t("download")}
            </button>
          ) : null}
        </div>

        <div className="data-table-wrap" role="region" aria-label={`${tab === "twist" ? t("captionTwist") : tab === "seamless" ? t("captionSeamless") : t("captionDims")} – ${t("scrollHint")}`} tabIndex={0} data-lenis-prevent>
          {tab === "twist" ? (
            <table className="data-table min-w-[54rem]">
              <caption className="sr-only">{t("captionTwist")}</caption>
              <thead>
                <tr>
                  <th rowSpan={2} scope="col" className="sticky-col">
                    {t("size")}
                  </th>
                  <th rowSpan={2} scope="col" className="num">
                    {t("freq")}
                  </th>
                  <th colSpan={3} scope="colgroup" className="group-head">
                    {t("rl")}
                  </th>
                  <th rowSpan={2} scope="col" className="num">
                    {t("att")}
                  </th>
                  <th colSpan={2} scope="colgroup" className="group-head">
                    {t("power")}
                  </th>
                  <th rowSpan={2} scope="col">
                    <span className="sr-only">{t("configure")}</span>
                  </th>
                </tr>
                <tr>
                  <th scope="col" className="num">300 mm</th>
                  <th scope="col" className="num">600 mm</th>
                  <th scope="col" className="num">1000 mm</th>
                  <th scope="col" className="num">{t("cw")}</th>
                  <th scope="col" className="num">{t("peak")}</th>
                </tr>
              </thead>
              <tbody>
                {TWIST_TABLE.map((r) => {
                  const s = SIZE_BY_WR.get(r.wr)!;
                  const m = covers(s.min, s.max);
                  return (
                    <tr key={r.wr} className={rowClass(m)} data-wr={r.wr}>
                      <th scope="row" className="sticky-col">
                        <SizeHead size={s} />
                        {matchMark(m)}
                      </th>
                      <td className="num">{range(s.min, s.max, locale)}</td>
                      <td className="num">{num(r.rl300, locale, 1, 1)}</td>
                      <td className="num">{num(r.rl600, locale, 1, 1)}</td>
                      <td className="num">{num(r.rl1000, locale, 1, 1)}</td>
                      <td className="num">{num(r.att, locale, 2, 2)}</td>
                      <td className="num">{r.cw == null ? "—" : num(r.cw, locale)}</td>
                      <td className="num">{r.peak == null ? "—" : num(r.peak, locale)}</td>
                      {configureCell(r.wr, "twistable")}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : null}

          {tab === "seamless" ? (
            <table className="data-table min-w-[46rem]">
              <caption className="sr-only">{t("captionSeamless")}</caption>
              <thead>
                <tr>
                  <th rowSpan={2} scope="col" className="sticky-col">
                    {t("size")}
                  </th>
                  <th rowSpan={2} scope="col" className="num">
                    {t("freq")}
                  </th>
                  <th rowSpan={2} scope="col" className="num">
                    {t("vswr600")}
                  </th>
                  <th rowSpan={2} scope="col" className="num">
                    {t("att")}
                  </th>
                  <th colSpan={2} scope="colgroup" className="group-head">
                    {t("power")}
                  </th>
                  <th rowSpan={2} scope="col">
                    <span className="sr-only">{t("configure")}</span>
                  </th>
                </tr>
                <tr>
                  <th scope="col" className="num">{t("cw")}</th>
                  <th scope="col" className="num">{t("peak")}</th>
                </tr>
              </thead>
              <tbody>
                {SEAMLESS_TABLE.map((r) => {
                  const s = SIZE_BY_WR.get(r.wr)!;
                  const m = covers(s.min, s.max);
                  return (
                    <tr key={r.wr} className={rowClass(m)} data-wr={r.wr}>
                      <th scope="row" className="sticky-col">
                        <SizeHead size={s} />
                        {matchMark(m)}
                      </th>
                      <td className="num">{range(s.min, s.max, locale)}</td>
                      {isOnRequest(r) ? (
                        <td colSpan={4} className="text-muted">
                          {t("onRequest")}
                        </td>
                      ) : (
                        <>
                          <td className="num">{num(r.vswr600!, locale, 2, 2)}</td>
                          <td className="num">{num(r.att!, locale, 2, 2)}</td>
                          <td className="num">{num(r.cw!, locale)}</td>
                          <td className="num">{num(r.peak!, locale)}</td>
                        </>
                      )}
                      {configureCell(r.wr, "seamless")}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : null}

          {tab === "dims" ? (
            <table className="data-table min-w-[62rem]">
              <caption className="sr-only">{t("captionDims")}</caption>
              <thead>
                <tr>
                  <th rowSpan={2} scope="col" className="sticky-col">
                    {t("code")}
                  </th>
                  <th colSpan={7} scope="colgroup" className="group-head">
                    {t("dimsGroup")}
                  </th>
                  <th rowSpan={2} scope="col" className="num">
                    {t("tol")}
                  </th>
                  <th rowSpan={2} scope="col" className="num">
                    {t("freq")}
                  </th>
                  <th rowSpan={2} scope="col" className="num">
                    {t("att")}
                  </th>
                  <th rowSpan={2} scope="col" className="num">
                    {t("vswrMax")}
                  </th>
                  <th rowSpan={2} scope="col">
                    <span className="sr-only">{t("configure")}</span>
                  </th>
                </tr>
                <tr>
                  {["A", "B", "C", "D", "P", "r", "R"].map((k) => (
                    <th key={k} scope="col" className="num">
                      {k}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DIM_TABLE.map((d) => {
                  const s = SIZE_BY_WR.get(d.wr)!;
                  const m = covers(d.min, d.max);
                  const v = (x: number | null) => (x == null ? "—" : num(x, locale, 0, 2));
                  return (
                    <tr key={d.code} className={rowClass(m)} data-wr={d.wr}>
                      <th scope="row" className="sticky-col">
                        <span className="grid">
                          <span className="font-display text-base font-bold wdth-wide">
                            {d.code}
                            {d.notes?.code ? <sup>*</sup> : null}
                          </span>
                          <span className="annot text-muted">
                            {s.wr} · {s.iec} · {s.wg}
                          </span>
                        </span>
                        {matchMark(m)}
                      </th>
                      <td className="num">{v(d.A)}</td>
                      <td className="num">{v(d.B)}</td>
                      <td className="num">{v(d.C)}</td>
                      <td className="num">{v(d.D)}</td>
                      <td className="num">{v(d.P)}</td>
                      <td className="num">{v(d.r)}</td>
                      <td className="num">{v(d.R)}</td>
                      <td className="num">± {num(d.tol, locale, 2, 2)}</td>
                      <td className="num">{range(d.min, d.max, locale)}</td>
                      <td className="num">
                        {num(d.att, locale, 2, 2)}
                        {d.notes?.att ? <sup>**</sup> : null}
                      </td>
                      <td className="num">
                        {num(d.vswr, locale, 2, 2)}
                        {d.notes?.vswr ? <sup>***</sup> : null}
                      </td>
                      {configureCell(d.wr)}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : null}
        </div>

        {tab === "dims" ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
            <figure className="border border-line bg-surface">
              <TechDrawing wr="WR-90" generic labels={labels} locale={locale} alt={t("drawingTitle")} code="TLFX" />
              <figcaption className="annot border-t border-line px-4 py-3 text-muted">{t("drawingTitle")}</figcaption>
            </figure>
            <ul className="grid gap-2 text-sm">
              {(["AB", "CD", "P", "rR", "L"] as const).map((k) => (
                <li key={k} className="border-b border-line pb-2">
                  {t(`legend.${k}`)}
                </li>
              ))}
              <li className="pt-1 text-muted">{t("material", { material: MATERIAL })}</li>
            </ul>
          </div>
        ) : null}

        <div className="grid gap-1 text-sm text-muted">
          {tab === "dims" ? noteList(t).map((n) => <p key={n}>{n}</p>) : null}
          {ENV.demo ? (
            <p>
              <span className="todo">{t("verify")}</span>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** Le note della tabella sono un array nei messaggi: il t() client restituisce solo stringhe. */
function noteList(t: (k: string) => string): string[] {
  const out: string[] = [];
  for (let i = 0; i < 6; i++) {
    const v = t(`notes.${i}`);
    if (v === `tables.notes.${i}`) break;
    out.push(v);
  }
  return out;
}
