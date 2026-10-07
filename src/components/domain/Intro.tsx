"use client";

import { useEffect, useRef } from "react";
import { loadGsap, MQ, type GsapKit } from "@/lib/motion";

type Timeline = ReturnType<GsapKit["gsap"]["timeline"]>;

const STORAGE_KEY = "tl-intro-seen";
/** true se l'intro è stata smontata prima della fine (Strict Mode in sviluppo): al rimontaggio riparte. */
let interrupted = false;

/** Linea mediana della guida: tratto dritto, curva in piano E, secondo tratto. */
const GUIDE_CENTER = "M60 330 H360 C 430 330 450 330 480 300 L520 260 C 550 230 570 230 640 230 H760";
const WALL_OFFSET = 22;
const WORD = "Tecnolambro";

type Pt = [number, number];

/**
 * Onda sinusoidale lungo la linea mediana della guida, calcolata in matematica pura
 * (niente getPointAtLength sul DOM): stesso risultato su server e client, zero costo a runtime.
 */
function buildWavePath(): string {
  const cubic = (p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt => {
    const u = 1 - t;
    return [
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ];
  };
  // Polilinea fitta della mediana: dritto, curva, raccordo, curva, dritto
  const pts: Pt[] = [[60, 330], [360, 330]];
  for (let i = 1; i <= 60; i++) pts.push(cubic([360, 330], [430, 330], [450, 330], [480, 300], i / 60));
  pts.push([520, 260]);
  for (let i = 1; i <= 60; i++) pts.push(cubic([520, 260], [550, 230], [570, 230], [640, 230], i / 60));
  pts.push([760, 230]);

  const amp = WALL_OFFSET - 7;
  let d = "";
  let walked = 0;
  let next = 0;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const len = Math.hypot(x1 - x0, y1 - y0);
    const nx = -(y1 - y0) / len;
    const ny = (x1 - x0) / len;
    while (next <= walked + len) {
      const f = (next - walked) / len;
      const a = Math.sin(next / 7.5) * amp;
      d += `${d ? "L" : "M"}${(x0 + (x1 - x0) * f + nx * a).toFixed(1)} ${(y0 + (y1 - y0) * f + ny * a).toFixed(1)}`;
      next += 2.5;
    }
    walked += len;
  }
  return d;
}

const WAVE_PATH = buildWavePath();

type Props = { tagline: string; skipLabel: string; label: string };

/**
 * Micro-storia iniziale (~4 s, una volta per sessione):
 * 1. la guida si disegna a linee  2. un'onda ottone la percorre
 * 3. all'uscita, dalla flangia finale, le onde si aprono a ventaglio
 * 4. il wordmark si allarga (asse wdth di Archivo)  5. tendina verso l'alto.
 * L'hero è già renderizzato sotto (LCP non bloccato). Lo script inline nel <head>
 * attiva l'overlay prima del primo paint; senza JS l'overlay non compare mai.
 * Con prefers-reduced-motion è una dissolvenza di 300 ms.
 */
