import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { MotionToggle } from "@/components/ui/MotionToggle";

type Props = {
  children: ReactNode;
  label: string;
  className?: string;
  /** durata di un giro completo in secondi */
  duration?: number;
};

/**
 * Nastro scorrevole infinito in CSS puro (nessun JS, nessun costo di main thread).
 * La seconda copia è aria-hidden. Si ferma al passaggio del mouse e con reduced motion
 * diventa una riga scorrevole a mano.
 */
export function Marquee({ children, label, className, duration = 48 }: Props) {
  return (
    <div
      role="region"
      aria-label={label}
      // focalizzabile: con reduced motion diventa una fascia scorrevole a mano (anche da tastiera)
      tabIndex={0}
      data-motion-host
      className={cn("group relative overflow-hidden motion-reduce:overflow-x-auto", className)}
      style={{ ["--marquee-duration" as string]: `${duration}s` }}
    >
      <div className="flex w-max motion-safe:animate-[marquee_var(--marquee-duration)_linear_infinite] motion-safe:group-hover:[animation-play-state:paused] group-data-[paused]:[animation-play-state:paused]">
        <div className="flex shrink-0 items-center">{children}</div>
        <div className="flex shrink-0 items-center motion-reduce:hidden" aria-hidden="true">
          {children}
        </div>
      </div>
      <MotionToggle className="absolute right-3 top-1/2 -translate-y-1/2" />
    </div>
  );
}
