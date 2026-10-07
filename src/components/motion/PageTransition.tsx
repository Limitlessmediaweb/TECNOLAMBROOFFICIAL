"use client";

import { useEffect, useRef, ViewTransition, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { loadGsap, MQ } from "@/lib/motion";

/**
 * Transizione tra pagine. Dove il browser supporta la View Transitions API la gestisce
 * React con <ViewTransition> (animazioni in globals.css, ::view-transition-*(page)).
 * Negli altri browser fallback GSAP: leggera entrata del nuovo contenuto.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if ("startViewTransition" in document) return;
    if (window.matchMedia(MQ.reduce).matches) return;
    let cancelled = false;
    void loadGsap().then(({ gsap }) => {
      if (cancelled || !ref.current) return;
      gsap.fromTo(ref.current, { opacity: 0.4, y: 14 }, { opacity: 1, y: 0, duration: 0.45, ease: "power3.out", clearProps: "transform,opacity" });
    });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return (
    <ViewTransition name="page">
      <div ref={ref}>{children}</div>
    </ViewTransition>
  );
}
