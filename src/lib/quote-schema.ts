/**
 * Formato della richiesta di preventivo, condiviso da client e route handler (/api/quote).
 * La validazione vera è quella del server: il client la ripete solo per dare errori subito.
 */

export const ACCEPTED_EXTENSIONS = [".step", ".stp", ".iges", ".igs", ".stl", ".pdf", ".dwg", ".dxf"] as const;
/** Limite per file (richiesta del titolare) */
export const MAX_FILE_BYTES = 20 * 1024 * 1024;
/**
 * Limite del corpo della richiesta su Vercel: 4,5 MB per le funzioni. Sopra questa soglia
 * i file dell'utente si caricano su Vercel Blob (se configurato) e nella mail arriva il link.
 */
export const MAX_DIRECT_BYTES = 4 * 1024 * 1024;
export const MAX_ITEMS = 50;

export type QuoteItem = {
  kind: "configured" | "ready" | "custom" | "contact";
  code: string;
  qty: number;
  notes: string;
  /** riga di dettaglio leggibile (tipo, misura, banda, lunghezza, flange, dati elettrici) */
  detail?: string;
};

export type QuoteCustomer = {
  company: string;
  name: string;
  email: string;
  phone?: string;
  country: string;
  vat?: string;
};

export type BlobRef = { name: string; url: string; size: number };

export type QuotePayload = {
  source: "request" | "contact";
  locale: "it" | "en";
  items: QuoteItem[];
  customer: QuoteCustomer;
  privacy: boolean;
  blobs?: BlobRef[];
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

export function formatBytes(bytes: number, locale: string): string {
  const mb = bytes / (1024 * 1024);
  const fmt = new Intl.NumberFormat(locale === "it" ? "it-IT" : "en-GB", { maximumFractionDigits: 1 });
  return mb >= 1 ? `${fmt.format(mb)} MB` : `${fmt.format(Math.max(1, bytes / 1024))} KB`;
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Valida e normalizza il payload. Restituisce i nomi dei campi non validi. */
export function validatePayload(raw: unknown): { payload: QuotePayload | null; fields: string[] } {
  const fields: string[] = [];
  if (!raw || typeof raw !== "object") return { payload: null, fields: ["payload"] };
  const r = raw as Record<string, unknown>;
  const c = (r.customer ?? {}) as Record<string, unknown>;
  const customer: QuoteCustomer = {
    company: str(c.company, 160),
    name: str(c.name, 120),
    email: str(c.email, 160),
    phone: str(c.phone, 40) || undefined,
    country: str(c.country, 80),
    vat: str(c.vat, 40) || undefined,
  };
  if (customer.company.length < 2) fields.push("company");
  if (customer.name.length < 2) fields.push("name");
  if (!EMAIL_RE.test(customer.email)) fields.push("email");
  if (customer.country.length < 2) fields.push("country");
  if (r.privacy !== true) fields.push("privacy");
  const itemsRaw = Array.isArray(r.items) ? r.items.slice(0, MAX_ITEMS) : [];
  const items: QuoteItem[] = itemsRaw.map((i) => {
    const it = (i ?? {}) as Record<string, unknown>;
    const kind = ["configured", "ready", "custom", "contact"].includes(String(it.kind)) ? (it.kind as QuoteItem["kind"]) : "custom";
    const qty = Math.floor(Number(it.qty));
    return { kind, code: str(it.code, 140), qty: Number.isFinite(qty) ? qty : 0, notes: str(it.notes, 3000), detail: str(it.detail, 600) || undefined };
  });
  if (!items.length) fields.push("items");
  if (items.some((i) => !i.code || i.qty < 1 || i.qty > 100000)) fields.push("items");
  const blobs = (Array.isArray(r.blobs) ? r.blobs : []).slice(0, 20).flatMap((b) => {
    const o = (b ?? {}) as Record<string, unknown>;
    const url = str(o.url, 500);
    // solo link di Vercel Blob
    if (!/^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//i.test(url)) return [];
    return [{ name: str(o.name, 200), url, size: Number(o.size) || 0 }];
  });
  const payload: QuotePayload = {
    source: r.source === "contact" ? "contact" : "request",
    locale: r.locale === "en" ? "en" : "it",
    items,
    customer,
    privacy: r.privacy === true,
    blobs,
    website: str(r.website, 200),
  };
  return { payload: fields.length ? null : payload, fields: [...new Set(fields)] };
}
