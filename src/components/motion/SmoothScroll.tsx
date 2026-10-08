"use client";

import { useEffect } from "react";
import type Lenis from "lenis";
import { usePathname } from "next/navigation";
import { loadGsap, MQ } from "@/lib/motion";

declare global {
  interface Window {
    __lenis?: Lenis;
  }
}

/**
 * Lenis sincronizzato con il ticker di GSAP e con ScrollTrigger. Spento con reduced motion.
 * Lenis e GSAP arrivano con import() dinamico: lo scroll nativo funziona già da subito.
 */
export function SmoothScroll() {
  const pathname = usePathname();

  useEffect(() => {
    if (window.matchMedia(MQ.reduce).matches) return;
    // Su touch niente smooth scroll: lo scroll nativo è più affidabile e non rallenta
    if (window.matchMedia("(hover: none) and (pointer: coarse)").matches) return;
    let disposed = false;
    let cleanup: (() => void) | undefined;

    void Promise.all([import("lenis"), loadGsap()]).then(([{ default: LenisCtor }, { gsap, ScrollTrigger }]) => {
      if (disposed) return;
      const lenis = new LenisCtor({
        autoRaf: false,
        anchors: { offset: -88 },
        lerp: 0.11,
        syncTouch: false,
        // Non intercettare lo scroll dentro elementi scrollabili (tabelle, menu).
        prevent: (node) => node.closest("[data-lenis-prevent]") !== null,
      });
      window.__lenis = lenis;

      lenis.on("scroll", ScrollTrigger.update);
      const tick = (time: number) => lenis.raf(time * 1000);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);

      if (document.documentElement.dataset.intro === "play") lenis.stop();
      const onIntroEnd = () => lenis.start();
      window.addEventListener("tl:intro-end", onIntroEnd);

      const refresh = () => ScrollTrigger.refresh();
      document.fonts?.ready.then(refresh);
      if (document.readyState === "complete") refresh();
      else window.addEventListener("load", refresh, { once: true });

      cleanup = () => {
        window.removeEventListener("tl:intro-end", onIntroEnd);
        window.removeEventListener("load", refresh);
        gsap.ticker.remove(tick);
        lenis.destroy();
        delete window.__lenis;
      };
    });

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, []);

  // A ogni cambio pagina: in cima e ricalcolo dei trigger dopo il render.
  useEffect(() => {
    if (!window.location.hash) window.__lenis?.scrollTo(0, { immediate: true, force: true });
    const id = requestAnimationFrame(() => {
      void loadGsap().then(({ ScrollTrigger }) => ScrollTrigger.refresh());
    });
    return () => cancelAnimationFrame(id);
  }, [pathname]);

  return null;
}
