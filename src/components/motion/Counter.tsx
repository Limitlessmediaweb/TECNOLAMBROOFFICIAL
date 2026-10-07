"use client";

import { useRef } from "react";
import { useLazyGSAP, MQ } from "@/lib/motion";

type Props = {
  value: number;
  /** valore di partenza dell'animazione */
  from?: number;
  className?: string;
  duration?: number;
};

/** Contatore per numeri veri (1986, anni di attività). SSR e no-JS mostrano già il valore finale. */
export function Counter({ value, from = 0, className, duration = 1.6 }: Props) {
  const ref = useRef<HTMLSpanElement>(null);

  useLazyGSAP(
    ({ gsap }) => {
      const mm = gsap.matchMedia();
      mm.add(MQ.motion, () => {
        const el = ref.current;
        if (!el) return;
        const state = { v: from };
        gsap.to(state, {
          v: value,
          duration,
          ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 90%", once: true },
          onUpdate: () => {
            el.textContent = String(Math.round(state.v));
          },
        });
        return () => {
          el.textContent = String(value);
        };
      });
      return () => mm.revert();
    },
    ref,
  );

  return (
    <span ref={ref} className={className}>
      {value}
    </span>
  );
}
