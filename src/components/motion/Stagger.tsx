"use client";

import { useRef, type ElementType, type ReactNode } from "react";
import { useLazyGSAP, MQ } from "@/lib/motion";

type Props = {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  /** selettore dei figli da animare in sequenza */
  selector?: string;
  stagger?: number;
};

/** Figli che entrano in sequenza. Stesse regole di Reveal: solo transform, testo sempre a piena opacità. */
export function Stagger({ children, as: Tag = "div", className, selector = ":scope > *", stagger = 0.08 }: Props) {
  const ref = useRef<HTMLElement>(null);

  useLazyGSAP(
    ({ gsap }) => {
      const mm = gsap.matchMedia();
      mm.add(MQ.motion, () => {
        const items = ref.current?.querySelectorAll<HTMLElement>(selector);
        if (!items?.length) return;
        gsap.from(items, {
          y: 40,
          duration: 1,
          stagger,
          ease: "power3.out",
          scrollTrigger: { trigger: ref.current, start: "top 88%", once: true },
        });
      });
      return () => mm.revert();
    },
    ref,
  );

  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}
