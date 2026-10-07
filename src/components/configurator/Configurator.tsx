"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import NextLink from "next/link";
import { ArrowLeft, ArrowRight, Box, Check, Download, FileDown, PencilRuler, Plus } from "lucide-react";
import { useClientLocale, useT } from "@/lib/client-i18n";
import { CONFIGURABLE_FAMILIES, type FamilyKey } from "@/data/families";
import { LENGTH_PRESETS, SEAMLESS_TABLE, SIZES, SIZE_BY_WR, TWIST_TABLE, bestSizeFor, isOnRequest, maxLengthFor, num, range, sizeLabel, sizesFor } from "@/data/waveguides";
import { OTHER_FLANGE, VISIBLE_OPTIONS, flangesFor } from "@/data/flanges";
import { fileSafe, lengthStatus, partCode, type PartSpec } from "@/lib/part";
import { addItem } from "@/lib/request";
import { drawingDate, drawingSvg, type DrawingLabels } from "@/lib/drawing";
import { track } from "@/lib/analytics";
import { TechDrawing } from "./TechDrawing";
import { Viewer3D } from "./Viewer3D";
import { cn } from "@/lib/cn";

type StepKey = "type" | "size" | "length" | "flanges" | "options";
const STEPS: StepKey[] = VISIBLE_OPTIONS.length ? ["type", "size", "length", "flanges", "options"] : ["type", "size", "length", "flanges"];

export type ConfigureDetail = { family?: FamilyKey; wr?: string };

/** Etichetta del cartiglio e delle viste, dai testi del configuratore. */
export function useDrawingLabels(): DrawingLabels {
  const t = useT("configurator");
  return useMemo(
    () => ({
      side: t("sideView"),
      section: t("section"),
      note: t("drawingNote"),
      date: t("drawingDate"),
      scale: t("drawingScale"),
      material: t("drawingMaterial"),
      titleBlock: t("drawingTitleBlock"),
      dimsUnknown: t("dimsUnknown"),
    }),
    [t],
  );
}

/** Return loss della colonna più vicina alla lunghezza scelta (300 / 600 / 1000 mm). */
function rlColumn(lengthMm: number): 300 | 600 | 1000 {
  return lengthMm <= 450 ? 300 : lengthMm <= 800 ? 600 : 1000;
}

/** Riga di dettaglio per l'email e la lista: tipo · misura · banda · lunghezza · flange. */
export function partDetail(spec: PartSpec, familyName: string, locale: string): string {
  const size = SIZE_BY_WR.get(spec.wr);
  const bits = [familyName, size ? sizeLabel(size) : spec.wr];
  if (size) bits.push(`${range(size.min, size.max, locale)} GHz`);
  if (spec.lengthMm) bits.push(`L ${num(spec.lengthMm, locale)} mm`);
  if (spec.flangeA || spec.flangeB) bits.push(`${spec.flangeA ?? "—"} / ${spec.flangeB ?? "—"}`);
  return bits.join(" · ");
}

