"use client";

import { useEffect, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";
import type { Viewer } from "@/lib/waveguide3d";

/**
 * Vista 3D del pezzo. Three.js arriva con import dinamico solo quando questo componente
 * viene montato (pulsante "Vedi in 3D"): il caricamento iniziale del sito non lo include.
 */
export function Viewer3D({ wr, lengthMm, label, hint, loadingText, errorText }: { wr: string; lengthMm: number; label: string; hint: string; loadingText: string; errorText: string }) {
  const box = useRef<HTMLDivElement>(null);
  const viewer = useRef<Viewer | null>(null);
  const spec = useRef({ wr, lengthMm });
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    const el = box.current;
    if (!el) return;
    import("@/lib/waveguide3d")
      .then(async ({ mountViewer }) => {
        const v = await mountViewer(el, spec.current);
        if (cancelled) return v.dispose();
        viewer.current = v;
        setState("ready");
      })
      .catch(() => !cancelled && setState("error"));
    return () => {
      cancelled = true;
      viewer.current?.dispose();
      viewer.current = null;
    };
  }, []);

  useEffect(() => {
    spec.current = { wr, lengthMm };
    viewer.current?.setSpec({ wr, lengthMm });
  }, [wr, lengthMm]);

  return (
    <div className="relative aspect-[1000/707] w-full overflow-hidden bg-[radial-gradient(120%_90%_at_50%_30%,var(--c-surface),var(--c-surface-2))]">
      <div ref={box} role="img" aria-label={label} className="absolute inset-0 touch-none" data-lenis-prevent />
      {state === "loading" ? (
        <p className="absolute inset-0 grid place-items-center text-sm text-muted" role="status">
          <span className="inline-flex items-center gap-2">
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" strokeWidth={1.75} />
            {loadingText}
          </span>
        </p>
      ) : null}
      {state === "error" ? (
        <p className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-muted" role="alert">
          {errorText}
        </p>
      ) : null}
      {state === "ready" ? <p className="annot pointer-events-none absolute bottom-3 left-3 text-muted">{hint}</p> : null}
    </div>
  );
}
