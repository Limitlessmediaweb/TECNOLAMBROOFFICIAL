"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { Check, Plus, Search, SlidersHorizontal, X } from "lucide-react";
import { useClientLocale, useT } from "@/lib/client-i18n";
import type { PartSpec, PartType } from "@/data/configurator/types";
import { defaultSpec } from "@/data/configurator/defaults";
import { SEAMLESS_TABLE, SIZES, TWIST_TABLE, isOnRequest, num, range, sizeLabel, type Size } from "@/data/waveguides";
import { addItem } from "@/lib/request";
import { track } from "@/lib/analytics";
import { usePartText, type ConfigureDetail } from "./Configurator";
import { cn } from "@/lib/cn";

type Filters = { type: string; size: string; ghz: string; q: string };
const EMPTY: Filters = { type: "", size: "", ghz: "", q: "" };
const PAGE = 9;

/** Tipi del catalogo pronto: flessibili (lunghezza da indicare), curve E/H a 90°, twist a 90°. */
const READY_TYPES: readonly PartType[] = ["twistable", "seamless", "bend", "twist"];

type Ready = { key: string; type: PartType; variant: string; size: Size; spec: PartSpec };

/** Chiave della miniatura statica (public/render/<chiave>.webp) */
export function thumbKey(spec: PartSpec): string {
  return spec.type === "bend" ? `bend-${spec.plane ?? "E"}` : spec.type;
}

function readySpec(type: PartType, wr: string, plane?: "E" | "H"): PartSpec {
  const s = defaultSpec(type, wr);
  // flessibili pronte: la lunghezza si indica nella richiesta (limiti standard da tabella)
  if (type === "twistable" || type === "seamless") delete s.length;
  if (plane) s.plane = plane;
  return s;
}

