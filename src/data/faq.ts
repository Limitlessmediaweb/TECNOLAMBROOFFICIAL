/**
 * Domande frequenti. I testi stanno in messages/{it,en}.json → faq.items.<id>.
 * `todo: true` = la risposta contiene un [DA COMPLETARE] da far confermare al titolare.
 */
export type FaqItem = { id: string; todo: boolean; preview?: boolean };

export const FAQ: readonly FaqItem[] = [
  { id: "sizes", todo: false, preview: true },
  { id: "custom", todo: false, preview: true },
  { id: "files", todo: false },
  { id: "leadTime", todo: true, preview: true },
  { id: "moq", todo: true },
  { id: "shippingEu", todo: true },
  { id: "shippingWorld", todo: true },
  { id: "invoicing", todo: false, preview: true },
  { id: "materials", todo: true },
  { id: "testing", todo: true },
  { id: "flexTwist", todo: false },
  { id: "shopVsQuote", todo: false },
] as const;

export const FAQ_PREVIEW = FAQ.filter((f) => f.preview);
