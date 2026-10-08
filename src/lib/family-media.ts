import "server-only";
import { publicExists, publicImages } from "./public-files";
import { PHOTO_DIRS } from "@/data/photos";
import { familyModel, type Family } from "@/data/families";

/** Chiave della miniatura 3D statica (public/render/<chiave>.webp) per il modello della famiglia */
const RENDER: Record<string, string> = { twistable: "twistable", seamless: "seamless", bend: "bend-E", twist: "twist", offset: "offset" };

/**
 * Immagine della card di una famiglia: la prima foto vera (public/foto/prodotti/<key>/), altrimenti la
 * miniatura del modello 3D; null = si usa il disegno a linee.
 */
export function familyRender(f: Family): string | null {
  const photo = publicImages(PHOTO_DIRS.products(f.key))[0];
  if (photo) return photo;
  const model = familyModel(f);
  const key = model ? RENDER[model] : undefined;
  return key && publicExists(`render/${key}.webp`) ? `/render/${key}.webp` : null;
}
