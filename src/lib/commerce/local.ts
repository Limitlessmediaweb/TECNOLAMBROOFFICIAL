import { SHOP_PRODUCTS, type ShopProductData } from "@/data/products";
import type { CommerceProvider } from "./provider";
import type { Cart, CartLine, Locale, Product } from "./types";
import { eur, priceLine, totals } from "./pricing";
import { submitOrderRequest } from "../order";

/**
 * Provider locale: catalogo da src/data/products.ts, carrello nel localStorage del browser.
 * Nel carrello si salvano solo variante e quantità: prezzi e nomi si ricalcolano sempre dal
 * catalogo, così un listino aggiornato vale anche per i carrelli già aperti.
 */

const STORAGE_KEY = "tl-cart-v1";

type StoredCart = { id: string; lines: { id: string; variantId: string; quantity: number }[] };

export function toProduct(p: ShopProductData, locale: Locale): Product {
  const price = eur(p.price);
  return {
    id: `local:${p.handle}`,
    handle: p.handle,
    code: p.code,
    title: p.title[locale],
    shortTitle: p.shortTitle[locale],
    description: p.description[locale],
    family: p.family,
    line: p.line,
    drawing: p.drawing,
    specs: { wr: p.wr, band: p.band, length: p.length, flanges: p.flanges, material: p.material[locale], vswr: p.vswr },
    variants: [
      {
        id: `local:${p.handle}:default`,
        sku: p.code,
        title: p.title[locale],
        price,
        availableForSale: true,
        availability: p.availability,
      },
    ],
    priceFrom: price,
    demo: true,
  };
}

function productForVariant(variantId: string): ShopProductData | undefined {
  const handle = variantId.split(":")[1];
  return SHOP_PRODUCTS.find((p) => p.handle === handle);
}

function read(): StoredCart | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredCart) : null;
  } catch {
    return null;
  }
}

function write(cart: StoredCart): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  } catch {
    /* storage pieno o bloccato: il carrello resta in memoria per la sessione */
  }
}

/** Ricostruisce il carrello completo (nomi, prezzi a scaglioni, totali) dal salvataggio minimo. */
export function hydrateCart(stored: StoredCart, locale: Locale): Cart {
  const lines: CartLine[] = stored.lines
    .map((l) => {
      const p = productForVariant(l.variantId);
      if (!p) return null;
      return priceLine({
        id: l.id,
        variantId: l.variantId,
        handle: p.handle,
        code: p.code,
        title: p.title[locale],
        wr: p.wr,
        quantity: l.quantity,
        listPrice: eur(p.price),
      });
    })
    .filter((l): l is CartLine => l !== null);
  return { id: stored.id, lines, ...totals(lines) };
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Lingua usata per i nomi nel carrello: quella dell'<html> corrente. */
function currentLocale(): Locale {
  return typeof document !== "undefined" && document.documentElement.lang === "en" ? "en" : "it";
}

function mutate(cartId: string, fn: (c: StoredCart) => void): Cart {
  const stored = read() ?? { id: cartId, lines: [] };
  fn(stored);
  stored.lines = stored.lines.filter((l) => l.quantity > 0);
  write(stored);
  return hydrateCart(stored, currentLocale());
}

export const localProvider: CommerceProvider = {
  name: "local",

  async listProducts(locale) {
    return SHOP_PRODUCTS.map((p) => toProduct(p, locale));
  },

  async getProduct(handle, locale) {
    const p = SHOP_PRODUCTS.find((x) => x.handle === handle);
    return p ? toProduct(p, locale) : null;
  },

  async createCart() {
    const existing = read();
    if (existing) return hydrateCart(existing, currentLocale());
    const cart: StoredCart = { id: newId("cart"), lines: [] };
    write(cart);
    return hydrateCart(cart, currentLocale());
  },

  async getCart(cartId) {
    const stored = read();
    return stored && stored.id === cartId ? hydrateCart(stored, currentLocale()) : null;
  },

  async addLine(cartId, variantId, quantity) {
    return mutate(cartId, (c) => {
      const line = c.lines.find((l) => l.variantId === variantId);
      if (line) line.quantity = Math.min(999, line.quantity + quantity);
      else c.lines.push({ id: newId("line"), variantId, quantity: Math.min(999, quantity) });
    });
  },

  async updateLine(cartId, lineId, quantity) {
    return mutate(cartId, (c) => {
      const line = c.lines.find((l) => l.id === lineId);
      if (line) line.quantity = Math.max(0, Math.min(999, Math.round(quantity)));
    });
  },

  async removeLine(cartId, lineId) {
    return mutate(cartId, (c) => {
      c.lines = c.lines.filter((l) => l.id !== lineId);
    });
  },

  async checkout(_cart, order) {
    if (!order) throw new Error("Richiesta d'ordine mancante");
    const result = await submitOrderRequest(order);
    if (!result.ok) throw new Error(result.error);
    // Ordine inviato: il carrello si svuota
    write({ id: newId("cart"), lines: [] });
    return { type: "order_request", orderNumber: result.orderNumber, demo: result.demo };
  },
};
