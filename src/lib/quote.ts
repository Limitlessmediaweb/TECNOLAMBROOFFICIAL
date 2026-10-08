/**
 * Invio della richiesta di preventivo dal browser a /api/quote (vedi app/api/quote/route.ts).
 * Le funzioni Vercel accettano al massimo 4,5 MB: oltre MAX_DIRECT_BYTES i file vengono caricati
 * prima su Vercel Blob tramite /api/quote/upload e nella mail arriva il link. I modelli GLB oltre
 * 5 MB in totale arrivano sempre come link (o non arrivano, se Blob non è configurato: si rigenerano).
 */
import { MAX_DIRECT_BYTES, MAX_MODEL_ATTACH_BYTES, isAcceptedFile as acceptedName, type BlobKind, type BlobRef, type QuotePayload, type QuoteResponse } from "./quote-schema";

import type { Locale } from "@/i18n/locales";

export { ACCEPTED_EXTENSIONS, MAX_FILE_BYTES, formatBytes } from "./quote-schema";

export type SubmitReason = "network" | "tooLarge" | "notConfigured" | "rateLimited" | "invalid" | "server";
export type SubmitResult = { ok: true; number: string } | { ok: false; reason: SubmitReason };
export type SubmitFiles = { files: File[]; drawings?: File[]; models?: File[] };

export function isAcceptedFile(file: File): boolean {
  return acceptedName(file.name);
}

async function uploadToBlob(files: File[], kind: BlobKind): Promise<BlobRef[] | null> {
  try {
    const { upload } = await import("@vercel/blob/client");
    const refs: BlobRef[] = [];
    for (const f of files) {
      const res = await upload(`richieste/${f.name}`, f, { access: "public", handleUploadUrl: "/api/quote/upload" });
      refs.push({ name: f.name, url: res.url, size: f.size, kind });
    }
    return refs;
  } catch {
    return null;
  }
}

const bytes = (list: File[]) => list.reduce((s, f) => s + f.size, 0);

export async function submitQuote(payload: QuotePayload, input: SubmitFiles, onProgress?: (state: "uploading" | "sending") => void): Promise<SubmitResult> {
  const direct: Record<BlobKind, File[]> = { file: input.files, drawing: input.drawings ?? [], model: input.models ?? [] };
  const blobs: BlobRef[] = [];
  let modelsSkipped = false;

  const toBlob = async (kind: BlobKind): Promise<boolean> => {
    if (!direct[kind].length) return true;
    onProgress?.("uploading");
    const refs = await uploadToBlob(direct[kind], kind);
    if (!refs) return false;
    blobs.push(...refs);
    direct[kind] = [];
    return true;
  };
  const dropModels = () => {
    if (direct.model.length) modelsSkipped = true;
    direct.model = [];
  };

  // modelli 3D oltre 5 MB: link oppure niente
  if (bytes(direct.model) > MAX_MODEL_ATTACH_BYTES && !(await toBlob("model"))) dropModels();
  // il resto, finché il corpo della richiesta non sta nel limite
  for (const kind of ["file", "model", "drawing"] as const) {
    if (bytes(direct.file) + bytes(direct.model) + bytes(direct.drawing) <= MAX_DIRECT_BYTES) break;
    if (await toBlob(kind)) continue;
    if (kind === "model") dropModels();
    else if (direct.model.length) {
      dropModels();
      if (bytes(direct.file) + bytes(direct.drawing) <= MAX_DIRECT_BYTES) break;
      return { ok: false, reason: "tooLarge" };
    } else return { ok: false, reason: "tooLarge" };
  }
  if (bytes(direct.file) + bytes(direct.model) + bytes(direct.drawing) > MAX_DIRECT_BYTES) return { ok: false, reason: "tooLarge" };

  onProgress?.("sending");
  const body = new FormData();
  body.append("payload", JSON.stringify({ ...payload, blobs }));
  for (const f of direct.file) body.append("files", f, f.name);
  for (const f of direct.drawing) body.append("drawings", f, f.name);
  for (const f of direct.model) body.append("models", f, f.name);
  if (modelsSkipped) body.append("modelsSkipped", "1");
  let res: Response;
  try {
    res = await fetch("/api/quote", { method: "POST", body });
  } catch {
    return { ok: false, reason: "network" };
  }
  let data: QuoteResponse | null = null;
  try {
    data = (await res.json()) as QuoteResponse;
  } catch {
    data = null;
  }
  if (res.ok && data?.ok) return { ok: true, number: data.number };
  if (res.status === 413) return { ok: false, reason: "tooLarge" };
  const error = data && !data.ok ? data.error : "server";
  return { ok: false, reason: error };
}

/* --------------------------------------------- riepilogo per la pagina "inviata" */

export const SENT_KEY = "tl-last-request-v2";

export type SentSummary = {
  number: string;
  date: string;
  locale: Locale;
  customer: { name: string; company?: string; email: string };
  items: { code: string; qty: number; detail?: string }[];
};

export function saveSent(s: SentSummary): void {
  try {
    window.sessionStorage.setItem(SENT_KEY, JSON.stringify(s));
  } catch {
    // ignorato
  }
}

export function loadSent(): SentSummary | null {
  try {
    const raw = window.sessionStorage.getItem(SENT_KEY);
    return raw ? (JSON.parse(raw) as SentSummary) : null;
  } catch {
    return null;
  }
}