/** Prodotti pronti: le misure standard per ogni tipo, con ricerca e filtri. */
export function ReadyCatalog({ thumbs = {} }: { thumbs?: Record<string, string> }) {
  const t = useT("shop");
  const tt = useT("tables");
  const tc = useT("configurator");
  const locale = useClientLocale();
  const text = usePartText();
  const uid = useId();
  const [f, setF] = useState<Filters>(EMPTY);
  const [all, setAll] = useState(false);
  const [added, setAdded] = useState<string | null>(null);

  useEffect(() => {
    if (!added) return;
    const id = window.setTimeout(() => setAdded(null), 2500);
    return () => window.clearTimeout(id);
  }, [added]);

  const items = useMemo<Ready[]>(
    () =>
      SIZES.flatMap((s) => [
        { key: `twistable:${s.wr}`, type: "twistable" as const, variant: "", size: s, spec: readySpec("twistable", s.wr) },
        { key: `seamless:${s.wr}`, type: "seamless" as const, variant: "", size: s, spec: readySpec("seamless", s.wr) },
        { key: `bend-E:${s.wr}`, type: "bend" as const, variant: "E", size: s, spec: readySpec("bend", s.wr, "E") },
        { key: `bend-H:${s.wr}`, type: "bend" as const, variant: "H", size: s, spec: readySpec("bend", s.wr, "H") },
        { key: `twist:${s.wr}`, type: "twist" as const, variant: "", size: s, spec: readySpec("twist", s.wr) },
      ]),
    [],
  );
  const ghz = Number(f.ghz.replace(",", "."));
  const ghzOk = f.ghz.trim() !== "" && Number.isFinite(ghz) && ghz > 0;
  const q = f.q.trim().toLowerCase();
  const name = (i: Ready) => (i.type === "bend" ? `${tc("types.bend.name")} ${tc(`plane.${i.variant}`)} 90°` : i.type === "twist" ? `${tc("types.twist.name")} 90°` : tc(`types.${i.type}.name`));
  const visible = items.filter((i) => {
    if (f.type && i.type !== f.type) return false;
    if (f.size && i.size.wr !== f.size) return false;
    if (ghzOk && !(ghz >= i.size.min && ghz <= i.size.max)) return false;
    if (q) {
      const hay = [name(i), text.reference(i.spec), i.size.wr, i.size.iec, i.size.wg].join(" ").toLowerCase();
      if (!q.split(/\s+/).every((w) => hay.includes(w.replace(/^wr(\d)/, "wr-$1")) || hay.includes(w))) return false;
    }
    return true;
  });
  const filtered = Boolean(f.type || f.size || ghzOk || q);
  const shown = all || filtered ? visible : visible.slice(0, PAGE);

  const keyData = (i: Ready): string | null => {
    if (i.type === "twistable") {
      const r = TWIST_TABLE.find((x) => x.wr === i.size.wr);
      return r ? `${num(r.att, locale, 2, 2)} dB/m · RL ${num(r.rl600, locale, 1, 1)} dB (600 mm)` : null;
    }
    if (i.type === "seamless") {
      const r = SEAMLESS_TABLE.find((x) => x.wr === i.size.wr);
      if (!r || isOnRequest(r)) return tt("onRequest");
      return `${num(r.att!, locale, 2, 2)} dB/m · VSWR ${num(r.vswr600!, locale, 2, 2)} (600 mm)`;
    }
    return null;
  };

  const configure = (d: ConfigureDetail) => window.dispatchEvent(new CustomEvent<ConfigureDetail>("tl:configure", { detail: d }));
  const chip =
    "inline-flex min-h-10 items-center rounded-full border border-line-strong px-3.5 text-sm transition-colors peer-checked:border-accent peer-checked:bg-accent peer-checked:text-on-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent hover:border-accent";

  return (
    <div className="grid gap-8 lg:grid-cols-[16rem_1fr] lg:gap-10">
      <search aria-label={t("filtersLabel")} className="grid content-start gap-5 lg:sticky lg:top-28">
        <p className="annot flex items-center gap-2 uppercase tracking-[0.14em] text-muted">
          <SlidersHorizontal aria-hidden="true" className="size-4" strokeWidth={1.75} />
          {t("filtersLabel")}
        </p>
        <div className="field">
          <label htmlFor={`${uid}-q`} className="field-label">
            {t("search")}
          </label>
          <div className="relative">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" strokeWidth={1.75} />
            <input id={`${uid}-q`} type="search" autoComplete="off" className="input pl-9" placeholder={t("searchPlaceholder")} value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} data-ready-search />
          </div>
        </div>
        <fieldset className="grid gap-2">
          <legend className="field-label mb-2">{t("family")}</legend>
          <div className="flex flex-wrap gap-2">
            {[{ value: "", label: t("allFamilies") }, ...READY_TYPES.map((x) => ({ value: x, label: tc(`types.${x}.name`) }))].map((opt) => (
              <label key={opt.value || "all"} className="cursor-pointer">
                <input type="radio" name={`${uid}-type`} value={opt.value} checked={f.type === opt.value} onChange={() => setF({ ...f, type: opt.value })} className="peer sr-only" />
                <span className={chip}>{opt.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="field">
          <label htmlFor={`${uid}-size`} className="field-label">
            {t("size")}
          </label>
          <select id={`${uid}-size`} className="input font-mono" value={f.size} onChange={(e) => setF({ ...f, size: e.target.value })}>
            <option value="">{t("allSizes")}</option>
            {SIZES.map((s) => (
              <option key={s.wr} value={s.wr}>
                {s.wr}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`${uid}-ghz`} className="field-label">
            {t("freq")}
          </label>
          <input id={`${uid}-ghz`} inputMode="decimal" autoComplete="off" className="input tabular" placeholder={t("freqPlaceholder")} value={f.ghz} onChange={(e) => setF({ ...f, ghz: e.target.value })} />
        </div>
        {filtered || f.ghz ? (
          <button type="button" onClick={() => setF(EMPTY)} className="btn btn-ghost btn-sm justify-self-start">
            <X aria-hidden="true" className="size-4" strokeWidth={1.75} />
            {t("reset")}
          </button>
        ) : null}
      </search>

      <div className="min-w-0">
        <h3 className="annot mb-4 text-muted" aria-live="polite">
          {visible.length === 1 ? t("resultsOne") : t("results", { count: visible.length })}
        </h3>
        {visible.length === 0 ? (
          <div className="grid justify-items-start gap-4 border border-dashed border-line-strong p-8">
            <p>{t("empty")}</p>
            <button type="button" onClick={() => setF(EMPTY)} className="btn btn-primary btn-sm">
              {t("reset")}
            </button>
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {shown.map((i) => {
              const n = name(i);
              const code = text.reference(i.spec);
              const thumb = thumbs[thumbKey(i.spec)];
              const data = keyData(i);
              return (
                <li key={i.key}>
                  <article className="flex h-full flex-col border border-line bg-surface p-5 transition-colors hover:border-accent" data-ready-item={i.key}>
                    {thumb ? (
                      // miniatura statica del modello 3D (generata da scripts/render-thumbs.mjs)
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumb} alt="" width={320} height={200} loading="lazy" decoding="async" className="-mx-1 -mt-1 mb-3 aspect-[8/5] w-[calc(100%+0.5rem)] object-contain" />
                    ) : null}
                    <p className="annot break-words text-primary-ink">{code}</p>
                    <h4 className="mt-1 font-semibold leading-snug">{n}</h4>
                    <p className="mt-3 font-display text-2xl font-bold wdth-wide">{i.size.wr}</p>
                    <dl className="annot mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-muted">
                      <dt className="sr-only">{t("size")}</dt>
                      <dd className="col-span-2">{sizeLabel(i.size).replace(`${i.size.wr} · `, "")}</dd>
                      <dt>{t("band")}</dt>
                      <dd className="tabular text-fg">{range(i.size.min, i.size.max, locale)} GHz</dd>
                    </dl>
                    {data ? <p className="mt-2 text-sm text-muted">{data}</p> : null}
                    <div className="mt-auto flex flex-wrap gap-2 pt-5">
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => configure({ spec: i.spec.length || !(i.type === "twistable" || i.type === "seamless") ? i.spec : defaultSpec(i.type, i.size.wr) })}
                        aria-label={t("configureLabel", { name: n, size: i.size.wr })}
                      >
                        {t("configure")}
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        aria-label={`${added === i.key ? t("added") : t("add")}: ${n} ${i.size.wr}`}
                        onClick={() => {
                          addItem({ kind: "ready", spec: i.spec, code, detail: text.detail(i.spec) });
                          setAdded(i.key);
                          track("request_add", { kind: "ready", type: i.type, size: i.size.wr });
                        }}
                        data-add-ready
                      >
                        {added === i.key ? <Check aria-hidden="true" className="size-4" strokeWidth={2} /> : <Plus aria-hidden="true" className="size-4" strokeWidth={1.75} />}
                        {added === i.key ? t("added") : t("add")}
                      </button>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        )}
        {!all && shown.length < visible.length ? (
          <button type="button" className={cn("btn btn-ghost mt-6")} onClick={() => setAll(true)}>
            {t("showMore", { count: visible.length })}
          </button>
        ) : null}
        <p className="sr-only" aria-live="polite">
          {added ? t("added") : ""}
        </p>
      </div>
    </div>
  );
}
