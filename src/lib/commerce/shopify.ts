/**
 * Provider Shopify (Storefront API). Attivo solo con SHOPIFY_STORE_DOMAIN e SHOPIFY_STOREFRONT_TOKEN
 * (scelta in lib/commerce/index.ts). Usa solo import di tipi e percorsi relativi, così si può
 * testare con Node (`npm run test:commerce`) passando un fetch finto.
 *
 * Mappatura dei dati (da configurare nello store Shopify):
 *  - Prodotto Shopify  → Product; `handle` uguale a quello di src/data/products.ts
 *  - metafield namespace "tecnolambro": code, family, line, drawing, wr, band_min, band_max,
 *    length, flanges, material, vswr, demo
 *  - Variante → Variant (prezzo IVA esclusa in EUR)
 *  - Lingua: @inContext(language: IT | EN) con l'app Translate & Adapt
 *
 * TODO(collegamento Shopify):
 *  1. creare lo store e l'app con accesso alla Storefront API, copiare dominio e token pubblico;
 *  2. creare i metafield "tecnolambro.*" sopra e importare i 12 prodotti (CSV dal catalogo locale);
 *  3. sconti per quantità: configurare "volume pricing" (Shopify B2B) o uno sconto automatico
 *     "Buy X get Y %" 5-9 pz −8% e 10+ pz −15%, così il checkout Shopify li applica;
 *  4. IVA e spedizioni: impostarle in Shopify (mercati IT, UE, mondo; inversione contabile per
 *     aziende UE con l'app di validazione P.IVA). Il riepilogo del checkout locale non serve più;
 *  5. verificare la versione API (API_VERSION) prima del lancio.
 */
import type { CommerceProvider } from "./provider";
import type { Availability, Cart, CartLine, DrawingKey, Locale, Product, ProductLine, ShopFamily } from "./types";

export const API_VERSION = "2025-07";

type Fetch = typeof fetch;
type ShopifyConfig = { domain: string; token: string; fetchImpl?: Fetch };

type Metafield = { key: string; value: string } | null;
type ShopifyMoney = { amount: string; currencyCode: string };
type ShopifyVariant = {
  id: string;
  sku: string | null;
  title: string;
  availableForSale: boolean;
  quantityAvailable: number | null;
  price: ShopifyMoney;
};
type ShopifyProduct = {
  id: string;
  handle: string;
  title: string;
  description: string;
  metafields: Metafield[];
  variants: { nodes: ShopifyVariant[] };
  priceRange: { minVariantPrice: ShopifyMoney };
};
type ShopifyCartLine = {
  id: string;
  quantity: number;
  merchandise: {
    id: string;
    sku: string | null;
    price: ShopifyMoney;
    product: { handle: string; title: string; wr: { value: string } | null };
  };
  cost: { amountPerQuantity: ShopifyMoney; totalAmount: ShopifyMoney };
};
type ShopifyCart = {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  cost: { subtotalAmount: ShopifyMoney };
  lines: { nodes: ShopifyCartLine[] };
};

const META_KEYS = ["code", "family", "line", "drawing", "wr", "band_min", "band_max", "length", "flanges", "material", "vswr", "demo"];

const PRODUCT_FIELDS = `
  id handle title description
  metafields(identifiers: [${META_KEYS.map((k) => `{namespace: "tecnolambro", key: "${k}"}`).join(", ")}]) { key value }
  variants(first: 20) { nodes { id sku title availableForSale quantityAvailable price { amount currencyCode } } }
  priceRange { minVariantPrice { amount currencyCode } }
`;

const CART_FIELDS = `
  id checkoutUrl totalQuantity
  cost { subtotalAmount { amount currencyCode } }
  lines(first: 100) { nodes {
    id quantity
    merchandise { ... on ProductVariant {
      id sku price { amount currencyCode }
      product { handle title wr: metafield(namespace: "tecnolambro", key: "wr") { value } }
    } }
    cost { amountPerQuantity { amount currencyCode } totalAmount { amount currencyCode } }
  } }
`;

function money(m: ShopifyMoney) {
  return { amount: Number(m.amount), currencyCode: "EUR" as const };
}

function availabilityOf(v: ShopifyVariant): Availability {
  if (!v.availableForSale) return "on_order";
  if (v.quantityAvailable !== null && v.quantityAvailable <= 3) return "low_stock";
  return "in_stock";
}

export function mapProduct(p: ShopifyProduct): Product {
  const meta = Object.fromEntries(p.metafields.filter((m): m is { key: string; value: string } => m !== null).map((m) => [m.key, m.value]));
  const bandMin = meta.band_min ? Number(meta.band_min) : null;
  const bandMax = meta.band_max ? Number(meta.band_max) : null;
  const wr = meta.wr ?? null;
  return {
    id: p.id,
    handle: p.handle,
    code: meta.code ?? p.variants.nodes[0]?.sku ?? p.handle,
    title: p.title,
    shortTitle: wr ? p.title.replace(new RegExp(`\\s*${wr},?\\s*`), " ").trim() : p.title,
    description: p.description,
    family: (meta.family as ShopFamily) ?? "rigid",
    line: (meta.line as ProductLine) ?? "pro",
    drawing: (meta.drawing as DrawingKey) ?? "rigid",
    specs: {
      wr,
      band: bandMin !== null && bandMax !== null ? { min: bandMin, max: bandMax } : null,
      length: meta.length ?? null,
      flanges: meta.flanges ?? null,
      material: meta.material ?? null,
      vswr: meta.vswr ? Number(meta.vswr) : null,
    },
    variants: p.variants.nodes.map((v) => ({
      id: v.id,
      sku: v.sku ?? "",
      title: v.title,
      price: money(v.price),
      availableForSale: v.availableForSale,
      availability: availabilityOf(v),
    })),
    priceFrom: money(p.priceRange.minVariantPrice),
    demo: meta.demo === "true",
  };
}

