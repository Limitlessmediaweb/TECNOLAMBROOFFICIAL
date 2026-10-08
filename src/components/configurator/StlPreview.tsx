"use client";

import { useEffect, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";

/** Anteprima 3D del primo file STL caricato dal cliente (gli altri formati non hanno anteprima). */
export function StlPreview({ files, emptyText, label }: { files: File[]; emptyText: string; label: string }) {
  const box = useRef<HTMLDivElement>(null);
  const stl = files.find((f) => /\.stl$/i.test(f.name));
  const [state, setState] = useState<"empty" | "loading" | "ready" | "error">("empty");

  useEffect(() => {
    const el = box.current;
    if (!stl || !el) {
      const raf = requestAnimationFrame(() => setState("empty"));
      return () => cancelAnimationFrame(raf);
    }
    let cancelled = false;
    let dispose: (() => void) | null = null;
    const raf = requestAnimationFrame(() => setState("loading"));
    import("@/lib/part3d")
      .then(({ mountStlPreview }) => mountStlPreview(el, stl))
      .then((d) => {
        if (cancelled) return d();
        dispose = d;
        setState("ready");
      })
      .catch(() => !cancelled && setState("error"));
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      dispose?.();
    };
  }, [stl]);

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden bg-[radial-gradient(120%_90%_at_50%_30%,var(--c-surface),var(--c-surface-2))]" data-stl-state={state}>
      <div ref={box} role="img" aria-label={stl ? `${label}: ${stl.name}` : label} className="absolute inset-0 touch-none" data-lenis-prevent />
      {state === "empty" || state === "error" ? <p className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-muted">{emptyText}</p> : null}
      {state === "loading" ? (
        <p className="pointer-events-none absolute inset-0 grid place-items-center" role="status">
          <LoaderCircle aria-hidden="true" className="size-5 animate-spin text-muted motion-reduce:animate-none" strokeWidth={1.75} />
        </p>
      ) : null}
    </div>
  );
}