export function Intro({ tagline, skipLabel, label }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const tlRef = useRef<Timeline | null>(null);
  const kitRef = useRef<GsapKit | null>(null);
  const finishRef = useRef<(() => void) | null>(null);

  const skip = () => {
    const tl = tlRef.current;
    const el = root.current;
    const kit = kitRef.current;
    if (!el) return;
    tl?.pause();
    if (!kit) {
      // GSAP non ancora caricato: chiusura immediata
      el.style.opacity = "0";
      finishRef.current?.();
      return;
    }
    kit.gsap.to(el, {
      opacity: 0,
      duration: 0.3,
      ease: "none",
      onComplete: () => {
        if (tl) tl.progress(1);
        else finishRef.current?.();
      },
    });
  };

  useEffect(() => {
    const el = root.current;
    const html = document.documentElement;
    if (!el) return;

    // Parte solo all'atterraggio sulla home: lo script inline nel <head> ha già controllato
    // sessionStorage e ?nointro e ha impostato data-intro="play" prima del primo paint.
    if (html.dataset.intro !== "play" && !interrupted) return;
    interrupted = false;
    html.dataset.intro = "play";

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.__lenis?.stop();

    let finished = false;
    const finish = (markSeen = true) => {
      if (finished) return;
      finished = true;
      if (markSeen) {
        try {
          sessionStorage.setItem(STORAGE_KEY, "1");
        } catch {
          /* ignora */
        }
      }
      window.clearTimeout(failsafe);
      document.body.style.overflow = prevOverflow;
      delete html.dataset.intro;
      window.dispatchEvent(new Event("tl:intro-end"));
      window.__lenis?.start();
    };
    finishRef.current = () => finish();

    let disposed = false;
    const reduce = window.matchMedia(MQ.reduce).matches;

    const build = ({ gsap }: GsapKit) => {
      const q = gsap.utils.selector(el);

      if (reduce) {
        // Composizione finale ferma, poi dissolvenza di 300 ms.
        gsap.set(q("[data-wall], [data-end-flange], [data-fan] path"), { drawSVG: "100%" });
        gsap.set(q("[data-word], [data-tagline], [data-flange], [data-fan]"), { opacity: 1 });
        const tl = gsap.timeline({ onComplete: () => finish() });
        tl.to(el, { opacity: 0, duration: 0.3, ease: "none", delay: 0.15 });
        tlRef.current = tl;
      } else {
        // Onda (tratto + scia) e lettere già presenti nel markup
        const wave = q<SVGPathElement>("[data-wave]");
        const word = q<HTMLElement>("[data-word]")[0];
        const chars = q<HTMLElement>("[data-char]");

        const tl = gsap.timeline({ defaults: { ease: "power2.inOut" }, onComplete: () => finish() });
        tl.set(q("[data-wall]"), { drawSVG: "0%" })
          .set(wave, { drawSVG: "0% 0%" })
          .set(q("[data-fan] path"), { drawSVG: "0%" })
          .set(chars, { fontVariationSettings: '"wdth" 62', opacity: 0, yPercent: 30 })
          .set(word, { opacity: 1 })
          .set(q("[data-tagline]"), { opacity: 0, y: 10 })
          // 1. profilo della guida
          .to(q("[data-wall]"), { drawSVG: "100%", duration: 0.95, stagger: 0.08 }, 0.1)
          .to(q("[data-flange]"), { opacity: 1, duration: 0.3, stagger: 0.1 }, 0.75)
          // 2. l'onda percorre la guida (pacchetto che scorre con scia)
          .to(wave, { drawSVG: "0% 22%", duration: 0.35, ease: "power1.in" }, 1.0)
          .to(wave, { drawSVG: "78% 100%", duration: 0.85, ease: "none" }, 1.35)
          .to(wave, { drawSVG: "100% 100%", duration: 0.25, ease: "power1.out" }, 2.2)
          // 3. flangia finale e ventaglio di onde
          .to(q("[data-end-flange]"), { drawSVG: "100%", duration: 0.35 }, 1.95)
          .set(q("[data-fan]"), { opacity: 1 }, 2.15)
          .to(q("[data-fan] path"), { drawSVG: "100%", duration: 0.55, stagger: 0.07, ease: "power2.out" }, 2.15)
          .to(q("[data-fan]"), { scale: 1.12, transformOrigin: "0% 50%", opacity: 0.35, duration: 0.9, ease: "power1.out" }, 2.3)
          // 4. wordmark: le lettere si allargano da strette a larghe
          .to(chars, { opacity: 1, yPercent: 0, duration: 0.45, stagger: 0.035, ease: "power3.out" }, 2.35)
          .to(chars, { fontVariationSettings: '"wdth" 125', duration: 0.9, stagger: 0.03, ease: "expo.out" }, 2.4)
          .to(q("[data-tagline]"), { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }, 2.95)
          // 5. tendina verso l'alto
          .to(el, { yPercent: -100, duration: 0.75, ease: "expo.inOut" }, 3.55);
        tlRef.current = tl;
      }
    };

    // Se GSAP non arriva (rete) o qualcosa si blocca, l'intro non deve mai trattenere la pagina.
    const failsafe = window.setTimeout(() => {
      el.style.opacity = "0";
      finish();
    }, 7000);
    loadGsap()
      .then((kit) => {
        if (disposed || finished) return;
        kitRef.current = kit;
        build(kit);
      })
      .catch(() => {
        el.style.opacity = "0";
        finish();
      });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") skip();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      disposed = true;
      window.clearTimeout(failsafe);
      window.removeEventListener("keydown", onKey);
      tlRef.current?.kill();
      tlRef.current = null;
      kitRef.current?.gsap.set(el, { clearProps: "opacity,transform" });
      // Smontato prima della fine (navigazione, Strict Mode): ripristina senza segnare come vista.
      if (!finished) interrupted = true;
      finish(false);
    };
  }, []);

  return (
    <div
      ref={root}
      className="intro-overlay fixed inset-0 z-[100] place-items-center bg-bg will-change-transform"
      data-label={label}
    >
      <div className="relative grid w-full max-w-[1100px] justify-items-center gap-6 px-4">
        <svg viewBox="0 0 820 420" className="h-auto w-full max-w-[820px] overflow-visible" aria-hidden="true">
          <path data-center d={GUIDE_CENTER} fill="none" stroke="none" />
          {/* pareti della guida: due linee parallele alla mediana */}
          <path
            data-wall
            d="M60 308 H360 C 420 308 436 308 464 282 L504 242 C 536 208 560 208 640 208 H760"
            className="draw-line"
            strokeDasharray="0 4000"
          />
          <path
            data-wall
            d="M60 352 H360 C 440 352 466 352 496 318 L536 278 C 560 252 580 252 640 252 H760"
            className="draw-line"
            strokeDasharray="0 4000"
          />
          {/* flange */}
          <rect data-flange x="46" y="290" width="14" height="80" className="draw-accent" opacity="0" />
          <rect data-flange x="360" y="296" width="10" height="68" className="draw-dim" opacity="0" />
          {/* flangia finale */}
          <path data-end-flange d="M760 190 V270 M772 190 V270 M760 190 H772 M760 270 H772" className="draw-accent" strokeDasharray="0 4000" />
          {/* onda nella guida */}
          {/* scia luminosa: tratto largo e trasparente (più leggero di un filtro blur a ogni frame) */}
          <path data-wave d={WAVE_PATH} fill="none" stroke="var(--c-accent)" strokeWidth="9" strokeLinecap="round" opacity="0.22" strokeDasharray="0 4000" />
          <path data-wave d={WAVE_PATH} fill="none" stroke="var(--c-accent)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="0 4000" />
          {/* fronti d'onda a ventaglio */}
          <g data-fan style={{ opacity: 0 }}>
            {[0, 1, 2, 3, 4].map((i) => {
              const r = 30 + i * 26;
              return (
                <path
                  key={i}
                  d={`M${786 + r * 0.25} ${230 - r} Q ${786 + r * 1.05} 230 ${786 + r * 0.25} ${230 + r}`}
                  fill="none"
                  stroke="var(--c-accent)"
                  strokeWidth={2 - i * 0.25}
                  opacity={1 - i * 0.16}
                  strokeDasharray="0 4000"
                  strokeLinecap="round"
                />
              );
            })}
          </g>
          <text x="60" y="400" className="draw-text">
            TE10 · WR-90
          </text>
        </svg>

        <div className="text-center" aria-hidden="true">
          <p
            data-word
            className="font-display text-[clamp(1.9rem,6.3vw,5.5rem)] font-extrabold uppercase leading-none tracking-[0.04em] text-fg"
            style={{ fontVariationSettings: '"wdth" 125', opacity: 0 }}
          >
            {WORD.split("").map((ch, i) => (
              <span key={i} data-char className="inline-block">
                {ch}
              </span>
            ))}
          </p>
          <p data-tagline className="annot mt-4 tracking-[0.32em] text-primary-ink" style={{ opacity: 0 }}>
            {tagline}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={skip}
        className="btn btn-ghost btn-sm absolute bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-4 sm:right-6"
      >
        {skipLabel}
      </button>
    </div>
  );
}
