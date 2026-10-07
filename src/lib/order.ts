import type { Cart } from "./commerce/types";
import type { CustomerType, OrderTotals } from "./commerce/tax";

/**
 * Richiesta d'ordine dallo shop (provider locale: nessun incasso online).
 *
 * TODO(lancio): collegare l'invio a uno di questi canali:
 *  1. email all'ufficio ordini (Route Handler src/app/api/order/route.ts + Resend), con copia al cliente;
 *  2. Hub interno Tecnolambro/LIMITLESS: POST JSON a un endpoint autenticato (token lato server,
 *     mai NEXT_PUBLIC_), che crea la pratica e invia la conferma entro 2 ore.
 * Finché non è collegato, la funzione genera il numero di richiesta e simula l'invio.
 */

export type OrderCustomer = {
  type: CustomerType;
  company?: string;
  name: string;
  email: string;
  phone?: string;
  vat?: string;
  sdi?: string;
  pec?: string;
  address: string;
  city: string;
  postalCode: string;
  province?: string;
  country: string;
  notes?: string;
};

export type OrderRequest = {
  customer: OrderCustomer;
  cart: Cart;
  totals: OrderTotals;
  locale: string;
};

export type OrderResult = { ok: true; orderNumber: string; demo: boolean } | { ok: false; error: string };

/** Numero leggibile: TL-AAMMGG-XXXX */
export function makeOrderNumber(now = new Date()): string {
  const d = now.toISOString().slice(2, 10).replace(/-/g, "");
  const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `TL-${d}-${rnd}`;
}

export async function submitOrderRequest(order: OrderRequest): Promise<OrderResult> {
  const orderNumber = makeOrderNumber();
  // TODO(lancio): sostituire la simulazione con la chiamata reale, per esempio:
  // const res = await fetch("/api/order", { method: "POST", headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify({ ...order, orderNumber }) });
  // if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
  void order;
  await new Promise((resolve) => setTimeout(resolve, 700));
  return { ok: true, orderNumber, demo: true };
}
