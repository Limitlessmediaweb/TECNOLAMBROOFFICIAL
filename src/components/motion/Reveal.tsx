"use client";

import { useRef, type ElementType, type ReactNode } from "react";
import { useLazyGSAP, MQ } from "@/lib/motion";
import { cn } from "@/lib/cn";

type Props = {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  /** spostamento iniziale in px */
  y?: number;
  delay?: number;
};

/**
 * Entrata allo scroll. Il contenuto è sempre leggibile: si anima solo il transform,
 * mai l'opacità (nessun testo sbiadito in attesa dello scroll). Senza JS o con reduced motion resta fermo.
 */
export function Reveal({ children, as: Tag = "div", className, y = 36, delay = 0 }: Props) {
  const ref = useRef<HTMLElement>(null);

  useLazyGSAP(
    ({ gsap }) => {
      const mm = gsap.matchMedia();
      mm.add(MQ.motion, () => {
        gsap.from(ref.current, {
          y,
          duration: 1.1,
          delay,
          ease: "power3.out",
          scrollTrigger: { trigger: ref.current, start: "top 92%", once: true },
        });
      });
      return () => mm.revert();
    },
    ref,
  );

  return (
    <Tag ref={ref} className={cn(className)}>
      {children}
    </Tag>
  );
}
