import { eur, round2 } from "./pricing";
import type { Money } from "./types";

/**
 * Tipi di cliente, zone di spedizione e regole IVA del checkout.
 * Spedizione: valori dimostrativi del brief (Italia 12 €, UE 25 €, mondo 45 €).
 * IVA:
 *  - azienda Italia, privato Italia: 22%
 *  - privato UE: 22% (IVA italiana; sopra la soglia OSS di 10.000 €/anno si applica l'aliquota
 *    del paese del cliente: da verificare con il commercialista)
 *  - azienda UE con P.IVA valida (VIES): 0%, inversione contabile (art. 41 DL 331/1993)
 *  - fuori UE: 0%, cessione all'esportazione non imponibile (art. 8 DPR 633/1972)
 */

export type CustomerType = "business_it" | "private_it" | "business_eu" | "private_eu" | "extra_eu";
export const CUSTOMER_TYPES: CustomerType[] = ["business_it", "private_it", "business_eu", "private_eu", "extra_eu"];

export type ShippingZone = "it" | "eu" | "world";

export const SHIPPING_RATES: Record<ShippingZone, number> = { it: 12, eu: 25, world: 45 };

export type VatRule = "it_standard" | "eu_private" | "eu_reverse_charge" | "export";

export function zoneFor(type: CustomerType): ShippingZone {
  if (type === "business_it" || type === "private_it") return "it";
  if (type === "business_eu" || type === "private_eu") return "eu";
  return "world";
}

export function isBusiness(type: CustomerType): boolean {
  return type === "business_it" || type === "business_eu";
}

export function vatRuleFor(type: CustomerType): { rule: VatRule; rate: number } {
  switch (type) {
    case "business_it":
    case "private_it":
      return { rule: "it_standard", rate: 0.22 };
    case "private_eu":
      return { rule: "eu_private", rate: 0.22 };
    case "business_eu":
      return { rule: "eu_reverse_charge", rate: 0 };
    case "extra_eu":
      return { rule: "export", rate: 0 };
  }
}

export type OrderTotals = {
  subtotal: Money;
  shipping: Money;
  taxable: Money;
  vatRate: number;
  vat: Money;
  total: Money;
  rule: VatRule;
  zone: ShippingZone;
};

export function computeTotals(subtotal: number, type: CustomerType): OrderTotals {
  const zone = zoneFor(type);
  const shipping = SHIPPING_RATES[zone];
  const { rule, rate } = vatRuleFor(type);
  const taxable = round2(subtotal + shipping);
  const vat = round2(taxable * rate);
  return {
    subtotal: eur(subtotal),
    shipping: eur(shipping),
    taxable: eur(taxable),
    vatRate: rate,
    vat: eur(vat),
    total: eur(taxable + vat),
    rule,
    zone,
  };
}

/** Paesi UE (codici ISO) per la scelta del paese nel checkout */
export const EU_COUNTRIES = [
  "AT", "BE", "BG", "CY", "CZ", "DE", "DK", "EE", "ES", "FI", "FR", "GR", "HR", "HU", "IE",
  "LT", "LU", "LV", "MT", "NL", "PL", "PT", "RO", "SE", "SI", "SK",
] as const;
