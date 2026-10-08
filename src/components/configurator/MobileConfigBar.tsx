"use client";

import { useEffect, useState, type RefObject } from "react";
import { Check, Plus } from "lucide-react";
import type { PartSpec } from "@/data/configurator/types";

/**
 * Telefono e tablet (sotto 1024 px): barra fissa in basso con il riferimento corto del pezzo e
 * "Aggiungi alla richiesta", visibile mentre il configuratore è sullo schermo. Sopra, una
 * mini-anteprima statica (96×72) che si aggiorna col pezzo e scompare quando la vista grande è
 * visibile; toccandola si torna alla vista grande.
 */
export function MobileConfigBar({
  spec,
  label,
  onAdd,
  disabled,
  added,
  addLabel,
  addedLabel,
  previewLabel,
  rootRef,
  figureRef,
}: {
  spec: PartSpec;
  label: string;
  onAdd: () => void;
  disabled: boolean;
  added: boolean;
  addLabel: string;
  addedLabel: string;
  previewLabel: string;
  rootRef: RefObject<HTMLElement | null>;
  figureRef: RefObject<HTMLElement | null>;
}) {
  const [inView, setInView] = useState(false);
  const [figInView, setFigInView] = useState(true);
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    const fig = figureRef.current;
    if (!root || !fig) return;
    const io1 = new IntersectionObserver(([e]) => setInView(e.isIntersecting));
    const io2 = new IntersectionObserver(([e]) => setFigInView(e.isIntersecting), { threshold: 0.2 });
    io1.observe(root);
    io2.observe(fig);
    return () => {
      io1.disconnect();
      io2.disconnect();
    };
  }, [rootRef, figureRef]);

  // segnala la barra fissa (il pulsante WhatsApp si nasconde: vedi globals.css)
  useEffect(() => {
    const el = document.documentElement;
    if (inView) el.dataset.fixedBar = "configurator";
    else if (el.dataset.fixedBar === "configurator") delete el.dataset.fixedBar;
    return () => {
      if (el.dataset.fixedBar === "configurator") delete el.dataset.fixedBar;
    };
  }, [inView]);

  // miniatura statica, solo quando serve (vista grande fuori schermo) e solo su telefono/tablet
  const showMini = inView && !figInView;
  const key = JSON.stringify(spec);
  useEffect(() => {
    if (!showMini || window.matchMedia("(min-width: 1024px)").matches) return;
    let cancelled = false;
    const id = window.setTimeout(async () => {
      try {
        const { renderThumbnail } = await import("@/lib/part3d");
        const url = await renderThumbnail(JSON.parse(key) as PartSpec, 192, 144);
        if (!cancelled) setSrc(url);
      } catch {
        // senza WebGL resta solo la barra
      }
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [showMini, key]);

  if (!inView) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 lg:hidden" data-config-bar>
      {showMini && src ? (
        <button
          type="button"
          onClick={() => figureRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" })}
          className="mb-2 ml-4 block h-[72px] w-24 overflow-hidden rounded-sm border border-line-strong bg-surface shadow-[0_6px_20px_var(--c-shadow)]"
          aria-label={previewLabel}
          data-mini-preview
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="" width={96} height={72} className="h-full w-full object-contain" />
        </button>
      ) : null}
      <div className="flex items-center justify-between gap-3 border-t border-line bg-bg/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
        <span className="min-w-0 truncate font-mono text-sm" data-bar-label>
          {label}
        </span>
        <button type="button" className="btn btn-primary btn-sm shrink-0" onClick={onAdd} disabled={disabled} data-bar-add>
          {added ? <Check aria-hidden="true" className="size-4" strokeWidth={2} /> : <Plus aria-hidden="true" className="size-4" strokeWidth={1.75} />}
          {added ? addedLabel : addLabel}
        </button>
      </div>
    </div>
  );
}
