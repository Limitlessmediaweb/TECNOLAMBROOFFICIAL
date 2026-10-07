/**
 * Invio della richiesta di preventivo dal browser a /api/quote (vedi app/api/quote/route.ts).
 * Se i file del cliente superano in totale MAX_DIRECT_BYTES (limite delle funzioni Vercel),
 * vengono caricati prima su Vercel Blob tramite /api/quote/upload e nella mail arriva il link.
 */
import { MAX_DIRECT_BYTES, isAcceptedFile as acceptedName, type BlobRef, type QuotePayload, type QuoteResponse } from "./quote-schema";

export { ACCEPTED_EXTENSIONS, MAX_FILE_BYTES, formatBytes } from "./quote-schema";

export type SubmitReason = "network" | "tooLarge" | "notConfigured" | "rateLimited" | "invalid" | "server";
export type SubmitResult = { ok: true; number: string } | { ok: false; reason: SubmitReason };

export function isAcceptedFile(file: File): boolean {
  return acceptedName(file.name);
}

async function uploadToBlob(files: File[], onProgress?: (state: "uploading") => void): Promise<BlobRef[] | null> {
  onProgress?.("uploading");
  try {
    const { upload } = await import("@vercel/blob/client");
    const refs: BlobRef[] = [];
    for (const f of files) {
      const res = await upload(`richieste/${f.name}`, f, { access: "public", handleUploadUrl: "/api/quote/upload" });
      refs.push({ name: f.name, url: res.url, size: f.size });
    }
    return refs;
  } catch {
    return null;
  }
}

export async function submitQuote(
  payload: QuotePayload,
  files: File[],
  drawings: File[] = [],
  onProgress?: (state: "uploading" | "sending") => void,
): Promise<SubmitResult> {
  const drawingBytes = drawings.reduce((s, f) => s + f.size, 0);
  const fileBytes = files.reduce((s, f) => s + f.size, 0);
  let direct = files;
  let blobs: BlobRef[] = [];
  let directDrawings = drawings;
  if (fileBytes + drawingBytes > MAX_DIRECT_BYTES) {
    // prima i file del cliente; se non basta, anche i disegni generati
    const toUpload = drawingBytes > MAX_DIRECT_BYTES || fileBytes === 0 ? [...files, ...drawings] : files;
    const refs = await uploadToBlob(toUpload, onProgress);
    if (!refs) return { ok: false, reason: "tooLarge" };
    blobs = refs;
    direct = [];
    if (toUpload.length > files.length) directDrawings = [];
  }
  onProgress?.("sending");
  const body = new FormData();
  body.append("payload", JSON.stringify({ ...payload, blobs }));
  for (const f of direct) body.append("files", f, f.name);
  for (const f of directDrawings) body.append("drawings", f, f.name);
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
