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
  { id: "quality-controls", where: "/qualita", what: "Elenco strumenti di laboratorio e parametri del collaudo al 100%" },
  { id: "photos", where: "home, /azienda, /prodotti/*", what: "Foto reali dall'officina di Miradolo Terme (produzione, magazzino, laboratorio, pezzi finiti)" },
  { id: "tables-check", where: "src/data/waveguides.ts, /prodotti/tabelle", what: "Verifica dei valori delle tre tabelle (trascritti a mano da un'immagine a bassa risoluzione)" },
  { id: "family-pending", where: "src/data/families.ts (pending, hidden: true)", what: "Quarta famiglia di prodotto: nome, testi, eventuale tabella" },
  { id: "flanges", where: "src/data/flanges.ts", what: "Elenco reale delle flange per misura nel configuratore" },
  { id: "options", where: "src/data/flanges.ts (EXTRA_OPTIONS)", what: "Opzioni del pezzo (es. rivestimento): quali, e testi" },
  { id: "stock", where: "src/data/families.ts (STOCK)", what: "Misure disponibili a magazzino con spedizione in 48 ore" },
  { id: "lead-time", where: "FAQ (tempi di consegna)", what: "Tempi tipici per pezzi standard e su disegno" },
  { id: "moq", where: "FAQ (quantità minime)", what: "Quantità minime d'ordine, se presenti" },
  { id: "shipping", where: "FAQ (spedizioni)", what: "Corriere, Incoterms, documenti doganali" },
  { id: "materials", where: "FAQ (materiali e finiture)", what: "Finiture disponibili oltre all'ottone OT 80" },
  { id: "history-dates", where: "/azienda, home (Storia)", what: "Eventuali date successive al 1987 (nuove sedi, nuovi impianti) se il titolare le vuole pubblicare" },
  { id: "privacy-review", where: "/privacy, /termini, /cookie", what: "Revisione legale delle bozze prima del lancio, nomi dei fornitori (Vercel, Resend)" },
  { id: "mail", where: "Vercel: RESEND_API_KEY / SMTP_*, QUOTE_TO_EMAIL, QUOTE_FROM_EMAIL", what: "Servizio email per le richieste di preventivo (vedi README)" },
  { id: "opening-hours", where: "/contatti, JSON-LD LocalBusiness", what: "Orari di apertura della sede operativa" },
] as const;
