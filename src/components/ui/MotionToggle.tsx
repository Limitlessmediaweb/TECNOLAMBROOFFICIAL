"use client";

import { useState } from "react";
import { Pause, Play } from "lucide-react";
import { useT } from "@/lib/client-i18n";
import { cn } from "@/lib/cn";

/**
 * Pausa/riprendi per le animazioni continue (WCAG 2.2.2): imposta data-paused sul
 * contenitore [data-motion-host] più vicino. Marquee (CSS) e TE10Field lo rispettano.
 */
export function MotionToggle({ className }: { className?: string }) {
  const t = useT("common");
  const [paused, setPaused] = useState(false);

  const toggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    const host = e.currentTarget.closest<HTMLElement>("[data-motion-host]");
    const next = !paused;
    setPaused(next);
    if (host) {
      if (next) host.dataset.paused = "";
      else delete host.dataset.paused;
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={paused}
      aria-label={paused ? t("playMotion") : t("pauseMotion")}
      title={paused ? t("playMotion") : t("pauseMotion")}
      className={cn(
        "grid size-11 shrink-0 place-items-center rounded-full border border-line-strong bg-bg/70 text-muted transition-colors hover:border-accent hover:text-fg motion-reduce:hidden",
        className,
      )}
    >
      {paused ? <Play aria-hidden="true" className="size-4" strokeWidth={1.75} /> : <Pause aria-hidden="true" className="size-4" strokeWidth={1.75} />}
    </button>
  );
}
