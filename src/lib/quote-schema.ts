import { intlLocale, isLocale, type Locale } from "@/i18n/locales";
/**
 * Formato della richiesta di preventivo, condiviso da client e route handler (/api/quote).
 * La validazione vera è quella del server: il client la ripete solo per dare errori subito.
 */

export const ACCEPTED_EXTENSIONS = [".step", ".stp", ".iges", ".igs", ".stl", ".pdf", ".dwg", ".dxf"] as const;
/** Limite per file (richiesta del titolare) */
export const MAX_FILE_BYTES = 20 * 1024 * 1024;
/**
 * Limite del corpo della richiesta su Vercel: 4,5 MB per le funzioni. Sopra questa soglia
 * i file si caricano su Vercel Blob (se configurato) e nella mail arriva il link.
 */
export const MAX_DIRECT_BYTES = 4 * 1024 * 1024;
/** Modelli GLB dei pezzi configurati: oltre questo totale arrivano come link e non come allegati. */
export const MAX_MODEL_ATTACH_BYTES = 5 * 1024 * 1024;
export const MAX_ITEMS = 50;
/** Tempo minimo di compilazione (anti-spam): sotto, la richiesta viene scartata in silenzio. */
export const MIN_FILL_MS = 3000;

export type QuoteItemKind = "configured" | "ready" | "custom" | "contact";

export type QuoteItem = {
  kind: QuoteItemKind;
  code: string;
  qty: number;
  notes: string;
  /** riga di dettaglio leggibile (tipo, misura, banda, geometria, flange, finitura, trattamento) */
  detail?: string;
  /** configurazione del pezzo (per richiesta.json e il gestionale), solo valori semplici */
  spec?: Record<string, string | number | null>;
  /** nomi dei file caricati per questo pezzo (pezzo su disegno) */
  files?: string[];
};

export type QuoteCustomer = {
  company: string;
  name: string;
  email: string;
  phone?: string;
  country: string;
  /** codice ISO del paese, se scelto dall'elenco */
  countryCode?: string;
  vat?: string;
};

export type QuoteMeta = {
  /** pagina da cui parte la richiesta */
  page?: string;
  /** prima visita: pagina d'ingresso, referrer, UTM */
  landing?: string;
  referrer?: string;
  utm?: Record<string, string>;
};

export type BlobKind = "file" | "model" | "drawing";
export type BlobRef = { name: string; url: string; size: number; kind?: BlobKind };

export type QuotePayload = {
  /** request = "La tua richiesta" · contact = modulo breve (home, contatti, su misura) */
  source: "request" | "contact";
  locale: Locale;
  items: QuoteItem[];
  customer: QuoteCustomer;
  privacy: boolean;
  /** messaggio libero del modulo breve */
  message?: string;
  meta?: QuoteMeta;
  blobs?: BlobRef[];
  /** millisecondi tra apertura del modulo e invio (anti-spam) */
  elapsedMs?: number;
  /** trappola anti-spam: deve restare vuota */
  website?: string;
};

export type QuoteResponse =
  | { ok: true; number: string }
  | { ok: false; error: "invalid" | "tooLarge" | "notConfigured" | "rateLimited" | "server"; fields?: string[] };

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isAcceptedFile(name: string): boolean {
  const n = name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => n.endsWith(ext));
}

export function isModelFile(name: string): boolean {
  return name.toLowerCase().endsWith(".glb");
}

export function formatBytes(bytes: number, locale: string): string {
  const mb = bytes / (1024 * 1024);
  const fmt = new Intl.NumberFormat(intlLocale(locale), { maximumFractionDigits: 1 });
  return mb >= 1 ? `${fmt.format(mb)} MB` : `${fmt.format(Math.max(1, bytes / 1024))} KB`;
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

function cleanSpec(v: unknown): QuoteItem["spec"] {
  if (!v || typeof v !== "object") return undefined;
  const out: Record<string, string | number | null> = {};
  for (const [k, x] of Object.entries(v as Record<string, unknown>).slice(0, 30)) {
    if (!/^[a-z0-9]{1,20}$/i.test(k)) continue;
    if (typeof x === "number" && Number.isFinite(x)) out[k] = x;
    else if (typeof x === "string") out[k] = x.slice(0, 60);
    else if (x === null) out[k] = null;
  }
  return Object.keys(out).length ? out : undefined;
}

function cleanMeta(v: unknown): QuoteMeta | undefined {
  if (!v || typeof v !== "object") return undefined;
  const m = v as Record<string, unknown>;
  const utmRaw = (m.utm && typeof m.utm === "object" ? m.utm : {}) as Record<string, unknown>;
  const utm: Record<string, string> = {};
  for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid"]) {
    const s = str(utmRaw[k], 120);
    if (s) utm[k] = s;
  }
  const meta: QuoteMeta = { page: str(m.page, 300) || undefined, landing: str(m.landing, 300) || undefined, referrer: str(m.referrer, 300) || undefined, utm: Object.keys(utm).length ? utm : undefined };
  return Object.values(meta).some(Boolean) ? meta : undefined;
}

