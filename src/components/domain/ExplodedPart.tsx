"use client";

import { useRef } from "react";
import { useLazyGSAP, MQ } from "@/lib/motion";
import { PartDrawing, type PartLabels } from "./PartDrawings";
import type { FamilyKey } from "@/data/products";

type Props = {
  family: FamilyKey;
  labels: PartLabels;
  locale: string;
  title: string;
  caption: string;
};

/**
 * Disegno esploso: allo scroll le parti (flangia, corpo, guarnizione…) si separano
 * lungo l'asse e compaiono le quote. Desktop: sezione fissata con scrub.
 * Mobile: scrub senza pin. Reduced motion: disegno già esploso, fermo.
 */
export function ExplodedPart({ family, labels, locale, title, caption }: Props) {
  const root = useRef<HTMLElement>(null);

  useLazyGSAP(
    ({ gsap }) => {
      const el = root.current;
      if (!el) return;
      const parts = gsap.utils.toArray<SVGGElement>("[data-part]", el);
      const dims = gsap.utils.toArray<SVGGElement>("[data-dim]", el);
      const dimLines = el.querySelectorAll("[data-dim] line, [data-dim] path");
      const partLabels = gsap.utils.toArray<SVGGElement>("[data-label]", el);
      const offset = (p: SVGGElement, axis: "dx" | "dy") => Number(p.dataset[axis] ?? 0);

      const build = (scrollTrigger: ScrollTrigger.Vars) => {
        const tl = gsap.timeline({ defaults: { ease: "power2.inOut" }, scrollTrigger });
        tl.fromTo(partLabels, { opacity: 0 }, { opacity: 1, duration: 0.25, stagger: 0.03 }, 0.05);
        tl.to(parts, { x: (_i, p) => offset(p, "dx"), y: (_i, p) => offset(p, "dy"), duration: 1 }, 0.1);
        tl.fromTo(dimLines, { drawSVG: "0%" }, { drawSVG: "100%", duration: 0.6, stagger: 0.01 }, 0.7);
        tl.fromTo(dims, { opacity: 0 }, { opacity: 1, duration: 0.4 }, 0.75);
        return tl;
      };

      const mm = gsap.matchMedia();
      mm.add(`${MQ.motion} and ${MQ.desktop}`, () => {
        build({ trigger: el, start: "top top", end: "+=110%", pin: true, scrub: 0.6, invalidateOnRefresh: true });
      });
      mm.add(`${MQ.motion} and ${MQ.mobile}`, () => {
        build({ trigger: el, start: "top 80%", end: "center 45%", scrub: 0.6 });
      });
      mm.add(MQ.reduce, () => {
        gsap.set(parts, { x: (_i, p) => offset(p, "dx"), y: (_i, p) => offset(p, "dy") });
      });
      return () => mm.revert();
    },
    root,
  );

  return (
    <figure ref={root} className="relative grid min-h-[60svh] content-center overflow-x-clip lg:min-h-[100dvh]">
      <div className="container-site">
        <div className="relative mx-auto max-w-5xl border border-line bg-surface/70 p-3 sm:p-6">
          <span aria-hidden="true" className="annot absolute left-3 top-2 text-muted sm:left-6 sm:top-4">
            FIG. 1
          </span>
          <PartDrawing family={family} labels={labels} locale={locale} title={title} className="h-auto w-full overflow-visible" />
        </div>
        <figcaption className="annot mx-auto mt-3 max-w-5xl text-muted">{caption}</figcaption>
      </div>
    </figure>
  );
}
