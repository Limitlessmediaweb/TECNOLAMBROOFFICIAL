"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/cn";

export type Photo = { src: string; alt: string };

/**
 * Galleria: prima foto grande, miniature sotto, lightbox in <dialog> (Esc, frecce, focus intrappolato).
 * Non si monta se non ci sono foto (lo decide la pagina server).
 */
export function Gallery({ photos, labels }: { photos: Photo[]; labels: { open: string; close: string; prev: string; next: string; counter: string } }) {
  const [active, setActive] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const count = photos.length;
  const go = (d: number) => setActive((i) => (i + d + count) % count);
  const open = (i: number) => {
    setActive(i);
    dialog.current?.showModal();
    window.__lenis?.stop();
  };

  return (
    <div className="grid gap-3">
      <button type="button" onClick={() => open(active)} className="relative block aspect-[4/3] w-full overflow-hidden border border-line bg-surface" aria-label={`${labels.open}: ${photos[active].alt}`}>
        <Image src={photos[active].src} alt={photos[active].alt} fill sizes="(min-width: 1024px) 60vw, 100vw" className="object-cover" priority={false} />
      </button>
      {count > 1 ? (
        <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {photos.map((p, i) => (
            <li key={p.src}>
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-current={i === active ? "true" : undefined}
                aria-label={p.alt}
                className={cn("relative block aspect-square w-full overflow-hidden border", i === active ? "border-accent" : "border-line hover:border-line-strong")}
              >
                <Image src={p.src} alt="" fill sizes="120px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <dialog
        ref={dialog}
        onClose={() => window.__lenis?.start()}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") go(1);
          if (e.key === "ArrowLeft") go(-1);
        }}
        aria-label={photos[active].alt}
        className="m-auto h-[100dvh] max-h-none w-full max-w-none bg-[color-mix(in_srgb,var(--c-bg)_94%,transparent)] p-0 text-fg backdrop:bg-black/60 open:grid open:grid-rows-[auto_1fr_auto]"
      >
        <div className="container-site flex items-center justify-between py-3">
          <p className="annot text-muted" aria-live="polite">
            {labels.counter.replace("{n}", String(active + 1)).replace("{total}", String(count))}
          </p>
          <button type="button" autoFocus onClick={() => dialog.current?.close()} className="grid size-11 place-items-center rounded-full border border-line-strong" aria-label={labels.close}>
            <X aria-hidden="true" className="size-5" strokeWidth={1.75} />
          </button>
        </div>
        <div className="relative mx-4 mb-2">
          <Image src={photos[active].src} alt={photos[active].alt} fill sizes="100vw" className="object-contain" />
        </div>
        {count > 1 ? (
          <div className="flex justify-center gap-3 pb-6">
            <button type="button" onClick={() => go(-1)} className="grid size-11 place-items-center rounded-full border border-line-strong" aria-label={labels.prev}>
              <ChevronLeft aria-hidden="true" className="size-5" strokeWidth={1.75} />
            </button>
            <button type="button" onClick={() => go(1)} className="grid size-11 place-items-center rounded-full border border-line-strong" aria-label={labels.next}>
              <ChevronRight aria-hidden="true" className="size-5" strokeWidth={1.75} />
            </button>
          </div>
        ) : null}
        <p className="sr-only">{photos[active].alt}</p>
      </dialog>
    </div>
  );
}
