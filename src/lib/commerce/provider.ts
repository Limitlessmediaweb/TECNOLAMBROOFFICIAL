import type { Cart, CheckoutResult, Locale, Product } from "./types";
import type { OrderRequest } from "../order";

/**
 * Contratto di un backend commerce. Le pagine dipendono solo da questa interfaccia:
 * passare dai dati locali a Shopify non richiede di rifare catalogo, scheda o carrello.
 */
export interface CommerceProvider {
  readonly name: "local" | "shopify";
  listProducts(locale: Locale): Promise<Product[]>;
  getProduct(handle: string, locale: Locale): Promise<Product | null>;
  createCart(): Promise<Cart>;
  /** Recupera un carrello esistente (null se scaduto o inesistente) */
  getCart(cartId: string): Promise<Cart | null>;
  addLine(cartId: string, variantId: string, quantity: number): Promise<Cart>;
  updateLine(cartId: string, lineId: string, quantity: number): Promise<Cart>;
  removeLine(cartId: string, lineId: string): Promise<Cart>;
  /**
   * Locale: invia una richiesta d'ordine (nessun incasso) e restituisce il numero.
   * Shopify: restituisce il checkoutUrl del carrello per il redirect al checkout ospitato.
   */
  checkout(cart: Cart, order?: OrderRequest): Promise<CheckoutResult>;
}
