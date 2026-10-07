"use client";

import { useRef, type ReactNode } from "react";
import { useLazyGSAP, MQ } from "@/lib/motion";

/** Sottolineatura a forma d'onda che si disegna (DrawSVG) quando la parola entra in vista. */
export function DrawUnderline({ children, delay = 0.2 }: { children: ReactNode; delay?: number }) {
  const ref = useRef<HTMLSpanElement>(null);

  useLazyGSAP(
    ({ gsap }) => {
      const mm = gsap.matchMedia();
      mm.add(MQ.motion, () => {
        const path = ref.current?.querySelector("path");
        if (!path) return;
        gsap.fromTo(
          path,
          { drawSVG: "0%" },
          {
            drawSVG: "100%",
            duration: 1.2,
            delay,
            ease: "power2.inOut",
            scrollTrigger: { trigger: ref.current, start: "top 90%", once: true },
          },
        );
      });
      return () => mm.revert();
    },
    ref,
  );

  return (
    <span ref={ref} className="relative inline-block whitespace-nowrap">
      {children}
      <svg
        aria-hidden="true"
        viewBox="0 0 200 12"
        preserveAspectRatio="none"
        className="pointer-events-none absolute -bottom-[0.12em] left-0 h-[0.22em] w-full overflow-visible"
      >
        <path
          d="M0 6 Q 12.5 0 25 6 T 50 6 T 75 6 T 100 6 T 125 6 T 150 6 T 175 6 T 200 6"
          fill="none"
          stroke="var(--c-accent)"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
