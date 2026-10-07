/**
 * GSAP e plugin, caricati con import() dinamico da lib/motion.ts dopo l'idratazione:
 * così ~70 KB gzip non stanno nel percorso critico del primo caricamento (LCP/TBT).
 * GSAP 3.15: SplitText, ScrambleText, DrawSVG, MorphSVG e Flip sono gratuiti.
 * Usati qui: ScrollTrigger, SplitText, ScrambleText, DrawSVG (MorphSVG e Flip non servono).
 */
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";

gsap.registerPlugin(ScrollTrigger, SplitText, ScrambleTextPlugin, DrawSVGPlugin);
gsap.defaults({ ease: "power3.out", duration: 0.9 });

let refreshTimer: number | undefined;
/** Un solo ScrollTrigger.refresh() dopo l'ultima animazione creata in differita (debounce 150 ms). */
export function queueRefresh() {
  window.clearTimeout(refreshTimer);
  refreshTimer = window.setTimeout(() => ScrollTrigger.refresh(), 150);
}

export { gsap, ScrollTrigger, SplitText };
