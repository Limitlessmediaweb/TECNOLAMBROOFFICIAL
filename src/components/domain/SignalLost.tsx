"use client";

import { useRef } from "react";
import { useLazyGSAP, MQ } from "@/lib/motion";

/** 404: l'onda percorre la guida e si interrompe dove la guida è spezzata. */
export function SignalLost() {
  const ref = useRef<SVGSVGElement>(null);

  useLazyGSAP(
    ({ gsap }) => {
      const mm = gsap.matchMedia();
      mm.add(MQ.motion, () => {
        const q = gsap.utils.selector(ref);
        const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.6 });
        tl.fromTo(q("[data-wave]"), { drawSVG: "0% 0%" }, { drawSVG: "0% 100%", duration: 1.4, ease: "power1.in" })
          .to(q("[data-spark]"), { opacity: 1, scale: 1.4, duration: 0.12, transformOrigin: "50% 50%" })
          .to(q("[data-spark]"), { opacity: 0, scale: 0.6, duration: 0.5 })
          .to(q("[data-flat]"), { opacity: 1, duration: 0.3 }, "<")
          .to(q("[data-wave]"), { opacity: 0, duration: 0.6 }, "+=0.6")
          .set(q("[data-wave]"), { opacity: 1, drawSVG: "0% 0%" })
          .set(q("[data-flat]"), { opacity: 0.35 });
      });
      return () => mm.revert();
    },
    ref,
    [],
    "now",
  );

  // onda sinusoidale fino alla rottura (x = 330)
  let d = "M40 120";
  for (let x = 40; x <= 330; x += 3) d += ` L${x} ${(120 + Math.sin((x - 40) / 11) * 16).toFixed(1)}`;

  return (
    <svg ref={ref} viewBox="0 0 640 240" className="h-auto w-full max-w-3xl overflow-visible" aria-hidden="true">
      {/* guida, primo tratto */}
      <path d="M20 88 H330 M20 152 H330" className="draw-line" />
      <rect x="10" y="74" width="12" height="92" className="draw-accent" />
      {/* rottura: spigoli frastagliati */}
      <path d="M330 88 L342 98 L334 110 L346 124 L336 140 L344 152" className="draw-dim" />
      <path d="M380 88 L370 100 L382 114 L368 128 L380 142 L372 152" className="draw-dim" />
      {/* guida, secondo tratto */}
      <path d="M380 88 H620 M380 152 H620" className="draw-line" opacity="0.5" />
      <path d="M40 120 H620" className="draw-center" />
      <path data-flat d="M384 120 H610" stroke="var(--c-muted)" strokeWidth="1.5" opacity="0.35" fill="none" />
      <path data-wave d={d} fill="none" stroke="var(--c-accent)" strokeWidth="2.5" strokeLinecap="round" />
      <circle data-spark cx="340" cy="120" r="10" fill="var(--c-accent)" opacity="0" />
      <text x="480" y="190" textAnchor="middle" className="draw-text">
        |E| = 0
      </text>
    </svg>
  );
}
