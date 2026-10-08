"use client";

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import NextLink from "next/link";
import { Box, Check, Download, FileDown, Info, Mail, PencilRuler, Plus, Share2, Smartphone } from "lucide-react";
import { ENV } from "@/data/site";
import { useClientLocale, useT } from "@/lib/client-i18n";
import { BEND_ANGLES, FINISHES, PART_TYPES, TREATMENTS, TWIST_ROTATIONS, TYPE_DEF, isFlexible, type PartSpec, type PartType } from "@/data/configurator/types";
import { defaultSpec, specFromParams, specToParams } from "@/data/configurator/defaults";
import { LENGTH_PRESETS, SEAMLESS_TABLE, SIZES, SIZE_BY_WR, TWIST_TABLE, bestSizeFor, isOnRequest, lengthRange, num, range, sizeLabel, sizesFor } from "@/data/waveguides";
import { OTHER_FLANGE, flangesFor } from "@/data/flanges";
import { fileSafe, lengthStatus, partReference, specValid } from "@/lib/part";
import { addItem } from "@/lib/request";
import { drawingDate, drawingSvg, type DrawingLabels } from "@/lib/drawing";
import { track } from "@/lib/analytics";
import { TechDrawing } from "./TechDrawing";
import { Viewer3D } from "./Viewer3D";
import { StlPreview } from "./StlPreview";
import { CustomPartForm } from "@/components/request/CustomPartForm";
import { cn } from "@/lib/cn";

export type ConfigureDetail = { spec?: PartSpec; type?: PartType; wr?: string };

/** Etichette del disegno tecnico, dai testi del configuratore. */
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
      cw: t("dir.cw"),
      ccw: t("dir.ccw"),
      radiusStd: t("radiusStdShort"),
    }),
    [t],
  );
}

/** Testi per riferimenti e dettagli dei pezzi (configuratore, catalogo, richiesta). */
export function usePartText() {
  const t = useT("configurator");
  const locale = useClientLocale();
  return useMemo(() => {
    const flange = (f: string) => (f === OTHER_FLANGE ? t("flangeOther") : f);
    const reference = (spec: PartSpec) =>
      partReference(spec, { other: locale === "it" ? "ALTRA" : "OTHER", flexName: t(`flexName.${spec.type === "seamless" ? "seamless" : "twistable"}`), customLabel: t("customRef") });
    /** riga leggibile: tipo · misura · banda · geometria · flange · finitura · trattamento */
    const detail = (spec: PartSpec) => {
      const size = SIZE_BY_WR.get(spec.wr);
      const bits = [t(`types.${spec.type}.name`)];
      if (size) bits.push(sizeLabel(size), `${range(size.min, size.max, locale)} GHz`);
      else if (spec.wr === "unknown") bits.push(t("sizeUnknown"));
      const geo = TYPE_DEF[spec.type].geometry;
      const mm = (v?: number | null) => `${num(v ?? 0, locale, 0, 1)} mm`;
      if (geo === "length") bits.push(`L ${mm(spec.length)}`);
      if (geo === "bend") bits.push(t(`plane.${spec.plane ?? "E"}`), `${num(spec.angle ?? 90, locale, 0, 1)}°`, spec.radius ? `R ${mm(spec.radius)}` : t("radiusStd"), `L1 ${mm(spec.leg1)}`, `L2 ${mm(spec.leg2)}`);
      if (geo === "twist") bits.push(`${num(spec.rotation ?? 90, locale, 0, 1)}° ${t(`dir.${spec.direction ?? "cw"}`)}`, `L ${mm(spec.length)}`);
      if (geo === "offset") bits.push(t(`plane.${spec.plane ?? "E"}`), `X ${mm(spec.offset)}`, `L ${mm(spec.length)}`);
      if (geo !== "custom") {
        bits.push(`${t("flanges")}: ${flange(spec.f1)} / ${flange(spec.f2)}`);
        bits.push(`${t("finish")}: ${t(`finishes.${spec.finish}`)}`);
        bits.push(`${t("treatment")}: ${t(`treatments.${spec.treatment}`)}`);
      }
      return bits.join(" · ");
    };
    return { reference, detail, flange };
  }, [t, locale]);
}

