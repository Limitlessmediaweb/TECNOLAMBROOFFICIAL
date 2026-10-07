"use client";

import { useRef } from "react";
import { useLazyGSAP, MQ } from "@/lib/motion";

/**
 * Mirino ottone che segue il puntatore e si allarga sugli elementi interattivi.
 * Solo puntatore fine. Il cursore di sistema resta visibile: è un'aggiunta, non un sostituto.
 */
export function CursorFollower() {
  const ref = useRef<HTMLDivElement>(null);

  useLazyGSAP(({ gsap }) => {
    const mm = gsap.matchMedia();
    mm.add(`${MQ.motion} and ${MQ.fine}`, () => {
      const el = ref.current;
      if (!el) return;
      gsap.set(el, { xPercent: -50, yPercent: -50, opacity: 0 });
      const x = gsap.quickTo(el, "x", { duration: 0.35, ease: "power3.out" });
      const y = gsap.quickTo(el, "y", { duration: 0.35, ease: "power3.out" });
      let visible = false;
      let active = false;

      const onMove = (e: PointerEvent) => {
        if (e.pointerType !== "mouse") return;
        x(e.clientX);
        y(e.clientY);
        if (!visible) {
          visible = true;
          gsap.to(el, { opacity: 1, duration: 0.3 });
        }
        const interactive = (e.target as Element | null)?.closest("a, button, [role='button'], input, select, textarea, label") != null;
        if (interactive !== active) {
          active = interactive;
          gsap.to(el, { scale: interactive ? 1.9 : 1, duration: 0.35, ease: "power3.out" });
        }
      };
      const onLeave = () => {
        visible = false;
        gsap.to(el, { opacity: 0, duration: 0.3 });
      };
      window.addEventListener("pointermove", onMove, { passive: true });
      document.documentElement.addEventListener("pointerleave", onLeave);
      return () => {
        window.removeEventListener("pointermove", onMove);
        document.documentElement.removeEventListener("pointerleave", onLeave);
      };
    });
    return () => mm.revert();
  }, ref);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-[80] hidden size-7 rounded-full border border-accent/80 opacity-0 mix-blend-normal [@media(pointer:fine)]:block"
    >
      <span className="absolute left-1/2 top-1/2 size-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent" />
    </div>
  );
}
