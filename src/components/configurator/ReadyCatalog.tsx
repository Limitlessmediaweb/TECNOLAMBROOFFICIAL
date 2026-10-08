"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { Check, Plus, SlidersHorizontal, X } from "lucide-react";
import { useClientLocale, useT } from "@/lib/client-i18n";
import { CONFIGURABLE_FAMILIES, type FamilyKey } from "@/data/families";
import { SEAMLESS_TABLE, SIZES, TWIST_TABLE, isOnRequest, num, range, sizeLabel } from "@/data/waveguides";
import { addItem } from "@/lib/request";
import { partCode } from "@/lib/part";
import { track } from "@/lib/analytics";
import { partDetail, type ConfigureDetail } from "./Configurator";
import { cn } from "@/lib/cn";

type Filters = { family: string; size: string; ghz: string };
const EMPTY: Filters = { family: "", size: "", ghz: "" };
const PAGE = 9;

/** Prodotti pronti: le misure standard delle tabelle, per famiglia configurabile. */
export function ReadyCatalog({ familyNames }: { familyNames: Record<string, string> }) {
  const t = useT("shop");
  const tt = useT("tables");
  const locale = useClientLocale();
  const uid = useId();
  const [f, setF] = useState<Filters>(EMPTY);
  const [all, setAll] = useState(false);
  const [added, setAdded] = useState<string | null>(null);

  useEffect(() => {
    if (!added) return;
    const id = window.setTimeout(() => setAdded(null), 2500);
    return () => window.clearTimeout(id);
  }, [added]);

  const items = useMemo(
    () => CONFIGURABLE_FAMILIES.flatMap((fam) => SIZES.map((s) => ({ family: fam.key, size: s, key: `${fam.key}:${s.wr}` }))),
    [],
  );
  const ghz = Number(f.ghz.replace(",", "."));
  const ghzOk = f.ghz.trim() !== "" && Number.isFinite(ghz) && ghz > 0;
  const visible = items.filter(
    (i) => (!f.family || i.family === f.family) && (!f.size || i.size.wr === f.size) && (!ghzOk || (ghz >= i.size.min && ghz <= i.size.max)),
  );
  const shown = all || f.family || f.size || ghzOk ? visible : visible.slice(0, PAGE);
  const active = f.family || f.size || f.ghz;

  const keyData = (family: FamilyKey, wr: string): string | null => {
    if (family === "twistable") {
      const r = TWIST_TABLE.find((x) => x.wr === wr);
      return r ? `${num(r.att, locale, 2, 2)} dB/m · RL ${num(r.rl600, locale, 1, 1)} dB (600 mm)` : null;
    }
    const r = SEAMLESS_TABLE.find((x) => x.wr === wr);
    if (!r || isOnRequest(r)) return tt("onRequest");
    return `${num(r.att!, locale, 2, 2)} dB/m · VSWR ${num(r.vswr600!, locale, 2, 2)} (600 mm)`;
  };

  const configure = (d: ConfigureDetail) => window.dispatchEvent(new CustomEvent<ConfigureDetail>("tl:configure", { detail: d }));

  return (
    <div className="grid gap-8 lg:grid-cols-[16rem_1fr] lg:gap-10">
      <search aria-label={t("filtersLabel")} className="grid content-start gap-5 lg:sticky lg:top-28">
        <p className="annot flex items-center gap-2 uppercase tracking-[0.14em] text-muted">
          <SlidersHorizontal aria-hidden="true" className="size-4" strokeWidth={1.75} />
          {t("filtersLabel")}
        </p>
        <fieldset className="grid gap-2">
          <legend className="field-label mb-2">{t("family")}</legend>
          <div className="flex flex-wrap gap-2">
            {[{ value: "", label: t("allFamilies") }, ...CONFIGURABLE_FAMILIES.map((fam) => ({ value: fam.key, label: familyNames[fam.key] }))].map((opt) => (
              <label key={opt.value || "all"} className="cursor-pointer">
                <input type="radio" name={`${uid}-fam`} value={opt.value} checked={f.family === opt.value} onChange={() => setF({ ...f, family: opt.value })} className="peer sr-only" />
                <span className="inline-flex min-h-10 items-center rounded-full border border-line-strong px-3.5 text-sm transition-colors peer-checked:border-accent peer-checked:bg-accent peer-checked:text-on-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent hover:border-accent">
                  {opt.label}
                </span>
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
        {active ? (
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
            {shown.map(({ family, size, key }) => {
              const name = familyNames[family];
              const code = partCode({ family, wr: size.wr });
              return (
                <li key={key}>
                  <article className="flex h-full flex-col border border-line bg-surface p-5 transition-colors hover:border-accent" data-ready-item={key}>
                    <p className="annot text-primary-ink">{code}</p>
                    <h4 className="mt-1 font-semibold leading-snug">{name}</h4>
                    <p className="mt-3 font-display text-2xl font-bold wdth-wide">{size.wr}</p>
                    <dl className="annot mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-muted">
                      <dt className="sr-only">{t("size")}</dt>
                      <dd className="col-span-2">{sizeLabel(size).replace(`${size.wr} · `, "")}</dd>
                      <dt>{t("band")}</dt>
                      <dd className="tabular text-fg">{range(size.min, size.max, locale)} GHz</dd>
                    </dl>
                    <p className="mt-2 text-sm text-muted">{keyData(family, size.wr)}</p>
                    <div className="mt-auto flex flex-wrap gap-2 pt-5">
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => configure({ family, wr: size.wr })} aria-label={t("configureLabel", { name, size: size.wr })}>
                        {t("configure")}
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        aria-label={`${added === key ? t("added") : t("add")}: ${name} ${size.wr}`}
                        onClick={() => {
                          addItem({ kind: "ready", spec: { family, wr: size.wr }, code, detail: partDetail({ family, wr: size.wr }, name, locale) });
                          setAdded(key);
                          track("add_to_request", { kind: "ready", family, size: size.wr });
                        }}
                      >
                        {added === key ? <Check aria-hidden="true" className="size-4" strokeWidth={2} /> : <Plus aria-hidden="true" className="size-4" strokeWidth={1.75} />}
                        {added === key ? t("added") : t("add")}
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
