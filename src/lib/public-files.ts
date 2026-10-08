import "server-only";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * File in public/ letti al momento della build: i blocchi con foto e PDF compaiono da soli
 * quando i file vengono aggiunti, senza toccare il codice.
 */
const PUBLIC = join(process.cwd(), "public");
const IMAGE_RE = /\.(jpe?g|png|webp|avif)$/i;

export function publicExists(path: string): boolean {
  return existsSync(join(PUBLIC, path.replace(/^\//, "")));
}

/** Immagini di una cartella di public/ (es. "foto/officina"), in ordine alfabetico, come percorsi pubblici. */
export function publicImages(dir: string): string[] {
  const abs = join(PUBLIC, dir);
  if (!existsSync(abs)) return [];
  return readdirSync(abs)
    .filter((f) => IMAGE_RE.test(f) && !f.startsWith("."))
    .sort()
    .map((f) => `/${dir}/${f}`);
}
