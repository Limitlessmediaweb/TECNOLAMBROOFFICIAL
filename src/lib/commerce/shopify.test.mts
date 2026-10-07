/**
 * Test del provider Shopify con dati finti (nessun negozio reale).
 * Uso: npm run test:commerce  (Node 22.6+ esegue TypeScript direttamente; .mts = modulo ES)
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createShopifyProvider, mapProduct } from "./shopify.ts";

const FAKE_PRODUCT = {
  id: "gid://shopify/Product/1",
  handle: "flex-twist-wr90-600",
  title: "Guida flessibile-twistabile WR-90, 600 mm",
  description: "Tratto flessibile e twistabile in banda X.",
  metafields: [
    { key: "code", value: "TL-FT90-600" },
    { key: "family", value: "flexible" },
    { key: "line", value: "pro" },
    { key: "drawing", value: "flexible" },
    { key: "wr", value: "WR-90" },
    { key: "band_min", value: "8.2" },
    { key: "band_max", value: "12.4" },
    { key: "length", value: "600 mm" },
    { key: "flanges", value: "UBR100 / PBR100" },
    { key: "material", value: "Ottone" },
    { key: "vswr", value: "1.1" },
    null,
  ],
  variants: {
    nodes: [{ id: "gid://shopify/ProductVariant/11", sku: "TL-FT90-600", title: "Default", availableForSale: true, quantityAvailable: 2, price: { amount: "340.0", currencyCode: "EUR" } }],
  },
  priceRange: { minVariantPrice: { amount: "340.0", currencyCode: "EUR" } },
};

const FAKE_CART = {
  id: "gid://shopify/Cart/abc",
  checkoutUrl: "https://tecnolambro-demo.myshopify.com/cart/c/abc",
  totalQuantity: 5,
  cost: { subtotalAmount: { amount: "1564.0", currencyCode: "EUR" } },
  lines: {
    nodes: [
      {
        id: "gid://shopify/CartLine/1",
        quantity: 5,
        merchandise: { id: "gid://shopify/ProductVariant/11", sku: "TL-FT90-600", price: { amount: "340.0", currencyCode: "EUR" }, product: { handle: "flex-twist-wr90-600", title: "Guida flessibile-twistabile WR-90, 600 mm", wr: { value: "WR-90" } } },
        cost: { amountPerQuantity: { amount: "312.8", currencyCode: "EUR" }, totalAmount: { amount: "1564.0", currencyCode: "EUR" } },
      },
    ],
  },
};

type Call = { url: string; headers: Record<string, string>; query: string; variables: Record<string, unknown> };

function fakeFetch(calls: Call[]) {
  return (async (url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body)) as { query: string; variables: Record<string, unknown> };
    calls.push({ url, headers: init.headers as Record<string, string>, query: body.query, variables: body.variables });
    let data: unknown;
    if (body.query.includes("products(")) data = { products: { nodes: [FAKE_PRODUCT] } };
    else if (body.query.includes("product(")) data = { product: body.variables.handle === FAKE_PRODUCT.handle ? FAKE_PRODUCT : null };
    else if (body.query.includes("cartCreate")) data = { cartCreate: { cart: { ...FAKE_CART, totalQuantity: 0, lines: { nodes: [] } }, userErrors: [] } };
    else if (body.query.includes("cartLinesAdd")) data = { cartLinesAdd: { cart: FAKE_CART, userErrors: [] } };
    else if (body.query.includes("cartLinesUpdate")) data = { cartLinesUpdate: { cart: FAKE_CART, userErrors: [{ message: "quantità non valida" }] } };
    else if (body.query.includes("cart(id")) data = { cart: FAKE_CART };
    return new Response(JSON.stringify({ data }), { status: 200, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;
}

test("mapProduct converte metafield e varianti nel modello comune", () => {
  const p = mapProduct(FAKE_PRODUCT);
  assert.equal(p.code, "TL-FT90-600");
  assert.equal(p.family, "flexible");
  assert.deepEqual(p.specs.band, { min: 8.2, max: 12.4 });
  assert.equal(p.specs.vswr, 1.1);
  assert.equal(p.priceFrom.amount, 340);
  assert.equal(p.variants[0].availability, "low_stock"); // 2 pezzi disponibili
  assert.equal(p.shortTitle, "Guida flessibile-twistabile 600 mm");
});

test("listProducts e getProduct interrogano la Storefront API con token e lingua", async () => {
  const calls: Call[] = [];
  const shop = createShopifyProvider({ domain: "tecnolambro-demo.myshopify.com", token: "fake-token", fetchImpl: fakeFetch(calls) });
  const list = await shop.listProducts("en");
  assert.equal(list.length, 1);
  assert.match(calls[0].url, /^https:\/\/tecnolambro-demo\.myshopify\.com\/api\/\d{4}-\d{2}\/graphql\.json$/);
  assert.equal(calls[0].headers["X-Shopify-Storefront-Access-Token"], "fake-token");
  assert.equal(calls[0].variables.lang, "EN");
  assert.equal(await shop.getProduct("non-esiste", "it"), null);
});

test("carrello: crea, aggiunge righe e porta al checkoutUrl di Shopify", async () => {
  const calls: Call[] = [];
  const shop = createShopifyProvider({ domain: "https://tecnolambro-demo.myshopify.com", token: "fake-token", fetchImpl: fakeFetch(calls) });
  const empty = await shop.createCart();
  assert.equal(empty.totalQuantity, 0);
  const cart = await shop.addLine(empty.id, "gid://shopify/ProductVariant/11", 5);
  assert.equal(cart.totalQuantity, 5);
  assert.equal(cart.lines[0].unitPrice.amount, 312.8);
  assert.equal(cart.subtotal.amount, 1564);
  assert.deepEqual(calls.at(-1)?.variables.lines, [{ merchandiseId: "gid://shopify/ProductVariant/11", quantity: 5 }]);
  const result = await shop.checkout(cart);
  assert.deepEqual(result, { type: "redirect", url: FAKE_CART.checkoutUrl });
  const again = await shop.getCart(cart.id);
  assert.equal(again?.id, FAKE_CART.id);
});

test("gli errori utente della Storefront API diventano eccezioni", async () => {
  const shop = createShopifyProvider({ domain: "tecnolambro-demo.myshopify.com", token: "fake-token", fetchImpl: fakeFetch([]) });
  await assert.rejects(() => shop.updateLine("cart", "line", -1), /quantità non valida/);
});
