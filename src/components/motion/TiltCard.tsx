"use client";

import { useRef, type ReactNode } from "react";
import { useLazyGSAP, MQ } from "@/lib/motion";
import { cn } from "@/lib/cn";

type Props = { children: ReactNode; className?: string; max?: number };

/** Inclinazione 3D che segue il puntatore. Solo puntatore fine e senza reduced motion. */
export function TiltCard({ children, className, max = 6 }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useLazyGSAP(
    ({ gsap }) => {
      const mm = gsap.matchMedia();
      mm.add(`${MQ.motion} and ${MQ.fine}`, () => {
        const el = ref.current;
        if (!el) return;
        gsap.set(el, { transformPerspective: 900 });
        const rx = gsap.quickTo(el, "rotationX", { duration: 0.5, ease: "power3.out" });
        const ry = gsap.quickTo(el, "rotationY", { duration: 0.5, ease: "power3.out" });
        const glow = el.querySelector<HTMLElement>("[data-tilt-glow]");
        const onEnter = () => {
          el.style.willChange = "transform";
        };
        const onMove = (e: PointerEvent) => {
          const r = el.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width - 0.5;
          const py = (e.clientY - r.top) / r.height - 0.5;
          ry(px * max);
          rx(-py * max);
          if (glow) gsap.set(glow, { x: e.clientX - r.left, y: e.clientY - r.top, opacity: 1 });
        };
        const onLeave = () => {
          rx(0);
          ry(0);
          if (glow) gsap.to(glow, { opacity: 0, duration: 0.4 });
          el.style.willChange = "";
        };
        el.addEventListener("pointerenter", onEnter);
        el.addEventListener("pointermove", onMove);
        el.addEventListener("pointerleave", onLeave);
        return () => {
          el.removeEventListener("pointerenter", onEnter);
          el.removeEventListener("pointermove", onMove);
          el.removeEventListener("pointerleave", onLeave);
        };
      });
      return () => mm.revert();
    },
    ref,
  );

  return (
    <div ref={ref} className={cn("relative [transform-style:preserve-3d]", className)}>
      <span
        data-tilt-glow
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 -ml-40 -mt-40 size-80 rounded-full opacity-0 [background:radial-gradient(circle,color-mix(in_srgb,var(--c-accent)_16%,transparent),transparent_65%)]"
      />
      {children}
    </div>
  );
}
