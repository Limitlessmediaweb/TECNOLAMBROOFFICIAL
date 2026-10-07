"use client";

import { useEffect, type RefObject } from "react";

/**
 * Infrastruttura leggera per le animazioni: nessun import statico di GSAP.
 * GSAP arriva da lib/gsap-core.ts con import() dinamico, una sola volta, dopo l'idratazione.
 */

export type GsapKit = typeof import("./gsap-core");
type Cleanup = void | (() => void);

let kitPromise: Promise<GsapKit> | null = null;
/** Carica (una volta) GSAP + plugin registrati. */
export function loadGsap(): Promise<GsapKit> {
  kitPromise ??= import("./gsap-core");
  return kitPromise;
}

/** Condizioni usate con gsap.matchMedia() in tutti i componenti */
export const MQ = {
  motion: "(prefers-reduced-motion: no-preference)",
  reduce: "(prefers-reduced-motion: reduce)",
  desktop: "(min-width: 1024px)",
  mobile: "(max-width: 1023.98px)",
  fine: "(pointer: fine) and (hover: hover)",
} as const;

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia(MQ.reduce).matches;
}

/** Esegue `cb` quando il main thread è libero (o al più tardi dopo `timeout` ms). Restituisce l'annullamento. */
export function whenIdle(cb: () => void, timeout = 1500): () => void {
  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(cb, { timeout });
    return () => window.cancelIdleCallback(id);
  }
  const id = window.setTimeout(cb, 200);
  return () => window.clearTimeout(id);
}

/**
 * Equivalente di useGSAP (@gsap/react) con GSAP caricato in differita.
 *  - mode "view" (predefinito): il setup parte quando l'elemento arriva a circa una schermata
 *    dal viewport e il browser è libero. Al caricamento lavorano solo le animazioni above the fold.
 *  - mode "now": parte appena GSAP è caricato (hero, intro).
 * Tutto ciò che viene creato nel setup vive in un gsap.context: cleanup con ctx.revert().
 */
export function useLazyGSAP(
  setup: (kit: GsapKit) => Cleanup,
  scope: RefObject<Element | null>,
  deps: unknown[] = [],
  mode: "view" | "now" = "view",
) {
  useEffect(() => {
    const el = scope.current;
    let disposed = false;
    let ctx: ReturnType<GsapKit["gsap"]["context"]> | null = null;
    let cancelIdle: (() => void) | null = null;
    let io: IntersectionObserver | null = null;

    const run = async () => {
      const kit = await loadGsap();
      if (disposed) return;
      ctx = kit.gsap.context(() => setup(kit), el ?? undefined);
      if (mode === "view") kit.queueRefresh();
    };

    if (mode === "now" || !el) {
      void run();
    } else {
      io = new IntersectionObserver(
        (entries) => {
          if (!entries.some((e) => e.isIntersecting)) return;
          io?.disconnect();
          cancelIdle = whenIdle(() => void run(), 400);
        },
        { rootMargin: "100% 0px 100% 0px" },
      );
      io.observe(el);
    }

    return () => {
      disposed = true;
      io?.disconnect();
      cancelIdle?.();
      ctx?.revert();
    };
    // Le dipendenze arrivano dal chiamante, come in useGSAP({ dependencies }).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
