"use client";

import { useEffect, useRef, useState } from "react";
import { Expand, LoaderCircle, RotateCcw, Ruler } from "lucide-react";
import type { PartSpec } from "@/data/configurator/types";
import type { ViewPreset, Viewer } from "@/lib/part3d";
import { useClientLocale, useT } from "@/lib/client-i18n";
import { num } from "@/data/waveguides";
import { cn } from "@/lib/cn";

/**
 * Vista 3D del pezzo. Three.js arriva con import dinamico quando il pannello entra nello schermo
 * (o subito con `eager`). Dopo il primo caricamento ogni modifica aggiorna il modello con una
 * dissolvenza di 300 ms, senza schermate di caricamento.
 */
export function Viewer3D({ spec, eager = false, label }: { spec: PartSpec; eager?: boolean; label: string }) {
  const t = useT("configurator");
  const locale = useClientLocale();
  const wrap = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const viewer = useRef<Viewer | null>(null);
  const latest = useRef(spec);
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [visible, setVisible] = useState(eager);
  const [view, setView] = useState<ViewPreset>("iso");
  const [dims, setDims] = useState(false);
  const [exploded, setExploded] = useState(false);
  const [triangles, setTriangles] = useState(0);

  useEffect(() => {
    if (visible || !wrap.current) return;
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setVisible(true), { rootMargin: "200px" });
    io.observe(wrap.current);
    return () => io.disconnect();
  }, [visible]);

  useEffect(() => {
    if (!visible || !box.current) return;
    let cancelled = false;
    let done = false;
    const el = box.current;
    // "loading" solo se il modello non è già pronto (con il modulo in cache può arrivare prima)
    const raf = requestAnimationFrame(() => !done && setState("loading"));
    import("@/lib/part3d")
      .then(async ({ mountViewer }) => {
        const v = await mountViewer(el, latest.current, (x) => num(x, locale, 0, 1));
        done = true;
        if (cancelled) return v.dispose();
        viewer.current = v;
        setTriangles(v.triangles());
        setState("ready");
      })
      .catch(() => {
        done = true;
        if (!cancelled) setState("error");
      });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      viewer.current?.dispose();
      viewer.current = null;
    };
  }, [visible, locale]);

  // aggiornamento del modello (raggruppa le modifiche rapide, es. digitazione di una lunghezza)
  useEffect(() => {
    latest.current = spec;
    const id = window.setTimeout(() => {
      viewer.current?.setSpec(spec);
      if (viewer.current) setTriangles(viewer.current.triangles());
    }, 120);
    return () => window.clearTimeout(id);
  }, [spec]);

  const tool = "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors";
  const on = (v: boolean) => cn(tool, v ? "border-accent bg-accent text-on-accent" : "border-line-strong bg-surface hover:border-accent");
  return (
    <div data-viewer-state={state} data-triangles={triangles}>
      <div ref={wrap} className="relative aspect-[4/3] w-full overflow-hidden bg-[radial-gradient(120%_90%_at_50%_30%,var(--c-surface),var(--c-surface-2))]">
        <div ref={box} role="img" aria-label={label} className="absolute inset-0 touch-none" data-lenis-prevent />
        {state === "idle" ? (
          <button type="button" onClick={() => setVisible(true)} className="btn btn-ghost btn-sm absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            {t("view3d")}
          </button>
        ) : null}
        {state === "loading" ? (
          <p className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-muted" role="status">
            <LoaderCircle aria-hidden="true" className="size-5 animate-spin motion-reduce:animate-none" strokeWidth={1.75} />
            <span className="sr-only">{t("loading3d")}</span>
          </p>
        ) : null}
        {state === "error" ? (
          <p className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-muted" role="alert">
            {t("error3d")}
          </p>
        ) : null}
      </div>
      {state === "ready" ? (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-line px-3 py-2">
          <div className="flex flex-wrap gap-1.5" role="toolbar" aria-label={t("viewTools")}>
            {(["iso", "front", "side"] as const).map((p) => (
              <button key={p} type="button" aria-pressed={view === p} onClick={() => (setView(p), viewer.current?.setView(p))} className={on(view === p)}>
                {t(`views.${p}`)}
              </button>
            ))}
          </div>
          <div className="ml-auto flex flex-wrap gap-1.5">
            <button type="button" aria-pressed={dims} onClick={() => (setDims(!dims), viewer.current?.setDims(!dims))} className={on(dims)}>
              <Ruler aria-hidden="true" className="size-3.5" strokeWidth={1.75} />
              {t("dims")}
            </button>
            <button type="button" aria-pressed={exploded} onClick={() => (setExploded(!exploded), viewer.current?.setExploded(!exploded))} className={on(exploded)}>
              <Expand aria-hidden="true" className="size-3.5" strokeWidth={1.75} />
              {t("exploded")}
            </button>
            <button type="button" onClick={() => (setView("iso"), viewer.current?.setView("iso"))} className={on(false)} aria-label={t("resetView")}>
              <RotateCcw aria-hidden="true" className="size-3.5" strokeWidth={1.75} />
            </button>
          </div>
          <p className="annot w-full text-muted max-sm:sr-only">{t("viewerHint")}</p>
        </div>
      ) : null}
    </div>
  );
}
