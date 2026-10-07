"use client";

import { useRef, type ReactNode } from "react";
import { useLazyGSAP, MQ } from "@/lib/motion";

type Props = { children: ReactNode; strength?: number; className?: string };

/** Attrazione magnetica verso il cursore. Solo desktop con puntatore fine. */
export function MagneticButton({ children, strength = 0.28, className }: Props) {
  const ref = useRef<HTMLSpanElement>(null);

  useLazyGSAP(
    ({ gsap }) => {
      const mm = gsap.matchMedia();
      mm.add(`${MQ.motion} and ${MQ.fine} and ${MQ.desktop}`, () => {
        const el = ref.current;
        if (!el) return;
        const x = gsap.quickTo(el, "x", { duration: 0.6, ease: "elastic.out(1, 0.45)" });
        const y = gsap.quickTo(el, "y", { duration: 0.6, ease: "elastic.out(1, 0.45)" });
        const onMove = (e: PointerEvent) => {
          const r = el.getBoundingClientRect();
          x((e.clientX - (r.left + r.width / 2)) * strength);
          y((e.clientY - (r.top + r.height / 2)) * strength);
        };
        const onLeave = () => {
          x(0);
          y(0);
        };
        el.addEventListener("pointermove", onMove);
        el.addEventListener("pointerleave", onLeave);
        return () => {
          el.removeEventListener("pointermove", onMove);
          el.removeEventListener("pointerleave", onLeave);
        };
      });
      return () => mm.revert();
    },
    ref,
  );

  return (
    <span ref={ref} className={className ?? "inline-block"}>
      {children}
    </span>
  );
}