/** Valida e normalizza il payload. Restituisce i nomi dei campi non validi. */
export function validatePayload(raw: unknown): { payload: QuotePayload | null; fields: string[] } {
  const fields: string[] = [];
  if (!raw || typeof raw !== "object") return { payload: null, fields: ["payload"] };
  const r = raw as Record<string, unknown>;
  const source: QuotePayload["source"] = r.source === "contact" ? "contact" : "request";
  const c = (r.customer ?? {}) as Record<string, unknown>;
  const customer: QuoteCustomer = {
    company: str(c.company, 160),
    name: str(c.name, 120),
    email: str(c.email, 160),
    phone: str(c.phone, 40) || undefined,
    country: str(c.country, 80),
    countryCode: /^[A-Z]{2}$/.test(str(c.countryCode, 2)) ? str(c.countryCode, 2) : undefined,
    vat: str(c.vat, 40) || undefined,
  };
  // Il modulo breve chiede solo nome, email, telefono e messaggio: azienda e paese si chiedono in risposta
  if (source === "request" && customer.company.length < 2) fields.push("company");
  if (customer.name.length < 2) fields.push("name");
  if (!EMAIL_RE.test(customer.email)) fields.push("email");
  if (source === "request" && customer.country.length < 2) fields.push("country");
  if (r.privacy !== true) fields.push("privacy");
  const message = str(r.message, 5000) || undefined;
  if (source === "contact" && (message?.length ?? 0) < 10) fields.push("message");
  const itemsRaw = Array.isArray(r.items) ? r.items.slice(0, MAX_ITEMS) : [];
  const items: QuoteItem[] = itemsRaw.map((i) => {
    const it = (i ?? {}) as Record<string, unknown>;
    const kind = ["configured", "ready", "custom", "contact"].includes(String(it.kind)) ? (it.kind as QuoteItemKind) : "custom";
    const qty = Math.floor(Number(it.qty));
    const files = (Array.isArray(it.files) ? it.files : []).slice(0, 20).map((f) => str(f, 180)).filter(Boolean);
    return {
      kind,
      code: str(it.code, 160),
      qty: Number.isFinite(qty) ? qty : 0,
      notes: str(it.notes, 3000),
      detail: str(it.detail, 600) || undefined,
      spec: cleanSpec(it.spec),
      files: files.length ? files : undefined,
    };
  });
  if (!items.length) fields.push("items");
  if (items.some((i) => !i.code || i.qty < 1 || i.qty > 100000)) fields.push("items");
  const blobs = (Array.isArray(r.blobs) ? r.blobs : []).slice(0, 40).flatMap((b) => {
    const o = (b ?? {}) as Record<string, unknown>;
    const url = str(o.url, 500);
    // solo link di Vercel Blob
    if (!/^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//i.test(url)) return [];
    const kind: BlobKind = o.kind === "model" || o.kind === "drawing" ? o.kind : "file";
    return [{ name: str(o.name, 200), url, size: Number(o.size) || 0, kind }];
  });
  const elapsed = Number(r.elapsedMs);
  const payload: QuotePayload = {
    source,
    locale: typeof r.locale === "string" && isLocale(r.locale) ? r.locale : "it",
    items,
    customer,
    privacy: r.privacy === true,
    message,
    meta: cleanMeta(r.meta),
    blobs,
    elapsedMs: Number.isFinite(elapsed) ? elapsed : undefined,
    website: str(r.website, 200),
  };
  return { payload: fields.length ? null : payload, fields: [...new Set(fields)] };
}
