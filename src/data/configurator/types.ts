/**
 * Tipi di pezzo del configuratore e loro opzioni. Per aggiungere un tipo: una voce in PART_TYPES,
 * i valori predefiniti in defaults.ts, i testi in messages → configurator.types.<tipo>, e (se ha una
 * geometria) un percorso in lib/part3d.ts e lib/drawing.ts.
 */
import type { FamilyKey } from "@/data/families";

export type PartType = "twistable" | "seamless" | "bend" | "twist" | "offset" | "custom";
export type Plane = "E" | "H";
export type Finish = "raw" | "bright" | "painted";
export type Treatment = "none" | "galvanic" | "thermal";
export type TwistDirection = "cw" | "ccw";

export type PartSpec = {
  type: PartType;
  /** "WR-90", oppure "unknown" per i pezzi su disegno senza misura */
  wr: string;
  /** flange (id da data/flanges.ts o "other") */
  f1: string;
  f2: string;
  finish: Finish;
  treatment: Treatment;
  /** lunghezza totale in mm: flessibili, twist, disassati */
  length?: number;
  /** curva e disassato */
  plane?: Plane;
  /** curva: angolo in gradi (1-180) */
  angle?: number;
  /** curva: raggio di curvatura in mm; null = standard */
  radius?: number | null;
  /** curva: lunghezza delle gambe in mm */
  leg1?: number;
  leg2?: number;
  /** twist: rotazione in gradi e senso */
  rotation?: number;
  direction?: TwistDirection;
  /** disassato: spostamento laterale in mm */
  offset?: number;
};

export type PartTypeDef = {
  type: PartType;
  /** famiglia del sito (pagina prodotto) */
  family: FamilyKey | null;
  /** passi del configuratore oltre a tipo, misura, flange e finitura */
  geometry: "length" | "bend" | "twist" | "offset" | "custom";
  /** ha un modello 3D generato */
  has3d: boolean;
};

export const PART_TYPES: readonly PartTypeDef[] = [
  { type: "twistable", family: "twistable", geometry: "length", has3d: true },
  { type: "seamless", family: "seamless", geometry: "length", has3d: true },
  { type: "bend", family: "bends", geometry: "bend", has3d: true },
  { type: "twist", family: "twists", geometry: "twist", has3d: true },
  { type: "offset", family: "offsets", geometry: "offset", has3d: true },
  { type: "custom", family: null, geometry: "custom", has3d: false },
] as const;

export const TYPE_DEF: Record<PartType, PartTypeDef> = Object.fromEntries(PART_TYPES.map((d) => [d.type, d])) as Record<PartType, PartTypeDef>;

export const FINISHES: readonly Finish[] = ["raw", "bright", "painted"];
export const TREATMENTS: readonly Treatment[] = ["none", "galvanic", "thermal"];
export const BEND_ANGLES = [30, 45, 60, 90] as const;
export const TWIST_ROTATIONS = [45, 90] as const;

export function isFlexible(t: PartType): boolean {
  return t === "twistable" || t === "seamless";
}
