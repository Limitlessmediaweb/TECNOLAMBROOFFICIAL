/**
 * Domande frequenti. I testi stanno in messages/{it,en}.json → faq.items.<id>.
 * `todo: true` = la risposta contiene un [DA COMPLETARE] da far confermare al titolare (in produzione la domanda si nasconde se resta solo il segnaposto).
 */
export type FaqItem = { id: string; todo: boolean; preview?: boolean };

export const FAQ: readonly FaqItem[] = [
  { id: "sizes", todo: false, preview: true },
  { id: "custom", todo: false, preview: true },
  { id: "files", todo: false },
  { id: "leadTime", todo: false, preview: true },
  { id: "moq", todo: false },
  { id: "shippingEu", todo: false },
  { id: "shippingWorld", todo: false },
  { id: "invoicing", todo: false, preview: true },
  { id: "materials", todo: false },
  { id: "testing", todo: false },
  { id: "flexTwist", todo: false },
  { id: "shopVsQuote", todo: false },
  { id: "drawing3d", todo: false },
  { id: "clientDrawing", todo: false },
  { id: "hours", todo: false },
] as const;

/** Domande brevi in fondo a /shop */
export const SHOP_FAQ = ["shopVsQuote", "drawing3d", "files", "leadTime"] as const;

export const FAQ_PREVIEW = FAQ.filter((f) => f.preview);
