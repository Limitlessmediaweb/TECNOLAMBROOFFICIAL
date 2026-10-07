import type { Cart, CartLine, Money } from "./types";

/**
 * Prezzi per quantità (valori del brief):
 *   1-4 pezzi listino · 5-9 pezzi −8% · 10+ pezzi −15%
 * Con Shopify gli sconti vanno replicati con "volume pricing" (Shopify B2B) o con uno
 * sconto automatico per quantità: vedi lib/commerce/shopify.ts.
 */
export const PRICE_TIERS = [
  { min: 1, max: 4, discount: 0 },
  { min: 5, max: 9, discount: 0.08 },
  { min: 10, max: Infinity, discount: 0.15 },
] as const;

export function tierFor(quantity: number) {
  return PRICE_TIERS.find((t) => quantity >= t.min && quantity <= t.max) ?? PRICE_TIERS[0];
}

/** Arrotonda al centesimo */
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function eur(amount: number): Money {
  return { amount: round2(amount), currencyCode: "EUR" };
}

export function unitPrice(list: Money, quantity: number): Money {
  return eur(list.amount * (1 - tierFor(quantity).discount));
}

export function priceLine(line: Omit<CartLine, "unitPrice" | "lineTotal">): CartLine {
  const unit = unitPrice(line.listPrice, line.quantity);
  return { ...line, unitPrice: unit, lineTotal: eur(unit.amount * line.quantity) };
}

export function totals(lines: CartLine[]): Pick<Cart, "totalQuantity" | "subtotal"> {
  return {
    totalQuantity: lines.reduce((n, l) => n + l.quantity, 0),
    subtotal: eur(lines.reduce((s, l) => s + l.lineTotal.amount, 0)),
  };
}

export function formatMoney(money: Money, locale: string): string {
  return new Intl.NumberFormat(locale === "it" ? "it-IT" : "en-IE", { style: "currency", currency: money.currencyCode }).format(money.amount);
}
