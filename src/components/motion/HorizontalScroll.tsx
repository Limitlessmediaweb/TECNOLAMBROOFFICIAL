"use client";

import { useRef, type ReactNode } from "react";
import { useLazyGSAP, MQ } from "@/lib/motion";
import { cn } from "@/lib/cn";

type Props = {
  children: ReactNode;
  /** contenuto fisso sopra la traccia (titolo della sezione) */
  heading?: ReactNode;
  className?: string;
  trackClassName?: string;
  label?: string;
};

/**
 * Scroll verticale che diventa orizzontale (desktop, motion attivo).
 * Su mobile e con reduced motion è una fila scorrevole nativa con scroll-snap,
 * navigabile da tastiera e da touch.
 */
export function HorizontalScroll({ children, heading, className, trackClassName, label }: Props) {
  const wrap = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);

  useLazyGSAP(
    ({ gsap }) => {
      const mm = gsap.matchMedia();
      mm.add(`${MQ.motion} and ${MQ.desktop}`, () => {
        const t = track.current;
        const w = wrap.current;
        if (!t || !w) return;
        const distance = () => Math.max(0, t.scrollWidth - t.clientWidth);
        t.style.overflowX = "visible";
        gsap.to(t, {
          x: () => -distance(),
          ease: "none",
          scrollTrigger: {
            trigger: w,
            start: "top top",
            end: () => `+=${distance()}`,
            pin: true,
            scrub: 0.8,
            invalidateOnRefresh: true,
          },
        });
        return () => {
          t.style.overflowX = "";
        };
      });
      return () => mm.revert();
    },
    wrap,
  );

  return (
    <section ref={wrap} className={cn("relative overflow-hidden", className)} aria-label={label}>
      <div className="flex min-h-[100dvh] flex-col justify-center gap-10 py-20 lg:py-16">
        {heading ? <div className="container-site">{heading}</div> : null}
        <div
          ref={track}
          data-lenis-prevent
          tabIndex={0}
          className={cn(
            "relative flex snap-x snap-mandatory scroll-px-4 gap-5 overflow-x-auto px-4 pb-4 sm:scroll-px-6 lg:scroll-px-10 [scrollbar-width:thin] sm:px-6 lg:gap-8 lg:px-10 lg:pb-0",
            trackClassName,
          )}
        >
          {children}
        </div>
      </div>
    </section>
  );
}
