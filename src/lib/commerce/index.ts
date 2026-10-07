import type { CommerceProvider } from "./provider";
import { localProvider } from "./local";
import { createShopifyProvider } from "./shopify";

/**
 * UNICO punto di scelta del backend commerce.
 * Con SHOPIFY_STORE_DOMAIN e SHOPIFY_STOREFRONT_TOKEN impostate si usa Shopify,
 * altrimenti i dati locali (src/data/products.ts) e il carrello nel browser.
 * Variabili solo lato server: il token non finisce mai nel bundle client.
 */
export type CommerceMode = "local" | "shopify";

export function commerceMode(): CommerceMode {
  return process.env.SHOPIFY_STORE_DOMAIN && process.env.SHOPIFY_STOREFRONT_TOKEN ? "shopify" : "local";
}

let shopify: CommerceProvider | null = null;

export function getCommerce(): CommerceProvider {
  if (commerceMode() === "local") return localProvider;
  shopify ??= createShopifyProvider({
    domain: process.env.SHOPIFY_STORE_DOMAIN!,
    token: process.env.SHOPIFY_STOREFRONT_TOKEN!,
  });
  return shopify;
}
