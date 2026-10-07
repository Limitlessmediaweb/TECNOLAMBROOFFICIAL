"use client";

import { useEffect } from "react";
import { track, type AnalyticsEvent } from "@/lib/analytics";

/**
 * Un solo ascoltatore delegato per gli eventi analytics dei link:
 * <a data-track="cta_quote_click" data-source="hero">. I link restano componenti server
 * (nessuna idratazione per ogni CTA).
 */
export function ClickTracker() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest<HTMLElement>("[data-track]");
      if (!el) return;
      const event = el.dataset.track as AnalyticsEvent;
      const props: Record<string, string> = {};
      if (el.dataset.source) props.source = el.dataset.source;
      track(event, props);
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);
  return null;
}