export function mapCart(c: ShopifyCart): Cart {
  const lines: CartLine[] = c.lines.nodes.map((l) => ({
    id: l.id,
    variantId: l.merchandise.id,
    handle: l.merchandise.product.handle,
    code: l.merchandise.sku ?? l.merchandise.product.handle,
    title: l.merchandise.product.title,
    wr: l.merchandise.product.wr?.value ?? null,
    quantity: l.quantity,
    listPrice: money(l.merchandise.price),
    unitPrice: money(l.cost.amountPerQuantity),
    lineTotal: money(l.cost.totalAmount),
  }));
  return { id: c.id, lines, totalQuantity: c.totalQuantity, subtotal: money(c.cost.subtotalAmount), checkoutUrl: c.checkoutUrl };
}

export function createShopifyProvider({ domain, token, fetchImpl = fetch }: ShopifyConfig): CommerceProvider {
  const endpoint = `https://${domain.replace(/^https?:\/\//, "")}/api/${API_VERSION}/graphql.json`;

  async function gql<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
    const res = await fetchImpl(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Shopify-Storefront-Access-Token": token },
      body: JSON.stringify({ query, variables }),
      // I dati di catalogo cambiano raramente: cache di 10 minuti lato server
      next: { revalidate: 600 },
    } as RequestInit);
    if (!res.ok) throw new Error(`Shopify ${res.status}`);
    const json = (await res.json()) as { data?: T; errors?: { message: string }[] };
    if (json.errors?.length) throw new Error(json.errors.map((e) => e.message).join("; "));
    if (!json.data) throw new Error("Shopify: risposta vuota");
    return json.data;
  }

  const lang = (locale: Locale) => (locale === "en" ? "EN" : "IT");

  async function cartMutation(field: string, query: string, variables: Record<string, unknown>): Promise<Cart> {
    const data = await gql<Record<string, { cart: ShopifyCart; userErrors: { message: string }[] }>>(query, variables);
    const result = data[field];
    if (result.userErrors?.length) throw new Error(result.userErrors.map((e) => e.message).join("; "));
    return mapCart(result.cart);
  }

  return {
    name: "shopify",

    async listProducts(locale) {
      const data = await gql<{ products: { nodes: ShopifyProduct[] } }>(
        `query Products($lang: LanguageCode!) @inContext(language: $lang) { products(first: 100) { nodes { ${PRODUCT_FIELDS} } } }`,
        { lang: lang(locale) },
      );
      return data.products.nodes.map(mapProduct);
    },

    async getProduct(handle, locale) {
      const data = await gql<{ product: ShopifyProduct | null }>(
        `query Product($handle: String!, $lang: LanguageCode!) @inContext(language: $lang) { product(handle: $handle) { ${PRODUCT_FIELDS} } }`,
        { handle, lang: lang(locale) },
      );
      return data.product ? mapProduct(data.product) : null;
    },

    async createCart() {
      return cartMutation("cartCreate", `mutation { cartCreate { cart { ${CART_FIELDS} } userErrors { message } } }`, {});
    },

    async getCart(cartId) {
      const data = await gql<{ cart: ShopifyCart | null }>(`query Cart($id: ID!) { cart(id: $id) { ${CART_FIELDS} } }`, { id: cartId });
      return data.cart ? mapCart(data.cart) : null;
    },

    async addLine(cartId, variantId, quantity) {
      return cartMutation(
        "cartLinesAdd",
        `mutation Add($cartId: ID!, $lines: [CartLineInput!]!) { cartLinesAdd(cartId: $cartId, lines: $lines) { cart { ${CART_FIELDS} } userErrors { message } } }`,
        { cartId, lines: [{ merchandiseId: variantId, quantity }] },
      );
    },

    async updateLine(cartId, lineId, quantity) {
      return cartMutation(
        "cartLinesUpdate",
        `mutation Update($cartId: ID!, $lines: [CartLineUpdateInput!]!) { cartLinesUpdate(cartId: $cartId, lines: $lines) { cart { ${CART_FIELDS} } userErrors { message } } }`,
        { cartId, lines: [{ id: lineId, quantity }] },
      );
    },

    async removeLine(cartId, lineId) {
      return cartMutation(
        "cartLinesRemove",
        `mutation Remove($cartId: ID!, $lineIds: [ID!]!) { cartLinesRemove(cartId: $cartId, lineIds: $lineIds) { cart { ${CART_FIELDS} } userErrors { message } } }`,
        { cartId, lineIds: [lineId] },
      );
    },

    async checkout(cart) {
      // Pagamento, IVA e spedizione li gestisce il checkout ospitato di Shopify.
      if (!cart.checkoutUrl) throw new Error("Shopify: checkoutUrl mancante");
      return { type: "redirect", url: cart.checkoutUrl };
    },
  };
}
