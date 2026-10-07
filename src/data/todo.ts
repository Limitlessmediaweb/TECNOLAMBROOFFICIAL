/**
 * Elenco unico dei contenuti mancanti. Ogni voce corrisponde a un segnaposto
 * [DA COMPLETARE] visibile nel sito (evidenziato in giallo in sviluppo/demo).
 * Quando il titolare fornisce il dato: aggiornare i testi in messages/*.json e togliere la voce.
 */
export type TodoItem = {
  id: string;
  /** Dove compare */
  where: string;
  /** Cosa serve */
  what: string;
};

export const TODO: readonly TodoItem[] = [
  { id: "certifications", where: "/qualita, home (Qualità)", what: "ISO 9001 e altre certificazioni: ente, numero, scadenza, PDF del certificato" },
  { id: "quality-controls", where: "/qualita", what: "Elenco strumenti di laboratorio e controlli eseguiti (es. analizzatore di reti, VSWR, controllo dimensionale)" },
  { id: "photos", where: "home, /azienda, /prodotti/*", what: "Foto reali dall'officina di Miradolo Terme (produzione, magazzino, laboratorio, pezzi finiti)" },
  { id: "spec-data", where: "/prodotti/* (tabelle)", what: "Dati tecnici reali: misure disponibili, flange, VSWR, lunghezze. Ora sono dati dimostrativi" },
  { id: "lead-time", where: "FAQ (tempi di consegna)", what: "Tempi tipici per pezzi standard e su disegno" },
  { id: "moq", where: "FAQ (quantità minime)", what: "Quantità minime d'ordine, se presenti" },
  { id: "shipping-eu", where: "FAQ (spedizioni UE)", what: "Corrieri, tempi e costi indicativi in UE" },
  { id: "shipping-world", where: "FAQ (spedizioni extra UE)", what: "Paesi serviti, Incoterms, documenti doganali, eventuali restrizioni export" },
  { id: "materials", where: "FAQ (materiali e finiture)", what: "Materiali usati (leghe, ottone, rame…) e finiture disponibili" },
  { id: "ham-radio", where: "/radioamatori", what: "Prodotti per 10 GHz e QO-100 confermati dal titolare, con link allo shop" },
  { id: "history-dates", where: "/azienda, home (Storia)", what: "Eventuali date successive al 1986 (nuove sedi, nuovi impianti) se il titolare le vuole pubblicare" },
  { id: "privacy-review", where: "/privacy, /termini, /cookie", what: "Revisione legale delle bozze prima del lancio" },
  { id: "form-endpoint", where: "src/lib/quote.ts", what: "Servizio di invio del form (Formspree, Resend o email) e casella di destinazione" },
  { id: "shop-data", where: "/shop, src/data/products.ts", what: "Codici, prezzi, materiali, lunghezze, VSWR e disponibilità reali dei pezzi standard (ora dimostrativi)" },
  { id: "shop-shipping", where: "Checkout (lib/commerce/tax.ts)", what: "Tariffe di spedizione reali per Italia, UE e resto del mondo (ora 12/25/45 € dimostrativi)" },
  { id: "order-endpoint", where: "src/lib/order.ts", what: "Canale di invio delle richieste d'ordine (email ufficio ordini o Hub interno)" },
  { id: "shopify", where: ".env (SHOPIFY_STORE_DOMAIN, SHOPIFY_STOREFRONT_TOKEN)", what: "Store Shopify con metafield tecnolambro.* se si vuole il pagamento online" },
  { id: "opening-hours", where: "/contatti, JSON-LD LocalBusiness", what: "Orari di apertura della sede operativa" },
] as const;
