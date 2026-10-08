"use client";

import { useEffect } from "react";
import { track, type AnalyticsEvent } from "@/lib/analytics";

/**
 * Un solo ascoltatore delegato per gli eventi analytics dei link:
 * <a data-track="cta_quote_click" data-source="hero">. I link restano componenti server
 * (nessuna idratazione per ogni CTA). I link tel:, mailto: e WhatsApp sono tracciati da soli
 * (phone_click, email_click, whatsapp_click), senza dati personali.
 */
export function ClickTracker() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as Element | null;
      const el = target?.closest<HTMLElement>("[data-track]");
      if (el) {
        const props: Record<string, string> = {};
        if (el.dataset.source) props.source = el.dataset.source;
        track(el.dataset.track as AnalyticsEvent, props);
        return;
      }
      const a = target?.closest<HTMLAnchorElement>("a[href]");
      if (!a || a.dataset.tracked !== undefined) return;
      const href = a.getAttribute("href") ?? "";
      const source = a.closest<HTMLElement>("[data-area]")?.dataset.area ?? window.location.pathname;
      if (href.startsWith("tel:")) track("phone_click", { source, line: href.includes("375") ? "mobile" : "landline" });
      else if (href.startsWith("mailto:")) track("email_click", { source });
      else if (href.startsWith("https://wa.me/")) track("whatsapp_click", { source });
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);
  return null;
}
