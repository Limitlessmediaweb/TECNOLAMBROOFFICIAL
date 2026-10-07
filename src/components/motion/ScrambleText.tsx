"use client";

import { useRef } from "react";
import { useLazyGSAP, MQ } from "@/lib/motion";
import { cn } from "@/lib/cn";

type Props = {
  text: string;
  className?: string;
  /** caratteri usati durante lo scramble */
  chars?: string;
  duration?: number;
  /** "view" = all'entrata nel viewport, "hover" = anche al passaggio del mouse sull'elemento interattivo */
  trigger?: "view" | "hover";
};

/**
 * Testo che si "decodifica" (codici WR, frequenze). Il testo finale è sempre nel DOM
 * per screen reader e no-JS; la parte animata è aria-hidden.
 */
export function ScrambleText({ text, className, chars = "0123456789WR-.,", duration = 1.1, trigger = "view" }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const visual = useRef<HTMLSpanElement>(null);

  useLazyGSAP(
    ({ gsap }) => {
      const mm = gsap.matchMedia();
      mm.add(MQ.motion, () => {
        const el = visual.current;
        if (!el) return;
        const run = () => {
          gsap.to(el, { duration, scrambleText: { text, chars, speed: 0.6, revealDelay: 0.15 }, ease: "none", overwrite: true });
        };
        gsap.timeline({ scrollTrigger: { trigger: el, start: "top 92%", once: true, onEnter: run } });
        if (trigger === "hover") {
          const host = ref.current?.closest("a, button, [data-scramble-host]") ?? ref.current;
          host?.addEventListener("pointerenter", run);
          return () => host?.removeEventListener("pointerenter", run);
        }
      });
      return () => mm.revert();
    },
    ref,
    [text],
  );

  return (
    <span ref={ref} className={cn("relative inline-block", className)}>
      <span className="sr-only">{text}</span>
      <span ref={visual} aria-hidden="true">
        {text}
      </span>
    </span>
  );
}
