import { track as vercelTrack } from "@vercel/analytics";

/**
 * Eventi del sito: Vercel Web Analytics (senza cookie) e, se configurato, anche Plausible.
 * Regola: mai dati personali nelle proprietà degli eventi.
 */
export type AnalyticsEvent =
  | "config_start"
  | "config_type"
  | "config_step"
  | "config_3d_view"
  | "config_download"
  | "config_share"
  | "request_add"
  | "request_view"
  | "quote_submit_success"
  | "quote_submit_error"
  | "quote_3d_upload"
  | "whatsapp_click"
  | "phone_click"
  | "email_click"
  | "datasheet_download"
  | "cert_download"
  | "band_finder_use"
  | "cta_quote_click"
  | "cta_shop_click"
  | "language_switch";

type Props = Record<string, string | number | boolean>;

declare global {
  interface Window {
    plausible?: ((event: string, options?: { props?: Props }) => void) & { q?: unknown[] };
  }
}

export function track(event: AnalyticsEvent, props?: Props): void {
  if (typeof window === "undefined") return;
  try {
    vercelTrack(event, props);
    window.plausible?.(event, props ? { props } : undefined);
  } catch {
    // Le statistiche non devono mai bloccare l'interfaccia.
  }
}

const UTM_KEY = "tl-first-visit";
export type FirstVisit = { utm?: Record<string, string>; referrer?: string; landing?: string; at?: string };

/** Salva UTM, referrer e pagina d'ingresso della prima visita (una sola volta). */
export function captureFirstVisit(): void {
  try {
    if (localStorage.getItem(UTM_KEY)) return;
    const p = new URLSearchParams(window.location.search);
    const utm: Record<string, string> = {};
    for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid"]) {
      const v = p.get(k);
      if (v) utm[k] = v.slice(0, 120);
    }
    const ref = document.referrer && !document.referrer.startsWith(window.location.origin) ? document.referrer.slice(0, 300) : undefined;
    const data: FirstVisit = { utm: Object.keys(utm).length ? utm : undefined, referrer: ref, landing: window.location.pathname, at: new Date().toISOString() };
    localStorage.setItem(UTM_KEY, JSON.stringify(data));
  } catch {
    // storage non disponibile
  }
}

export function firstVisit(): FirstVisit | null {
  try {
    const raw = localStorage.getItem(UTM_KEY);
    return raw ? (JSON.parse(raw) as FirstVisit) : null;
  } catch {
    return null;
  }
}

/** Provenienza della richiesta: pagina attuale + prima visita (UTM, referrer, pagina d'ingresso). */
export function requestMeta(): { page: string; landing?: string; referrer?: string; utm?: Record<string, string> } {
  const fv = firstVisit();
  return { page: typeof window !== "undefined" ? window.location.pathname + window.location.search : "", landing: fv?.landing, referrer: fv?.referrer, utm: fv?.utm };
}
