/**
 * Modello dati dello shop, indipendente dal backend (dati locali oggi, Shopify domani).
 * Le pagine e i componenti usano solo questi tipi.
 */

export type Locale = "it" | "en";

export type Money = { amount: number; currencyCode: "EUR" };

/** in_stock = pronto a magazzino · low_stock = pochi pezzi · on_order = su ordinazione */
export type Availability = "in_stock" | "low_stock" | "on_order";

/** Famiglie dei filtri dello shop */
export type ShopFamily = "rigid" | "flexible" | "bends" | "twist" | "transitions" | "flanges" | "ham";

/** Linea commerciale */
export type ProductLine = "pro" | "ham";

/** Disegno SVG usato per la scheda (vedi components/domain/PartDrawings.tsx) */
export type DrawingKey = "rigid" | "flexible" | "feeds" | "transitions" | "flanges" | "custom";

export type Variant = {
  id: string;
  sku: string;
  title: string;
  price: Money;
  availableForSale: boolean;
  availability: Availability;
};

export type TechSpecs = {
  /** misura WR, es. "WR-90" (null per pezzi coassiali puri) */
  wr: string | null;
  /** banda di lavoro in GHz */
  band: { min: number; max: number } | null;
  length: string | null;
  flanges: string | null;
  material: string | null;
  vswr: number | null;
};

export type Product = {
  id: string;
  handle: string;
  code: string;
  /** Nome completo, es. "Guida flessibile-twistabile WR-75, 600 mm" */
  title: string;
  /** Nome breve senza misura, per i titoli SEO: "[Nome] [WR] | Tecnolambro Shop" */
  shortTitle: string;
  description: string;
  family: ShopFamily;
  line: ProductLine;
  drawing: DrawingKey;
  specs: TechSpecs;
  variants: Variant[];
  /** prezzo di listino più basso tra le varianti (1-4 pezzi) */
  priceFrom: Money;
  /** true finché codici, prezzi e dati tecnici non arrivano da Tecnolambro */
  demo: boolean;
};

export type CartLine = {
  id: string;
  variantId: string;
  handle: string;
  code: string;
  title: string;
  wr: string | null;
  quantity: number;
  /** prezzo unitario di listino (1-4 pezzi) */
  listPrice: Money;
  /** prezzo unitario applicato, con lo sconto per quantità */
  unitPrice: Money;
  lineTotal: Money;
};

export type Cart = {
  id: string;
  lines: CartLine[];
  totalQuantity: number;
  subtotal: Money;
  /** solo con Shopify: URL del checkout ospitato */
  checkoutUrl?: string;
};

/** Esito del checkout: richiesta d'ordine (provider locale) o redirect al checkout Shopify. */
export type CheckoutResult =
  | { type: "order_request"; orderNumber: string; demo: boolean }
  | { type: "redirect"; url: string };
