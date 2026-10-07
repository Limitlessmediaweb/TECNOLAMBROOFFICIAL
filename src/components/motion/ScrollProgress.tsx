"use client";

import { useRef } from "react";
import { usePathname } from "next/navigation";
import { useLazyGSAP, MQ } from "@/lib/motion";

/** Barra di avanzamento della lettura in cima alla pagina (scaleX, scrub). */
export function ScrollProgress() {
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useLazyGSAP(
    ({ gsap }) => {
      const mm = gsap.matchMedia();
      mm.add(MQ.motion, () => {
        gsap.fromTo(
          ref.current,
          { scaleX: 0 },
          {
            scaleX: 1,
            ease: "none",
            scrollTrigger: { trigger: document.body, start: "top top", end: "bottom bottom", scrub: 0.3 },
          },
        );
      });
      return () => mm.revert();
    },
    ref,
    [pathname],
  );

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[70] h-0.5 origin-left scale-x-0 bg-accent motion-reduce:hidden"
    />
  );
}
