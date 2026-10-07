"use server";

import { getCommerce } from "@/lib/commerce";
import type { Cart } from "@/lib/commerce/types";

/**
 * Operazioni sul carrello eseguite sul server: servono solo con il provider Shopify,
 * perché il token della Storefront API non deve arrivare al browser.
 * Con il provider locale il carrello vive nel localStorage e queste azioni non vengono chiamate.
 */

function quantity(n: number): number {
  return Math.max(0, Math.min(999, Math.round(Number(n) || 0)));
}

export async function createCartAction(): Promise<Cart> {
  return getCommerce().createCart();
}

export async function getCartAction(cartId: string): Promise<Cart | null> {
  return getCommerce().getCart(cartId);
}

export async function addLineAction(cartId: string, variantId: string, qty: number): Promise<Cart> {
  return getCommerce().addLine(cartId, variantId, Math.max(1, quantity(qty)));
}

export async function updateLineAction(cartId: string, lineId: string, qty: number): Promise<Cart> {
  return getCommerce().updateLine(cartId, lineId, quantity(qty));
}

export async function removeLineAction(cartId: string, lineId: string): Promise<Cart> {
  return getCommerce().removeLine(cartId, lineId);
}
