/**
 * Invio della richiesta di preventivo.
 *
 * TODO(lancio): collegare un servizio di invio. Opzioni consigliate:
 *  1. Formspree: creare un form, mettere l'ID in NEXT_PUBLIC_FORMSPREE_ID e fare
 *     fetch(`https://formspree.io/f/${id}`, { method: "POST", body: formData,
 *     headers: { Accept: "application/json" } }). Supporta gli allegati nei piani a pagamento.
 *  2. Resend: aggiungere una Route Handler (src/app/api/quote/route.ts) che riceve il FormData,
 *     valida di nuovo lato server e invia a info@tecnolambro.it con l'allegato.
 *  3. Email semplice: mailto non supporta allegati, quindi è sconsigliato.
 * Finché non è collegato, la funzione simula l'invio e restituisce { demo: true }.
 */

export const ACCEPTED_EXTENSIONS = [".pdf", ".dwg", ".dxf", ".step", ".stp"] as const;
export const ACCEPTED_MIME = [
  "application/pdf",
  "application/acad",
  "application/x-acad",
  "application/dwg",
  "image/vnd.dwg",
  "application/dxf",
  "image/vnd.dxf",
  "application/step",
  "model/step",
] as const;
export const MAX_FILE_BYTES = 20 * 1024 * 1024;

export type QuoteData = {
  name: string;
  company: string;
  email: string;
  phone?: string;
  country: string;
  vat?: string;
  family: string;
  size?: string;
  frequency?: string;
  quantity: number;
  message: string;
  file?: File | null;
  locale: string;
};

export type QuoteResult = { ok: true; demo: boolean } | { ok: false; error: string };

/** Il tipo MIME di DWG/DXF/STEP è poco affidabile nei browser: decide l'estensione. */
export function isAcceptedFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

export function formatBytes(bytes: number, locale: string): string {
  const mb = bytes / (1024 * 1024);
  const fmt = new Intl.NumberFormat(locale === "it" ? "it-IT" : "en-GB", { maximumFractionDigits: 1 });
  return mb >= 1 ? `${fmt.format(mb)} MB` : `${fmt.format(bytes / 1024)} KB`;
}

export async function submitQuote(data: QuoteData): Promise<QuoteResult> {
  const body = new FormData();
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null || value === "") continue;
    body.append(key, value instanceof File ? value : String(value));
  }

  // TODO(lancio): sostituire la simulazione con la chiamata reale, per esempio:
  // const res = await fetch(`https://formspree.io/f/${process.env.NEXT_PUBLIC_FORMSPREE_ID}`, {
  //   method: "POST", body, headers: { Accept: "application/json" },
  // });
  // if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
  // return { ok: true, demo: false };
  void body;
  await new Promise((resolve) => setTimeout(resolve, 900));
  return { ok: true, demo: true };
}