/** Return loss della colonna più vicina alla lunghezza scelta (300 / 600 / 1000 mm). */
function rlColumn(lengthMm: number): 300 | 600 | 1000 {
  return lengthMm <= 450 ? 300 : lengthMm <= 800 ? 600 : 1000;
}

const isIOS = () => typeof navigator !== "undefined" && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

export function Configurator({ requestPath }: { requestPath: string }) {
  const t = useT("configurator");
  const locale = useClientLocale();
  const uid = useId();
  const labels = useDrawingLabels();
  const text = usePartText();
  const root = useRef<HTMLDivElement>(null);

  const [spec, setSpecState] = useState<PartSpec>(() => defaultSpec("twistable"));
  const [freq, setFreq] = useState("");
  const [notes, setNotes] = useState("");
  const [view, setView] = useState<"3d" | "2d">("3d");
  const [busy, setBusy] = useState<null | "pdf" | "stl" | "glb" | "ar">(null);
  const [downloadError, setDownloadError] = useState(false);
  const [added, setAdded] = useState(false);
  const [shared, setShared] = useState(false);
  const [ios, setIos] = useState(false);
  const started = useRef(false);
  /** l'URL iniziale è stato letto: solo dopo si può riscrivere */
  const loaded = useRef(false);
  // file del pezzo su disegno (anteprima STL)
  const [customFiles, setCustomFiles] = useState<File[]>([]);

  const setSpec = (next: PartSpec | ((s: PartSpec) => PartSpec)) => {
    setSpecState(next);
    setAdded(false);
    if (!started.current) {
      started.current = true;
      track("config_start");
    }
  };
  const patch = (p: Partial<PartSpec>) => setSpec((s) => ({ ...s, ...p }));

  // configurazione dall'URL (link condivisibile) e dal catalogo ("Personalizza")
  useEffect(() => {
    const timer = window.setTimeout(() => {
      loaded.current = true;
      setIos(isIOS());
      const p = new URLSearchParams(window.location.search);
      const fromUrl = specFromParams(p);
      if (fromUrl) {
        setSpecState(fromUrl);
        if (!TYPE_DEF[fromUrl.type].has3d) setView("2d");
      }
      const ghz = p.get("ghz");
      if (ghz) setFreq(ghz.replace(".", locale === "it" ? "," : "."));
    }, 0);
    const onConfigure = (e: Event) => {
      const d = (e as CustomEvent<ConfigureDetail>).detail;
      const next = d.spec ?? defaultSpec(d.type ?? "twistable", d.wr ?? "WR-90");
      setSpec(next);
      setView(TYPE_DEF[next.type].has3d ? "3d" : "2d");
      track("config_type", { type: next.type });
      root.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    };
    window.addEventListener("tl:configure", onConfigure);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("tl:configure", onConfigure);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // la configurazione si riflette nell'URL (si può copiare e mandare a un collega)
  useEffect(() => {
    if (!loaded.current || (!started.current && !new URLSearchParams(window.location.search).has("tipo"))) return;
    const id = window.setTimeout(() => {
      const url = `${window.location.pathname}?${specToParams(spec)}#configura`;
      window.history.replaceState(window.history.state, "", url);
    }, 250);
    return () => window.clearTimeout(id);
  }, [spec]);

  const geo = TYPE_DEF[spec.type].geometry;
  const isCustom = spec.type === "custom";
  const size = SIZE_BY_WR.get(spec.wr);
  const flanges = useMemo(() => (size ? flangesFor(size.wr) : []), [size]);
  const code = text.reference(spec);
  const lState = geo === "length" ? lengthStatus(spec) : "ok";
  const valid = specValid(spec);

  const chooseType = (type: PartType) => {
    const wr = spec.wr !== "unknown" ? spec.wr : "WR-90";
    const next = defaultSpec(type, type === "custom" ? "unknown" : wr);
    // conserva flange e finiture quando si cambia tipo sulla stessa misura
    if (type !== "custom" && spec.type !== "custom") Object.assign(next, { f1: spec.f1, f2: spec.f2, finish: spec.finish, treatment: spec.treatment });
    setSpec(next);
    setView(TYPE_DEF[type].has3d ? "3d" : "2d");
    track("config_type", { type });
  };
  const chooseSize = (wr: string) => {
    const list = flangesFor(wr);
    setSpec((s) => ({
      ...s,
      wr,
      f1: s.f1 === OTHER_FLANGE ? s.f1 : (list[0]?.id ?? OTHER_FLANGE),
      f2: s.f2 === OTHER_FLANGE ? s.f2 : ((isFlexible(s.type) ? list[1]?.id : list[0]?.id) ?? OTHER_FLANGE),
    }));
    track("config_step", { step: "size" });
  };

  // frequenza in cima alla scelta della misura: evidenzia e preseleziona la misura giusta
  const freqNum = Number(freq.replace(",", "."));
  const freqValid = freq.trim() !== "" && Number.isFinite(freqNum) && freqNum > 0;
  const suggested = freqValid ? bestSizeFor(freqNum) : undefined;
  const covering = freqValid ? new Set(sizesFor(freqNum).map((s) => s.wr)) : null;
  useEffect(() => {
    if (!suggested || isCustom) return;
    const id = window.setTimeout(() => chooseSize(suggested.wr), 0);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggested?.wr]);

  /* ------------------------------------------------------- dati elettrici */
  const electrical = useMemo(() => {
    const rows: { label: string; value: string }[] = [];
    if (spec.type === "twistable") {
      const r = TWIST_TABLE.find((x) => x.wr === spec.wr);
      if (r) {
        const col = rlColumn(spec.length || 600);
        rows.push({ label: t("rl", { len: String(col) }), value: `${num(col === 300 ? r.rl300 : col === 600 ? r.rl600 : r.rl1000, locale, 1, 1)} dB` });
        rows.push({ label: t("att"), value: `${num(r.att, locale, 2, 2)} dB/m` });
        if (r.cw != null) rows.push({ label: t("cw"), value: `${num(r.cw, locale)} W` });
        if (r.peak != null) rows.push({ label: t("peak"), value: `${num(r.peak, locale)} kW` });
      }
    }
    if (spec.type === "seamless") {
      const r = SEAMLESS_TABLE.find((x) => x.wr === spec.wr);
      if (r && !isOnRequest(r)) {
        rows.push({ label: t("vswr600"), value: num(r.vswr600!, locale, 2, 2) });
        rows.push({ label: t("att"), value: `${num(r.att!, locale, 2, 2)} dB/m` });
        rows.push({ label: t("cw"), value: `${num(r.cw!, locale)} W` });
        rows.push({ label: t("peak"), value: `${num(r.peak!, locale)} kW` });
      }
    }
    return rows;
  }, [spec, locale, t]);

  /* ------------------------------------------------------------- azioni */
  const add = () => {
    addItem({ kind: "configured", spec, code, detail: text.detail(spec), notes: notes.trim() || undefined });
    setAdded(true);
    track("request_add", { kind: "configured", type: spec.type, size: spec.wr });
  };

  const share = async () => {
    const url = `${window.location.origin}${window.location.pathname}?${specToParams(spec)}#configura`;
    track("config_share", { channel: "link" });
    try {
      if (navigator.share && window.matchMedia("(pointer: coarse)").matches) await navigator.share({ title: code, text: t("shareText"), url });
      else await navigator.clipboard.writeText(url);
      setShared(true);
      window.setTimeout(() => setShared(false), 2500);
    } catch {
      // annullato
    }
  };

  const download = async (kind: "pdf" | "stl" | "glb" | "ar") => {
    setBusy(kind);
    setDownloadError(false);
    try {
      const { downloadBytes, drawingPdf } = await import("@/lib/pdf");
      const name = fileSafe(code);
      if (kind === "pdf") {
        const svg = drawingSvg({ spec, flangeA: text.flange(spec.f1), flangeB: text.flange(spec.f2), code, locale, labels, palette: "print", date: drawingDate(locale) });
        downloadBytes(await drawingPdf(svg, { code, title: `${t(`types.${spec.type}.name`)} – ${code}` }), `${name}.pdf`, "application/pdf");
      } else {
        const m = await import("@/lib/part3d");
        if (kind === "stl") downloadBytes(await m.exportStl(spec), `${name}.stl`, "model/stl");
        else if (kind === "glb") downloadBytes(await m.exportGlb(spec), `${name}.glb`, "model/gltf-binary");
        else {
          // AR Quick Look (iPhone/iPad): link rel="ar" con un'immagine dentro
          const usdz = await m.exportUsdz(spec);
          const a = document.createElement("a");
          a.rel = "ar";
          a.href = URL.createObjectURL(new Blob([usdz as BlobPart], { type: "model/vnd.usdz+zip" }));
          a.appendChild(document.createElement("img"));
          a.click();
        }
      }
      track("config_download", { format: kind, type: spec.type });
    } catch {
      setDownloadError(true);
    } finally {
      setBusy(null);
    }
  };

  /* ------------------------------------------------------------- campi */
  const radio = "peer sr-only";
  const choice =
    "flex h-full cursor-pointer flex-col gap-1 border border-line-strong bg-bg p-3 transition-colors hover:border-accent peer-checked:border-accent peer-checked:bg-[color-mix(in_srgb,var(--c-accent)_10%,var(--c-bg))] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent";
  const pill = (on: boolean) => cn("min-h-11 rounded-full border px-4 text-sm tabular transition-colors", on ? "border-accent bg-accent text-on-accent" : "border-line-strong hover:border-accent");
  const numberField = (key: keyof PartSpec, label: string, opts: { min?: number; max?: number; hint?: string; status?: string; unit?: string } = {}) => {
    const value = spec[key] as number | null | undefined;
    return (
      <div className="field">
        <label htmlFor={`${uid}-${key}`} className="field-label">
          {label}
        </label>
        {opts.hint ? (
          <p id={`${uid}-${key}-hint`} className="field-hint">
            {opts.hint}
          </p>
        ) : null}
        <div className="relative">
          <input
            id={`${uid}-${key}`}
            type="number"
            inputMode="decimal"
            min={opts.min ?? 0}
            max={opts.max}
            step="any"
            className="input pr-12 tabular"
            value={value ?? ""}
            onChange={(e) => patch({ [key]: e.target.value === "" ? undefined : Number(e.target.value) } as Partial<PartSpec>)}
            aria-describedby={opts.hint ? `${uid}-${key}-hint` : undefined}
            data-field={key}
          />
          <span aria-hidden="true" className="annot pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted">
            {opts.unit ?? "mm"}
          </span>
        </div>
        {opts.status ? (
          <p className="text-sm text-primary-ink" role="status">
            {opts.status}
          </p>
        ) : null}
      </div>
    );
  };
  const section = (n: number, title: string, children: ReactNode) => (
    <fieldset className="grid gap-4 border-t border-line pt-6">
      <legend className="flex items-center gap-3 text-display-s font-bold">
        <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full border border-accent font-mono text-sm text-accent">
          {n}
        </span>
        {title}
      </legend>
      {children}
    </fieldset>
  );
  const range_ = size ? lengthRange(size.wr) : null;
  const goTo = (
    <NextLink href={requestPath} className="font-medium text-primary-ink underline underline-offset-4">
      {t("goToRequest")}
    </NextLink>
  );
  const addedNote = added ? (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <Check aria-hidden="true" className="size-4 text-ok" strokeWidth={2} />
      {t("added")}
      {goTo}
    </p>
  ) : null;

  return (
    <div ref={root} className="scroll-mt-24" data-configurator data-type={spec.type}>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)]">
        {/* ------------------------------------------------- opzioni */}
        <div className="grid min-w-0 content-start gap-8">
          {section(
            1,
            t("typeTitle"),
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {PART_TYPES.map((d) => (
                <label key={d.type} className="block">
                  <input type="radio" name={`${uid}-type`} value={d.type} checked={spec.type === d.type} onChange={() => chooseType(d.type)} className={radio} />
                  <span className={choice} data-type-tile={d.type}>
                    <span className="font-semibold leading-snug">{t(`types.${d.type}.name`)}</span>
                    <span className="text-xs text-muted">{t(`types.${d.type}.short`)}</span>
                  </span>
                </label>
              ))}
            </div>,
          )}

          {isCustom ? (
            section(
              2,
              t("customTitle"),
              <>
                <p className="text-muted">{t("customBody")}</p>
                <CustomPartForm onFilesChange={setCustomFiles} addedNote={goTo} />
              </>,
            )
          ) : (
            <>
              {section(
                2,
                t("sizeTitle"),
                <>
                  <div className="field max-w-xs">
                    <label htmlFor={`${uid}-freq`} className="field-label">
                      {t("freqLabel")}
                    </label>
                    <input id={`${uid}-freq`} inputMode="decimal" autoComplete="off" className="input tabular" value={freq} onChange={(e) => setFreq(e.target.value)} placeholder={locale === "it" ? "Es. 10,5" : "E.g. 10.5"} data-field="ghz" />
                  </div>
                  <p aria-live="polite" className="min-h-6 text-sm">
                    {freqValid ? (suggested ? t("freqSuggest", { freq: num(freqNum, locale, 0, 2), size: sizeLabel(suggested) }) : t("freqNone", { freq: num(freqNum, locale, 0, 2) })) : ""}
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
                    {SIZES.map((s) => (
                      <label key={s.wr} className="block">
                        <input type="radio" name={`${uid}-size`} value={s.wr} checked={spec.wr === s.wr} onChange={() => chooseSize(s.wr)} className={radio} />
                        <span className={cn(choice, covering?.has(s.wr) && "ring-2 ring-accent/40")}>
                          <span className="font-display text-lg font-bold wdth-wide">{s.wr}</span>
                          <span className="annot text-muted">
                            {s.iec} · {s.wg}
                          </span>
                          <span className="annot tabular text-primary-ink">{range(s.min, s.max, locale)} GHz</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </>,
              )}

              {section(
                3,
                t("geometryTitle"),
                <>
                  {geo === "length" ? (
                    <>
                      <div className="flex flex-wrap gap-2" role="group" aria-label={t("lengthLabel")}>
                        {LENGTH_PRESETS.map((p) => (
                          <button key={p} type="button" aria-pressed={spec.length === p} onClick={() => patch({ length: p })} className={pill(spec.length === p)}>
                            {p} mm
                          </button>
                        ))}
                      </div>
                      <div className="max-w-xs">
                        {numberField("length", t("lengthLabel"), {
                          min: 1,
                          hint: range_ ? (range_.min ? t("lengthRange", { min: num(range_.min, locale), max: num(range_.max, locale) }) : t("lengthMax", { max: num(range_.max, locale) })) : undefined,
                          status: lState === "out" ? t("lengthOut") : undefined,
                        })}
                      </div>
                    </>
                  ) : null}

                  {geo === "bend" || geo === "offset" ? (
                    <div className="grid gap-2">
                      <p className="field-label" id={`${uid}-plane`}>
                        {t("planeLabel")}
                      </p>
                      <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby={`${uid}-plane`}>
                        {(["E", "H"] as const).map((pl) => (
                          <button key={pl} type="button" role="radio" aria-checked={spec.plane === pl} onClick={() => patch({ plane: pl })} className={pill(spec.plane === pl)} data-plane={pl}>
                            {t(`plane.${pl}`)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {geo === "bend" ? (
                    <>
                      <div className="grid gap-2">
                        <p className="field-label" id={`${uid}-angle`}>
                          {t("angleLabel")}
                        </p>
                        <div className="flex flex-wrap gap-2" role="group" aria-labelledby={`${uid}-angle`}>
                          {BEND_ANGLES.map((a) => (
                            <button key={a} type="button" aria-pressed={spec.angle === a} onClick={() => patch({ angle: a })} className={pill(spec.angle === a)}>
                              {a}°
                            </button>
                          ))}
                        </div>
                        <div className="max-w-xs">{numberField("angle", t("angleFree"), { min: 1, max: 180, unit: "°" })}</div>
                      </div>
                      <div className="grid gap-2">
                        <p className="field-label" id={`${uid}-radius`}>
                          {t("radiusLabel")}
                        </p>
                        <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby={`${uid}-radius`}>
                          <button type="button" role="radio" aria-checked={spec.radius === null} onClick={() => patch({ radius: null })} className={pill(spec.radius === null)}>
                            {t("radiusStd")}
                          </button>
                          <button type="button" role="radio" aria-checked={spec.radius !== null} onClick={() => patch({ radius: spec.radius ?? 40 })} className={pill(spec.radius !== null)}>
                            {t("radiusCustom")}
                          </button>
                        </div>
                        {spec.radius !== null ? <div className="max-w-xs">{numberField("radius", t("radiusValue"), { min: 1 })}</div> : null}
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        {numberField("leg1", t("leg1"), { min: 1 })}
                        {numberField("leg2", t("leg2"), { min: 1 })}
                      </div>
                    </>
                  ) : null}

                  {geo === "twist" ? (
                    <>
                      <div className="grid gap-2">
                        <p className="field-label" id={`${uid}-rot`}>
                          {t("rotationLabel")}
                        </p>
                        <div className="flex flex-wrap gap-2" role="group" aria-labelledby={`${uid}-rot`}>
                          {TWIST_ROTATIONS.map((a) => (
                            <button key={a} type="button" aria-pressed={spec.rotation === a} onClick={() => patch({ rotation: a })} className={pill(spec.rotation === a)}>
                              {a}°
                            </button>
                          ))}
                        </div>
                        <div className="max-w-xs">{numberField("rotation", t("rotationFree"), { min: 1, max: 360, unit: "°" })}</div>
                      </div>
                      <div className="grid gap-2">
                        <p className="field-label" id={`${uid}-dir`}>
                          {t("directionLabel")}
                        </p>
                        <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby={`${uid}-dir`}>
                          {(["cw", "ccw"] as const).map((d) => (
                            <button key={d} type="button" role="radio" aria-checked={spec.direction === d} onClick={() => patch({ direction: d })} className={pill(spec.direction === d)}>
                              {t(`dir.${d}`)}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="max-w-xs">{numberField("length", t("lengthLabel"), { min: 1 })}</div>
                    </>
                  ) : null}

                  {geo === "offset" ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {numberField("offset", t("offsetLabel"), { min: 0 })}
                      {numberField("length", t("offsetLength"), { min: 1 })}
                    </div>
                  ) : null}
                </>,
              )}

              {section(
                4,
                t("flangesTitle"),
                <div className="grid gap-4 sm:grid-cols-2">
                  {(
                    [
                      ["f1", t("flange1")],
                      ["f2", t("flange2")],
                    ] as const
                  ).map(([k, label]) => (
                    <div key={k} className="field">
                      <label htmlFor={`${uid}-${k}`} className="field-label">
                        {label}
                      </label>
                      <select id={`${uid}-${k}`} className="input font-mono" value={spec[k]} onChange={(e) => patch({ [k]: e.target.value } as Partial<PartSpec>)} data-field={k}>
                        {flanges.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.label}
                          </option>
                        ))}
                        <option value={OTHER_FLANGE}>{t("flangeOther")}</option>
                      </select>
                    </div>
                  ))}
                  {ENV.demo ? (
                    <p className="annot text-muted sm:col-span-2">
                      <span className="todo">{t("flangeNote")}</span>
                    </p>
                  ) : null}
                </div>,
              )}

              {section(
                5,
                t("finishTitle"),
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="field">
                    <label htmlFor={`${uid}-fin`} className="field-label">
                      {t("finish")}
                    </label>
                    <select id={`${uid}-fin`} className="input" value={spec.finish} onChange={(e) => patch({ finish: e.target.value as PartSpec["finish"] })} data-field="finish">
                      {FINISHES.map((f) => (
                        <option key={f} value={f}>
                          {t(`finishes.${f}`)}
                        </option>
                      ))}
                    </select>
                    {spec.finish === "painted" ? <p className="field-hint">{t("paintedHint")}</p> : null}
                  </div>
                  <div className="field">
                    <label htmlFor={`${uid}-tr`} className="field-label">
                      {t("treatment")}
                    </label>
                    <select id={`${uid}-tr`} className="input" value={spec.treatment} onChange={(e) => patch({ treatment: e.target.value as PartSpec["treatment"] })} aria-describedby={`${uid}-tr-hint`} data-field="treatment">
                      {TREATMENTS.map((x) => (
                        <option key={x} value={x}>
                          {t(`treatments.${x}`)}
                        </option>
                      ))}
                    </select>
                    <p id={`${uid}-tr-hint`} className="field-hint">
                      {t("treatmentHint")}
                    </p>
                  </div>
                </div>,
              )}

              {section(
                6,
                t("notesTitle"),
                <div className="field">
                  <label htmlFor={`${uid}-notes`} className="sr-only">
                    {t("notesTitle")}
                  </label>
                  <textarea id={`${uid}-notes`} rows={3} className="input resize-y" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("notesPlaceholder")} maxLength={3000} />
                </div>,
              )}
            </>
          )}
        </div>

        {/* ------------------------------------------------- 3D, disegno, riepilogo */}
        <aside aria-label={t("summary")} className="grid min-w-0 content-start gap-4 lg:sticky lg:top-24 lg:self-start">
          <figure className="border border-line bg-surface">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-2">
              <figcaption className="annot uppercase tracking-[0.14em] text-muted">{isCustom ? t("stlPreviewLabel") : view === "3d" ? t("view3d") : t("drawing")}</figcaption>
              {!isCustom ? (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setView(view === "3d" ? "2d" : "3d");
                    if (view === "2d") track("config_3d_view", { type: spec.type });
                  }}
                  aria-pressed={view === "2d"}
                  data-toggle-view
                >
                  {view === "3d" ? <PencilRuler aria-hidden="true" className="size-4" strokeWidth={1.75} /> : <Box aria-hidden="true" className="size-4" strokeWidth={1.75} />}
                  {view === "3d" ? t("drawingButton") : t("view3d")}
                </button>
              ) : null}
            </div>
            {isCustom ? (
              <StlPreview files={customFiles} emptyText={t("stlPreviewEmpty")} label={t("stlPreviewLabel")} />
            ) : view === "3d" ? (
              <Viewer3D spec={spec} label={t("viewerLabel", { code })} />
            ) : (
              <TechDrawing spec={spec} flangeA={text.flange(spec.f1)} flangeB={text.flange(spec.f2)} code={code} labels={labels} locale={locale} alt={t("drawingAlt", { code })} />
            )}
          </figure>

          {!isCustom ? (
            <div className="border border-line bg-surface p-5">
              <h3 className="annot uppercase tracking-[0.14em] text-muted">{t("summary")}</h3>
              <p className="mt-2 break-words font-mono text-base font-medium leading-snug" data-part-code>
                {code}
              </p>
              <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                <dt className="text-muted">{t("type")}</dt>
                <dd>{t(`types.${spec.type}.name`)}</dd>
                {size ? (
                  <>
                    <dt className="text-muted">{t("size")}</dt>
                    <dd className="tabular">{sizeLabel(size)}</dd>
                    <dt className="text-muted">{t("band")}</dt>
                    <dd className="tabular">{range(size.min, size.max, locale)} GHz</dd>
                  </>
                ) : null}
                <dt className="text-muted">{t("flanges")}</dt>
                <dd className="font-mono text-[0.8125rem]">
                  {text.flange(spec.f1)} / {text.flange(spec.f2)}
                </dd>
                <dt className="text-muted">{t("finish")}</dt>
                <dd>{t(`finishes.${spec.finish}`)}</dd>
                <dt className="text-muted">{t("treatment")}</dt>
                <dd>{t(`treatments.${spec.treatment}`)}</dd>
              </dl>
              {electrical.length ? (
                <>
                  <h4 className="annot mt-4 uppercase tracking-[0.14em] text-muted">{t("electrical")}</h4>
                  <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5 text-sm">
                    {electrical.map((r) => (
                      <div key={r.label} className="contents">
                        <dt className="text-muted">{r.label}</dt>
                        <dd className="text-right tabular">{r.value}</dd>
                      </div>
                    ))}
                  </dl>
                </>
              ) : null}
              {lState === "out" ? <p className="mt-3 text-sm text-primary-ink">{t("lengthOut")}</p> : null}

              <button type="button" className="btn btn-primary mt-5 w-full" onClick={add} disabled={!valid} data-add-configured>
                <Plus aria-hidden="true" className="size-4" strokeWidth={1.75} />
                {t("add")}
              </button>
              <div aria-live="polite" className="mt-2 min-h-6 text-sm">
                {addedNote}
              </div>

              <div className="mt-2 flex flex-wrap gap-2 border-t border-line pt-4">
                {(
                  [
                    ["pdf", t("downloadPdf"), FileDown],
                    ["stl", t("downloadStl"), Download],
                    ["glb", t("downloadGlb"), Download],
                  ] as const
                ).map(([k, label, Icon]) => (
                  <button key={k} type="button" className="btn btn-ghost btn-sm" onClick={() => download(k)} disabled={busy !== null || !valid} aria-busy={busy === k} data-download={k}>
                    <Icon aria-hidden="true" className="size-4" strokeWidth={1.75} />
                    {busy === k ? t("preparing") : label}
                  </button>
                ))}
                {ios ? (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => download("ar")} disabled={busy !== null || !valid}>
                    <Smartphone aria-hidden="true" className="size-4" strokeWidth={1.75} />
                    {t("ar")}
                  </button>
                ) : null}
                <button type="button" className="btn btn-ghost btn-sm" onClick={share} data-share>
                  {shared ? <Check aria-hidden="true" className="size-4" strokeWidth={2} /> : <Share2 aria-hidden="true" className="size-4" strokeWidth={1.75} />}
                  {shared ? t("shared") : t("share")}
                </button>
                <a
                  className="btn btn-ghost btn-sm"
                  href={`mailto:?subject=${encodeURIComponent(code)}`}
                  onClick={(e) => {
                    const url = `${window.location.origin}${window.location.pathname}?${specToParams(spec)}#configura`;
                    e.currentTarget.href = `mailto:?subject=${encodeURIComponent(code)}&body=${encodeURIComponent(`${t("shareText")}\n${url}`)}`;
                    track("config_share", { channel: "email" });
                  }}
                >
                  <Mail aria-hidden="true" className="size-4" strokeWidth={1.75} />
                  {t("shareEmail")}
                </a>
              </div>
              <p className="mt-3 flex items-start gap-2 text-xs text-muted">
                <Info aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" strokeWidth={1.75} />
                {t("stepNote")}
              </p>
              {downloadError ? (
                <p role="alert" className="field-error mt-2">
                  {t("downloadError")}
                </p>
              ) : null}
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
