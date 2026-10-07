"use client";

import { useRef, type ElementType, type ReactNode } from "react";
import { useLazyGSAP, MQ } from "@/lib/motion";

type Props = {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  /** "lines" per titoli lunghi, "words" per titoli brevi */
  by?: "lines" | "words";
  delay?: number;
  /** anima subito invece che allo scroll (titoli above the fold) */
  immediate?: boolean;
  id?: string;
};

/** true se l'intro della home sta coprendo la pagina: le animazioni dell'hero aspettano la sua fine. */
function waitingForIntro(): boolean {
  return document.documentElement.dataset.intro === "play";
}

/** Titolo diviso in righe/parole con SplitText. Il testo resta nel DOM, leggibile da screen reader. */
export function SplitReveal({ children, as: Tag = "h2", className, by = "lines", delay = 0, immediate = false, id }: Props) {
  const ref = useRef<HTMLElement>(null);

  // Titoli above the fold (H1): niente SplitText, si animano i figli esistenti. Il nodo di testo
  // resta quello renderizzato dal server, così l'LCP non viene ritardato da un nuovo paint.
  useLazyGSAP(
    ({ gsap }) => {
      if (!immediate) return;
      const mm = gsap.matchMedia();
      mm.add(MQ.motion, () => {
        const el = ref.current;
        if (!el) return;
        const targets = el.children.length ? Array.from(el.children) : [el];
        const tween = gsap.from(targets, {
          yPercent: 35,
          rotateX: -30,
          transformOrigin: "50% 100%",
          duration: 1.1,
          stagger: 0.12,
          delay,
          ease: "expo.out",
          paused: waitingForIntro(),
        });
        if (tween.paused()) window.addEventListener("tl:intro-end", () => tween.play(), { once: true });
      });
      return () => mm.revert();
    },
    ref,
    [],
    "now",
  );

  // Titoli sotto la piega: SplitText per righe/parole, preparato quando il browser è libero.
  useLazyGSAP(
    ({ gsap, SplitText }) => {
      if (immediate) return;
      const mm = gsap.matchMedia();
      mm.add(MQ.motion, () => {
        if (!ref.current) return;
        let played = false;
        const split = SplitText.create(ref.current, {
          type: by === "lines" ? "lines" : "words",
          autoSplit: true,
          aria: "auto",
          onSplit(self) {
            // Dopo un re-split (resize, font caricati) non rianimare.
            if (played) return;
            const targets = by === "lines" ? self.lines : self.words;
            return gsap.from(targets, {
              yPercent: 60,
              rotateX: -38,
              transformOrigin: "50% 100%",
              duration: 1.05,
              stagger: by === "lines" ? 0.11 : 0.06,
              delay,
              ease: "expo.out",
              onComplete: () => {
                played = true;
              },
              scrollTrigger: { trigger: ref.current, start: "top 90%", once: true },
            });
          },
        });
        return () => split.revert();
      });
      return () => mm.revert();
    },
    ref,
  );

  return (
    <Tag ref={ref} id={id} className={className} style={{ perspective: "600px" }}>
      {children}
    </Tag>
  );
}
