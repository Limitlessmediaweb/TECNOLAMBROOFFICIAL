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
  { id: "quality-controls", where: "/qualita", what: "Elenco strumenti di laboratorio e parametri del collaudo al 100%" },
  { id: "photos", where: "public/foto/prodotti/<famiglia>/, public/foto/officina/, public/foto/persone/", what: "Foto reali: prodotti, officina (lavorazione, collaudo, magazzino), Marco Pasquini" },
  { id: "owner-quote", where: "src/data/pending.ts (ownerQuote)", what: "Citazione del titolare, se la vuole" },
  { id: "cert-pdf", where: "public/certificazioni/ + npm run cert:preview", what: "PDF degli attestati ISO 9001 e ISO 14001" },
  { id: "tables-check", where: "src/data/waveguides.ts, /prodotti/tabelle", what: "Verifica dei valori delle tre tabelle (trascritti a mano da un'immagine a bassa risoluzione)" },
  { id: "family-pending", where: "src/data/families.ts (pending, hidden: true)", what: "Quarta famiglia di prodotto: nome, testi, eventuale tabella" },
  { id: "flanges", where: "src/data/flanges.ts", what: "Elenco reale delle flange per misura nel configuratore" },
  { id: "options", where: "src/data/flanges.ts (EXTRA_OPTIONS)", what: "Opzioni del pezzo (es. rivestimento): quali, e testi" },
  { id: "moq", where: "FAQ (quantità minime)", what: "Quantità minime d'ordine, se presenti" },
  { id: "shipping", where: "FAQ (spedizioni)", what: "Corriere, Incoterms, documenti doganali" },
  { id: "materials", where: "FAQ (materiali e finiture)", what: "Finiture disponibili oltre all'ottone OT 80" },
  { id: "history-dates", where: "/azienda, home (Storia)", what: "Eventuali date successive al 1987 (nuove sedi, nuovi impianti) se il titolare le vuole pubblicare" },
  { id: "privacy-review", where: "/privacy, /termini, /cookie", what: "Revisione legale delle bozze prima del lancio, nomi dei fornitori (Vercel, Resend)" },
  { id: "tlfx-missing", where: "src/data/waveguides.ts (DIM_TABLE)", what: "Codici TLFX di WR-34 (R260) e WR-159 (R58): oggi 'WR-34 flessibile twistabile'" },
  { id: "length-limits", where: "src/data/waveguides.ts (LENGTH_RANGE)", what: "Limiti di lunghezza per misura: oggi 1100–1300 mm per tutte e max 914 mm (3 ft) per WR-22" },
  { id: "rigid-geometry", where: "src/data/waveguides.ts (WALL), src/data/configurator/defaults.ts (visualBendRadius)", what: "Spessore di parete delle guide rigide e raggio standard delle curve: oggi valori indicativi per 3D e disegni" },
  { id: "ar-android", where: "components/configurator/Configurator.tsx", what: "AR solo su iPhone/iPad (Quick Look). Su Android servirebbe un GLB pubblico per Scene Viewer" },
] as const;
