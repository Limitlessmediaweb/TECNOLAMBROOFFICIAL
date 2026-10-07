import { DIM_BY_WR, SIZE_BY_WR, iecNumber, maxLengthFor } from "@/data/waveguides";
import { FAMILIES, type FamilyKey } from "@/data/families";
import { OTHER_FLANGE } from "@/data/flanges";

/** Pezzo configurato (o pronto, senza lunghezza e flange). */
export type PartSpec = {
  family: FamilyKey;
  wr: string;
  lengthMm?: number | null;
  flangeA?: string | null;
  flangeB?: string | null;
  options?: string[];
};

/** Codice TLFX della misura (TLFX-100 per WR-90): dalla tabella dimensioni, o dal numero IEC. */
export function tlfxCode(wr: string): string {
  const dim = DIM_BY_WR.get(wr);
  if (dim) return dim.code;
  const size = SIZE_BY_WR.get(wr);
  return size ? `TLFX-${iecNumber(size)}` : wr;
}

function flangeText(id: string | null | undefined, other: string): string | null {
  if (!id) return null;
  return id === OTHER_FLANGE ? other : id;
}

/**
 * Codice leggibile del pezzo, es. "TLFX-100 · TWIST · L600 · UBR100/PBR100".
 * `otherLabel` sostituisce la flangia "Altra" (es. "ALTRA" / "OTHER").
 */
export function partCode(spec: PartSpec, otherLabel = "ALTRA"): string {
  const fam = FAMILIES.find((f) => f.key === spec.family);
  const parts = [tlfxCode(spec.wr)];
  if (fam?.codeTag) parts.push(fam.codeTag);
  if (spec.lengthMm) parts.push(`L${Math.round(spec.lengthMm)}`);
  const a = flangeText(spec.flangeA, otherLabel);
  const b = flangeText(spec.flangeB, otherLabel);
  if (a || b) parts.push(`${a ?? "—"}/${b ?? "—"}`);
  return parts.join(" · ");
}

/** Nome di file sicuro dal codice: "TLFX-100_TWIST_L600_UBR100-PBR100" */
export function fileSafe(code: string): string {
  return code.replace(/\s*·\s*/g, "_").replace(/\//g, "-").replace(/[^A-Za-z0-9_.-]/g, "");
}

export function lengthStatus(wr: string, lengthMm: number | null | undefined): "ok" | "invalid" | "out" {
  if (!lengthMm || !Number.isFinite(lengthMm) || lengthMm <= 0) return "invalid";
  return lengthMm > maxLengthFor(wr) ? "out" : "ok";
}
