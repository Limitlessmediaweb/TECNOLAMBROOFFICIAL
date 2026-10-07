"use client";

import { useRef, type ReactNode } from "react";
import { useLazyGSAP, MQ } from "@/lib/motion";

type Props = { children: ReactNode; className?: string; /** % di spostamento verticale complessivo */ speed?: number };

/** Livello che scorre a velocità diversa dalla pagina (solo transform, scrub). */
export function ParallaxLayer({ children, className, speed = 12 }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useLazyGSAP(
    ({ gsap }) => {
      const mm = gsap.matchMedia();
      mm.add(MQ.motion, () => {
        gsap.fromTo(
          ref.current,
          { yPercent: -speed / 2 },
          {
            yPercent: speed / 2,
            ease: "none",
            scrollTrigger: { trigger: ref.current, start: "top bottom", end: "bottom top", scrub: true },
          },
        );
      });
      return () => mm.revert();
    },
    ref,
  );

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
