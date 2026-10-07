"use client";

import { useRef, type ReactNode } from "react";
import { useLazyGSAP, MQ } from "@/lib/motion";
import { cn } from "@/lib/cn";

type Step = { title: string; body: string };
type Props = { heading: ReactNode; steps: Step[]; className?: string };

/**
 * Sezione "Come lavoriamo": su desktop resta fissata mentre un'onda percorre la guida
 * e accende una fase alla volta. Su mobile e con reduced motion è un elenco normale.
 * Tutti i testi restano a piena opacità (contrasto AA): la fase attiva si distingue per il colore del titolo e il pallino pieno.
 */
export function PinnedSteps({ heading, steps, className }: Props) {
  const root = useRef<HTMLElement>(null);

  useLazyGSAP(
    ({ gsap, ScrollTrigger }) => {
      const el = root.current;
      if (!el) return;
      const items = gsap.utils.toArray<HTMLElement>("[data-step]", el);
      const setActive = (i: number) => {
        el.dataset.active = String(i);
        items.forEach((item, idx) => item.toggleAttribute("data-current", idx === i));
      };
      setActive(0);

      const mm = gsap.matchMedia();
      mm.add(`${MQ.motion} and ${MQ.desktop}`, () => {
        const fill = el.querySelector<HTMLElement>("[data-fill]");
        const wave = el.querySelector<SVGElement>("[data-wave]");
        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: el,
            start: "top top",
            end: () => `+=${window.innerHeight * (steps.length * 0.65)}`,
            pin: true,
            scrub: 0.6,
            invalidateOnRefresh: true,
            onUpdate: (self) => setActive(Math.min(steps.length - 1, Math.floor(self.progress * steps.length * 0.999))),
          },
        });
        tl.fromTo(fill, { scaleY: 0 }, { scaleY: 1 }, 0);
        if (wave) tl.fromTo(wave, { yPercent: -100 }, { yPercent: 0 }, 0);
        return () => setActive(0);
      });

      // Mobile: ogni fase si accende quando arriva a metà schermo.
      mm.add(`${MQ.motion} and ${MQ.mobile}`, () => {
        const triggers = items.map((item, i) =>
          ScrollTrigger.create({ trigger: item, start: "top 60%", end: "bottom 40%", onToggle: (s) => s.isActive && setActive(i) }),
        );
        return () => triggers.forEach((t) => t.kill());
      });
      return () => mm.revert();
    },
    root,
  );

  return (
    <section ref={root} className={cn("relative overflow-hidden", className)} data-active="0">
      <div className="container-site grid min-h-[100dvh] content-center gap-10 py-20 lg:grid-cols-12 lg:gap-8 lg:py-24">
        <div className="lg:col-span-5">{heading}</div>

        <div className="relative grid grid-cols-[2.5rem_1fr] gap-x-5 lg:col-span-6 lg:col-start-7 lg:grid-cols-[3rem_1fr]">
          {/* Guida d'onda verticale: il riempimento ottone avanza con lo scroll */}
          <div aria-hidden="true" className="relative row-span-full">
            <div className="absolute inset-y-2 left-1/2 w-5 -translate-x-1/2 border-x border-line-strong bg-surface/60" />
            <div
              data-fill
              className="absolute inset-y-2 left-1/2 w-5 origin-top -translate-x-1/2 scale-y-100 bg-[color-mix(in_srgb,var(--c-accent)_28%,transparent)] motion-safe:lg:scale-y-0"
            />
            <div className="absolute inset-y-2 left-1/2 w-5 -translate-x-1/2 overflow-hidden">
              <svg data-wave viewBox="0 0 20 400" preserveAspectRatio="none" className="h-full w-full">
                <path
                  d="M10 0 C 18 12.5, 18 12.5, 10 25 S 2 37.5, 10 50 S 18 62.5, 10 75 S 2 87.5, 10 100 S 18 112.5, 10 125 S 2 137.5, 10 150 S 18 162.5, 10 175 S 2 187.5, 10 200 S 18 212.5, 10 225 S 2 237.5, 10 250 S 18 262.5, 10 275 S 2 287.5, 10 300 S 18 312.5, 10 325 S 2 337.5, 10 350 S 18 362.5, 10 375 S 2 387.5, 10 400"
                  className="draw-accent"
                />
              </svg>
            </div>
          </div>

          <ol className="col-start-2 grid gap-10 lg:gap-14">
            {steps.map((step, i) => (
              <li
                key={step.title}
                data-step
                className="group relative"
              >
                <span
                  aria-hidden="true"
                  className="absolute -left-[calc(2.5rem/2+1.25rem+5px)] top-2 size-2.5 rounded-full border border-accent bg-bg transition-colors group-data-[current]:bg-accent lg:-left-[calc(3rem/2+1.25rem+5px)]"
                />
                <p className="annot text-primary-ink">{String(i + 1).padStart(2, "0")}</p>
                <h3 className="mt-1 text-display-s font-bold transition-colors duration-500 lg:text-muted lg:group-data-[current]:text-fg">{step.title}</h3>
                <p className="mt-2 max-w-[46ch] text-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