export function Configurator({ familyNames, familyShort, requestPath }: { familyNames: Record<string, string>; familyShort: Record<string, string>; requestPath: string }) {
  const t = useT("configurator");
  const locale = useClientLocale();
  const uid = useId();
  const labels = useDrawingLabels();
  const root = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  const [step, setStep] = useState(0);
  const [family, setFamily] = useState<FamilyKey>("twistable");
  const [wr, setWr] = useState("WR-90");
  const [sizeMode, setSizeMode] = useState<"list" | "freq">("list");
  const [freq, setFreq] = useState("");
  const [length, setLength] = useState("600");
  const [flangeA, setFlangeA] = useState("UBR100");
  const [flangeB, setFlangeB] = useState("PBR100");
  const [options, setOptions] = useState<string[]>([]);
  const [view, setView] = useState<"2d" | "3d">("2d");
  const [busy, setBusy] = useState<null | "pdf" | "stl" | "glb">(null);
  const [downloadError, setDownloadError] = useState(false);
  const [added, setAdded] = useState(false);

  const flanges = useMemo(() => flangesFor(wr), [wr]);
  const otherLabel = locale === "it" ? "ALTRA" : "OTHER";

  // La misura cambia: flange predefinite della nuova misura (UBR lato A, PBR lato B)
  const chooseSize = (next: string) => {
    setWr(next);
    const list = flangesFor(next);
    setFlangeA((prev) => (prev === OTHER_FLANGE ? prev : (list[0]?.id ?? OTHER_FLANGE)));
    setFlangeB((prev) => (prev === OTHER_FLANGE ? prev : (list[1]?.id ?? list[0]?.id ?? OTHER_FLANGE)));
    setAdded(false);
  };

  // Precompilazione da URL (?tipo=twistable&misura=WR-90&ghz=10.5) e dal catalogo ("Configura")
  useEffect(() => {
    const apply = (d: ConfigureDetail, jump: boolean) => {
      if (d.family && CONFIGURABLE_FAMILIES.some((f) => f.key === d.family)) setFamily(d.family);
      if (d.wr && SIZE_BY_WR.has(d.wr)) chooseSize(d.wr);
      if (jump && d.family && d.wr) setStep(STEPS.indexOf("length"));
      else if (jump && d.family) setStep(STEPS.indexOf("size"));
    };
    const raf = requestAnimationFrame(() => {
      const p = new URLSearchParams(window.location.search);
      const tipo = p.get("tipo") ?? undefined;
      const misura = p.get("misura") ?? undefined;
      const ghz = p.get("ghz");
      if (tipo || misura) apply({ family: tipo as FamilyKey | undefined, wr: misura }, true);
      if (ghz) {
        setSizeMode("freq");
        setFreq(ghz.replace(".", locale === "it" ? "," : "."));
        setStep(STEPS.indexOf("size"));
      }
    });
    const onConfigure = (e: Event) => {
      apply((e as CustomEvent<ConfigureDetail>).detail, true);
      root.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
      window.setTimeout(() => panel.current?.focus({ preventScroll: true }), 400);
    };
    window.addEventListener("tl:configure", onConfigure);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("tl:configure", onConfigure);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lengthMm = Number(length.replace(",", "."));
  const lState = lengthStatus(wr, lengthMm);
  const size = SIZE_BY_WR.get(wr)!;
  const spec: PartSpec = { family, wr, lengthMm: lState === "invalid" ? null : lengthMm, flangeA, flangeB, options };
  const code = partCode(spec, otherLabel);
  const flangeLabel = (id: string) => (id === OTHER_FLANGE ? t("flangeOther") : id);

  const freqNum = Number(freq.replace(",", "."));
  const freqValid = freq.trim() !== "" && Number.isFinite(freqNum) && freqNum > 0;
  const suggested = freqValid ? bestSizeFor(freqNum) : undefined;
  const alsoGood = freqValid ? sizesFor(freqNum).filter((s) => s.wr !== suggested?.wr) : [];

  const go = (i: number) => {
    const next = Math.max(0, Math.min(STEPS.length - 1, i));
    setStep(next);
    track("configurator_step", { step: STEPS[next] });
    window.setTimeout(() => panel.current?.focus({ preventScroll: true }), 30);
  };

  /* ---------------------------------------------------- dati elettrici */
  const electrical = useMemo(() => {
    const rows: { label: string; value: string }[] = [];
    if (family === "twistable") {
      const r = TWIST_TABLE.find((x) => x.wr === wr);
      if (r) {
        const col = rlColumn(lengthMm || 600);
        rows.push({ label: t("rl", { len: String(col) }), value: `${num(col === 300 ? r.rl300 : col === 600 ? r.rl600 : r.rl1000, locale, 1, 1)} dB` });
        rows.push({ label: t("att"), value: `${num(r.att, locale, 2, 2)} dB/m` });
        if (r.cw != null) rows.push({ label: t("cw"), value: `${num(r.cw, locale)} W` });
        if (r.peak != null) rows.push({ label: t("peak"), value: `${num(r.peak, locale)} kW` });
      }
    } else {
      const r = SEAMLESS_TABLE.find((x) => x.wr === wr);
      if (r && !isOnRequest(r)) {
        rows.push({ label: t("vswr600"), value: num(r.vswr600!, locale, 2, 2) });
        rows.push({ label: t("att"), value: `${num(r.att!, locale, 2, 2)} dB/m` });
        rows.push({ label: t("cw"), value: `${num(r.cw!, locale)} W` });
        rows.push({ label: t("peak"), value: `${num(r.peak!, locale)} kW` });
      }
    }
    return rows;
  }, [family, wr, lengthMm, locale, t]);

  /* ---------------------------------------------------- azioni */
  const add = () => {
    addItem({ kind: "configured", spec, code, detail: partDetail(spec, familyNames[family], locale) });
    setAdded(true);
    track("add_to_request", { kind: "configured", family, size: wr });
  };

  const download = async (kind: "pdf" | "stl" | "glb") => {
    setBusy(kind);
    setDownloadError(false);
    try {
      const { downloadBytes } = await import("@/lib/pdf");
      const name = fileSafe(code);
      if (kind === "pdf") {
        const { drawingPdf } = await import("@/lib/pdf");
        const svg = drawingSvg({ wr, twist: family === "twistable", lengthMm: spec.lengthMm, flangeA: flangeLabel(flangeA), flangeB: flangeLabel(flangeB), code, locale, labels, palette: "print", date: drawingDate(locale) });
        downloadBytes(await drawingPdf(svg, { code, title: `${familyNames[family]} – ${code}` }), `${name}.pdf`, "application/pdf");
        track("download_drawing_pdf", { family, size: wr });
      } else {
        const m = await import("@/lib/waveguide3d");
        const model = { wr, lengthMm: spec.lengthMm ?? 600 };
        if (kind === "stl") {
          downloadBytes(await m.exportStl(model), `${name}.stl`, "model/stl");
          track("download_stl", { family, size: wr });
        } else {
          downloadBytes(await m.exportGlb(model), `${name}.glb`, "model/gltf-binary");
          track("download_glb", { family, size: wr });
        }
      }
    } catch {
      setDownloadError(true);
    } finally {
      setBusy(null);
    }
  };

  const current = STEPS[step];
  const radio = "peer sr-only";
  const choice =
    "flex h-full cursor-pointer flex-col gap-1 border border-line-strong bg-bg p-4 transition-colors hover:border-accent peer-checked:border-accent peer-checked:bg-[color-mix(in_srgb,var(--c-accent)_10%,var(--c-bg))] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent";

  return (
    <div ref={root} className="scroll-mt-24">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-10">
        <div className="min-w-0">
          {/* avanzamento */}
          <nav aria-label={t("stepsLabel")}>
            <p className="annot mb-3 text-muted" aria-live="polite">
              {t("progress", { n: step + 1, total: STEPS.length })}
            </p>
            <ol className="grid gap-2" style={{ gridTemplateColumns: `repeat(${STEPS.length}, minmax(0, 1fr))` }}>
              {STEPS.map((s, i) => (
                <li key={s}>
                  <button
                    type="button"
                    onClick={() => go(i)}
                    aria-current={i === step ? "step" : undefined}
                    className={cn(
                      "group grid w-full gap-2 text-left text-sm",
                      i === step ? "text-fg" : i < step ? "text-fg/80" : "text-muted",
                    )}
                  >
                    <span aria-hidden="true" className={cn("h-1 rounded-full transition-colors", i <= step ? "bg-accent" : "bg-line")} />
                    <span className="truncate font-medium group-hover:text-accent">
                      <span className="tabular">{i + 1}.</span> {t(`steps.${s}`)}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </nav>

          <div ref={panel} tabIndex={-1} className="mt-8 outline-none" aria-labelledby={`${uid}-step`}>
            <h3 id={`${uid}-step`} className="text-display-s font-bold">
              {current === "type" ? t("typeTitle") : current === "size" ? t("sizeTitle") : current === "length" ? t("lengthTitle") : current === "flanges" ? t("flangesTitle") : t("optionsTitle")}
            </h3>

            {current === "type" ? (
              <fieldset className="mt-5">
                <legend className="sr-only">{t("typeTitle")}</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  {CONFIGURABLE_FAMILIES.map((f) => (
                    <label key={f.key} className="block">
                      <input type="radio" name={`${uid}-type`} value={f.key} checked={family === f.key} onChange={() => (setFamily(f.key), setAdded(false))} className={radio} />
                      <span className={choice}>
                        <span className="font-semibold">{familyNames[f.key]}</span>
                        <span className="text-sm text-muted">{familyShort[f.key]}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : null}

            {current === "size" ? (
              <div className="mt-5 grid gap-5">
                <div role="radiogroup" aria-label={t("sizeTitle")} className="inline-flex w-max rounded-full border border-line-strong p-1">
                  {(["list", "freq"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      role="radio"
                      aria-checked={sizeMode === m}
                      onClick={() => setSizeMode(m)}
                      className={cn("min-h-10 rounded-full px-4 text-sm transition-colors", sizeMode === m ? "bg-accent text-on-accent" : "text-muted hover:text-fg")}
                    >
                      {m === "list" ? t("sizeByList") : t("sizeByFreq")}
                    </button>
                  ))}
                </div>

                {sizeMode === "freq" ? (
                  <div className="field max-w-xs">
                    <label htmlFor={`${uid}-freq`} className="field-label">
                      {t("freqLabel")}
                    </label>
                    <input id={`${uid}-freq`} inputMode="decimal" autoComplete="off" className="input tabular" value={freq} onChange={(e) => setFreq(e.target.value)} placeholder={locale === "it" ? "10,5" : "10.5"} />
                  </div>
                ) : null}
                {sizeMode === "freq" && freqValid ? (
                  <div role="status" className="grid gap-3 border border-accent/50 bg-[color-mix(in_srgb,var(--c-accent)_8%,var(--c-bg))] p-4">
                    {suggested ? (
                      <>
                        <p>{t("freqSuggest", { freq: num(freqNum, locale, 0, 2), size: sizeLabel(suggested) })}</p>
                        {alsoGood.length ? <p className="text-sm text-muted">{t("freqAlso", { list: alsoGood.map((s) => s.wr).join(", ") })}</p> : null}
                        <button type="button" className="btn btn-primary btn-sm justify-self-start" onClick={() => (chooseSize(suggested.wr), go(STEPS.indexOf("length")))}>
                          {t("useSize", { size: suggested.wr })}
                          <ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.75} />
                        </button>
                      </>
                    ) : (
                      <p>{t("freqNone", { freq: num(freqNum, locale, 0, 2) })}</p>
                    )}
                  </div>
                ) : null}

                {sizeMode === "list" ? (
                  <fieldset>
                    <legend className="sr-only">{t("sizeTitle")}</legend>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
                      {SIZES.map((s) => (
                        <label key={s.wr} className="block">
                          <input type="radio" name={`${uid}-size`} value={s.wr} checked={wr === s.wr} onChange={() => chooseSize(s.wr)} className={radio} />
                          <span className={cn(choice, "p-3")}>
                            <span className="font-display text-lg font-bold wdth-wide">{s.wr}</span>
                            <span className="annot text-muted">
                              {s.iec} · {s.wg}
                            </span>
                            <span className="annot tabular text-primary-ink">{range(s.min, s.max, locale)} GHz</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                ) : null}
              </div>
            ) : null}

            {current === "length" ? (
              <div className="mt-5 grid gap-4">
                <div className="flex flex-wrap gap-2" role="group" aria-label={t("lengthLabel")}>
                  {LENGTH_PRESETS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      aria-pressed={lengthMm === p}
                      onClick={() => (setLength(String(p)), setAdded(false))}
                      className={cn("min-h-11 rounded-full border px-4 text-sm tabular transition-colors", lengthMm === p ? "border-accent bg-accent text-on-accent" : "border-line-strong hover:border-accent")}
                    >
                      {p} mm
                    </button>
                  ))}
                </div>
                <div className="field max-w-xs">
                  <label htmlFor={`${uid}-len`} className="field-label">
                    {t("lengthLabel")}
                  </label>
                  <p id={`${uid}-len-hint`} className="field-hint">
                    {t("lengthHint", { max: num(maxLengthFor(wr), locale) })}
                  </p>
                  <input
                    id={`${uid}-len`}
                    type="number"
                    min={1}
                    step={1}
                    inputMode="numeric"
                    className="input tabular"
                    value={length}
                    onChange={(e) => (setLength(e.target.value), setAdded(false))}
                    aria-invalid={lState === "invalid" ? true : undefined}
                    aria-describedby={`${uid}-len-hint ${uid}-len-msg`}
                  />
                  <p id={`${uid}-len-msg`} aria-live="polite" className={cn("text-sm", lState === "invalid" ? "field-error" : "text-primary-ink")}>
                    {lState === "invalid" ? t("lengthInvalid") : lState === "out" ? t("lengthOut") : ""}
                  </p>
                </div>
              </div>
            ) : null}

            {current === "flanges" ? (
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {(
                  [
                    ["a", t("flangeA"), flangeA, setFlangeA],
                    ["b", t("flangeB"), flangeB, setFlangeB],
                  ] as const
                ).map(([k, label, value, setter]) => (
                  <div key={k} className="field">
                    <label htmlFor={`${uid}-fl-${k}`} className="field-label">
                      {label}
                    </label>
                    <select id={`${uid}-fl-${k}`} className="input font-mono" value={value} onChange={(e) => (setter(e.target.value), setAdded(false))}>
                      {flanges.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.label}
                        </option>
                      ))}
                      <option value={OTHER_FLANGE}>{t("flangeOther")}</option>
                    </select>
                  </div>
                ))}
                <p className="annot text-muted sm:col-span-2">
                  <span className="todo">{t("flangeNote")}</span>
                </p>
              </div>
            ) : null}

            {current === "options" ? (
              <fieldset className="mt-5 grid gap-3">
                <legend className="sr-only">{t("optionsTitle")}</legend>
                {VISIBLE_OPTIONS.length ? (
                  VISIBLE_OPTIONS.map((o) => (
                    <label key={o.id} className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        className="size-5 accent-[var(--c-accent)]"
                        checked={options.includes(o.id)}
                        onChange={(e) => setOptions((prev) => (e.target.checked ? [...prev, o.id] : prev.filter((x) => x !== o.id)))}
                      />
                      {t(`options.${o.id}`)}
                    </label>
                  ))
                ) : (
                  <p className="text-muted">{t("optionsNone")}</p>
                )}
              </fieldset>
            ) : null}

            <div className="mt-8 flex flex-wrap gap-3">
              {step > 0 ? (
                <button type="button" className="btn btn-ghost" onClick={() => go(step - 1)}>
                  <ArrowLeft aria-hidden="true" className="size-4" strokeWidth={1.75} />
                  {t("back")}
                </button>
              ) : null}
              {step < STEPS.length - 1 ? (
                <button type="button" className="btn btn-primary" onClick={() => go(step + 1)}>
                  {t("next")}
                  <ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.75} />
                </button>
              ) : (
                <button type="button" className="btn btn-primary" onClick={add} disabled={lState === "invalid"}>
                  <Plus aria-hidden="true" className="size-4" strokeWidth={1.75} />
                  {t("add")}
                </button>
              )}
            </div>
          </div>

          {/* disegno / 3D */}
          <figure className="mt-10 border border-line bg-surface">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
              <figcaption className="annot uppercase tracking-[0.14em] text-muted">{view === "2d" ? t("drawing") : t("view3d")}</figcaption>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => (setView(view === "2d" ? "3d" : "2d"), view === "2d" && track("view_3d", { size: wr }))} aria-pressed={view === "3d"}>
                {view === "2d" ? <Box aria-hidden="true" className="size-4" strokeWidth={1.75} /> : <PencilRuler aria-hidden="true" className="size-4" strokeWidth={1.75} />}
                {view === "2d" ? t("view3d") : t("view2d")}
              </button>
            </div>
            {view === "2d" ? (
              <TechDrawing
                wr={wr}
                twist={family === "twistable"}
                lengthMm={spec.lengthMm}
                flangeA={flangeLabel(flangeA)}
                flangeB={flangeLabel(flangeB)}
                code={code}
                labels={labels}
                locale={locale}
                alt={t("drawingAlt", { code })}
              />
            ) : (
              <Viewer3D wr={wr} lengthMm={spec.lengthMm ?? 600} label={t("viewerLabel", { code })} hint={t("viewerHint")} loadingText={t("loading3d")} errorText={t("error3d")} />
            )}
            <div className="flex flex-wrap gap-2 border-t border-line px-4 py-3">
              {(
                [
                  ["pdf", t("downloadPdf"), FileDown],
                  ["stl", t("downloadStl"), Download],
                  ["glb", t("downloadGlb"), Download],
                ] as const
              ).map(([k, label, Icon]) => (
                <button key={k} type="button" className="btn btn-ghost btn-sm" onClick={() => download(k)} disabled={busy !== null} aria-busy={busy === k}>
                  <Icon aria-hidden="true" className="size-4" strokeWidth={1.75} />
                  {busy === k ? t("preparing") : label}
                </button>
              ))}
              {downloadError ? (
                <p role="alert" className="field-error basis-full">
                  {t("downloadError")}
                </p>
              ) : null}
            </div>
          </figure>
        </div>

        {/* riepilogo: a destra su desktop, sotto su telefono */}
        <aside aria-labelledby={`${uid}-title`} className="lg:sticky lg:top-24 lg:self-start">
          <div className="border border-line bg-surface p-5 sm:p-6">
            <h3 id={`${uid}-title`} className="annot uppercase tracking-[0.14em] text-muted">
              {t("summary")}
            </h3>
            <p className="mt-3 break-words font-mono text-lg font-medium leading-snug" data-part-code>
              {code}
            </p>
            <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted">{t("type")}</dt>
              <dd>{familyNames[family]}</dd>
              <dt className="text-muted">{t("size")}</dt>
              <dd className="tabular">{sizeLabel(size)}</dd>
              <dt className="text-muted">{t("band")}</dt>
              <dd className="tabular">{range(size.min, size.max, locale)} GHz</dd>
              <dt className="text-muted">{t("length")}</dt>
              <dd className="tabular">{spec.lengthMm ? `${num(spec.lengthMm, locale)} mm` : "—"}</dd>
              <dt className="text-muted">{t("flanges")}</dt>
              <dd className="font-mono text-[0.8125rem]">
                {flangeLabel(flangeA)} / {flangeLabel(flangeB)}
              </dd>
            </dl>
            <h4 className="annot mt-6 uppercase tracking-[0.14em] text-muted">{t("electrical")}</h4>
            {electrical.length ? (
              <dl className="mt-3 grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 text-sm">
                {electrical.map((r) => (
                  <div key={r.label} className="contents">
                    <dt className="text-muted">{r.label}</dt>
                    <dd className="text-right tabular">{r.value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="mt-3 text-sm text-muted">{t("onRequest")}</p>
            )}
            <button type="button" className="btn btn-primary mt-6 w-full" onClick={add} disabled={lState === "invalid"}>
              <Plus aria-hidden="true" className="size-4" strokeWidth={1.75} />
              {t("add")}
            </button>
            <div aria-live="polite" className="mt-3 min-h-6 text-sm">
              {added ? (
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <Check aria-hidden="true" className="size-4 text-ok" strokeWidth={2} />
                  {t("added")}
                  <NextLink href={requestPath} className="font-medium text-accent underline underline-offset-4">
                    {t("goToRequest")}
                  </NextLink>
                </p>
              ) : null}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
