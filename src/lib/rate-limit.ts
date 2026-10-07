import "server-only";

/**
 * Limite di frequenza per IP, in memoria. Vale per singola istanza del server (best effort):
 * su Vercel ogni istanza ha la sua memoria. Per un limite condiviso servirebbe un archivio
 * esterno (es. Upstash Redis): vedi README.
 */
const buckets = new Map<string, Map<string, number[]>>();

export function clientIp(request: Request): string {
  return (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || request.headers.get("x-real-ip") || "local";
}

/** true = richiesta oltre il limite (max richieste in windowMs per chiave e bucket). */
export function rateLimited(bucket: string, key: string, max: number, windowMs: number): boolean {
  let hits = buckets.get(bucket);
  if (!hits) buckets.set(bucket, (hits = new Map()));
  const now = Date.now();
  // pulizia delle voci scadute (non un azzeramento totale: chi supera il limite resta bloccato)
  if (hits.size > 5000) for (const [k, list] of hits) if (!list.some((t) => now - t < windowMs)) hits.delete(k);
  const list = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(key, list);
  return list.length > max;
}

/** La richiesta arriva da una pagina del sito? (Origin uguale all'host della richiesta) */
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === (request.headers.get("x-forwarded-host") ?? request.headers.get("host"));
  } catch {
    return false;
  }
}

/** Host pubblico dello store Vercel Blob collegato (dall'id nel token), es. "abc123.public.blob.vercel-storage.com". */
export function blobHost(): string | null {
  const m = (process.env.BLOB_READ_WRITE_TOKEN ?? "").match(/^vercel_blob_rw_([A-Za-z0-9]+)_/);
  return m ? `${m[1].toLowerCase()}.public.blob.vercel-storage.com` : null;
}
