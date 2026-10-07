/**
 * Analytics senza cookie (Plausible). Lo script viene caricato solo se
 * NEXT_PUBLIC_PLAUSIBLE_DOMAIN è impostata (vedi components/ui/Analytics.tsx).
 * Regola: mai dati personali nelle proprietà degli eventi.
 */
export type AnalyticsEvent =
  | "cta_quote_click"
  | "cta_shop_click"
  | "quote_submit"
  | "band_finder_use"
  | "language_switch"
  | "view_product"
  | "add_to_cart"
  | "begin_checkout"
  | "order_request_submit";

type Props = Record<string, string | number | boolean>;

declare global {
  interface Window {
    plausible?: ((event: string, options?: { props?: Props }) => void) & { q?: unknown[] };
  }
}

export function track(event: AnalyticsEvent, props?: Props): void {
  if (typeof window === "undefined") return;
  try {
    window.plausible?.(event, props ? { props } : undefined);
  } catch {
    // Le statistiche non devono mai bloccare l'interfaccia.
  }
}
