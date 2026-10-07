"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { ProductCard } from "./ProductCard";
import { useClientLocale, useT } from "@/lib/client-i18n";
import type { Product, ProductLine, ShopFamily } from "@/lib/commerce/types";
import { cn } from "@/lib/cn";

const FAMILIES: ShopFamily[] = ["rigid", "flexible", "bends", "twist", "transitions", "flanges", "ham"];
const LINES: ProductLine[] = ["pro", "ham"];

type Filters = { family: string; size: string; line: string; q: string };
const EMPTY: Filters = { family: "", size: "", line: "", q: "" };

/** Parametri URL (italiani per entrambe le lingue, sono interni): ?famiglia=&misura=&linea=&q= */
function fromUrl(): Filters {
  const p = new URLSearchParams(window.location.search);
  return { family: p.get("famiglia") ?? "", size: p.get("misura") ?? "", line: p.get("linea") ?? "", q: p.get("q") ?? "" };
}

function toUrl(f: Filters) {
  const p = new URLSearchParams();
  if (f.family) p.set("famiglia", f.family);
  if (f.size) p.set("misura", f.size);
  if (f.line) p.set("linea", f.line);
  if (f.q) p.set("q", f.q);
  const qs = p.toString();
  window.history.replaceState(window.history.state, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
}

function normalize(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[\s-]+/g, "");
}

export function ShopCatalog({ products, shopPath }: { products: Product[]; shopPath: string }) {
  const t = useT("shop");
  const locale = useClientLocale();
  const uid = useId();
  const [f, setF] = useState<Filters>(EMPTY);

  // Filtri iniziali dall'URL (dopo il primo frame: l'URL non è disponibile durante l'SSR)
  useEffect(() => {
    const id = requestAnimationFrame(() => setF(fromUrl()));
    return () => cancelAnimationFrame(id);
  }, []);

  const set = (patch: Partial<Filters>) => {
    const next = { ...f, ...patch };
    setF(next);
    toUrl(next);
  };

  const sizes = useMemo(
    () => [...new Set(products.map((p) => p.specs.wr).filter((w): w is string => Boolean(w)))].sort((a, b) => Number(b.slice(3)) - Number(a.slice(3))),
    [products],
  );

  const visible = useMemo(() => {
    const q = normalize(f.q);
    return products.filter(
      (p) =>
        (!f.family || p.family === f.family) &&
        (!f.size || p.specs.wr === f.size) &&
        (!f.line || p.line === f.line) &&
        (!q || normalize(`${p.code} ${p.title} ${p.specs.wr ?? ""}`).includes(q)),
    );
  }, [products, f]);

  const active = f.family || f.size || f.line || f.q;

  return (
    <div className="grid gap-8 lg:grid-cols-[17rem_1fr] lg:gap-10">
      <search aria-label={t("filtersLabel")} className="grid content-start gap-6 lg:sticky lg:top-28">
        <div className="field">
          <label htmlFor={`${uid}-q`} className="field-label">
            {t("search")}
          </label>
          <div className="relative">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" strokeWidth={1.75} />
            <input
              id={`${uid}-q`}
              type="search"
              value={f.q}
              onChange={(e) => set({ q: e.target.value })}
              placeholder={t("searchPlaceholder")}
              className="input pl-9"
              autoComplete="off"
            />
          </div>
        </div>

        <fieldset className="grid gap-2">
          <legend className="field-label mb-2">{t("family")}</legend>
          <div className="flex flex-wrap gap-2">
            {[{ value: "", label: t("allFamilies") }, ...FAMILIES.map((fam) => ({ value: fam, label: t(`families.${fam}`) }))].map((opt) => (
              <label key={opt.value || "all"} className="cursor-pointer">
                <input type="radio" name={`${uid}-family`} value={opt.value} checked={f.family === opt.value} onChange={() => set({ family: opt.value })} className="peer sr-only" />
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
          <select id={`${uid}-size`} value={f.size} onChange={(e) => set({ size: e.target.value })} className="input font-mono">
            <option value="">{t("allSizes")}</option>
            {sizes.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <fieldset className="grid gap-2">
          <legend className="field-label mb-2">{t("line")}</legend>
          <div className="flex flex-wrap gap-2">
            {[{ value: "", label: t("allLines") }, ...LINES.map((l) => ({ value: l, label: t(`lines.${l}`) }))].map((opt) => (
              <label key={opt.value || "all"} className="cursor-pointer">
                <input type="radio" name={`${uid}-line`} value={opt.value} checked={f.line === opt.value} onChange={() => set({ line: opt.value })} className="peer sr-only" />
                <span className="inline-flex min-h-10 items-center rounded-full border border-line-strong px-3.5 text-sm transition-colors peer-checked:border-accent peer-checked:bg-accent peer-checked:text-on-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent hover:border-accent">
                  {opt.label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {active ? (
          <button type="button" onClick={() => set(EMPTY)} className="btn btn-ghost btn-sm justify-self-start">
            <X aria-hidden="true" className="size-4" strokeWidth={1.75} />
            {t("reset")}
          </button>
        ) : null}
      </search>

      <div>
        {/* h2 della lista (gerarchia h1 → h2 → h3 delle schede), aggiornato a ogni filtro */}
        <h2 className="annot mb-4 font-mono text-muted [font-variation-settings:normal]" aria-live="polite">
          {visible.length === 1 ? t("resultsOne") : t("results", { count: visible.length })}
        </h2>
        {visible.length === 0 ? (
          <div className="grid justify-items-start gap-4 border border-dashed border-line-strong p-8">
            <p>{t("empty")}</p>
            <button type="button" onClick={() => set(EMPTY)} className="btn btn-primary btn-sm">
              {t("reset")}
            </button>
          </div>
        ) : (
          <ul className={cn("grid gap-4 sm:grid-cols-2 xl:grid-cols-3")}>
            {visible.map((p) => (
              <li key={p.handle}>
                <ProductCard product={p} href={`${shopPath}/${p.handle}`} locale={locale} t={t} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
