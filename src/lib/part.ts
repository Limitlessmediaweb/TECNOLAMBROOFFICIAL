import { DIM_BY_WR, isStandardLength } from "@/data/waveguides";
import { OTHER_FLANGE } from "@/data/flanges";
import { isFlexible, TYPE_DEF, type PartSpec } from "@/data/configurator/types";

export type { PartSpec } from "@/data/configurator/types";

/**
 * Codice TLFX della misura, SOLO se è nella tabella dimensioni del titolare (TLFX + numero IEC).
 * WR-34 (R260) e WR-159 (R58) non hanno codice: null.
 */
export function tlfxCode(wr: string): string | null {
  return DIM_BY_WR.get(wr)?.code ?? null;
}

const n = (v: number | undefined | null) => String(Math.round((v ?? 0) * 10) / 10);

/**
 * Riferimento leggibile del pezzo.
 * Flessibili: codice TLFX (es. "TLFX-100 · TWIST · L600 · UBR100/PBR100"); senza codice in tabella
 * "WR-34 flessibile twistabile · L600 · …" (`flexName` dalla lingua del sito).
 * Curve, twist e disassati: riferimento interno, NON un codice prodotto, es.
 * "CURVA-E · WR-90 · 90° · L1 100 · L2 100 · UBR100/UBR100".
 */
export function partReference(spec: PartSpec, opts: { other: string; flexName?: string; customLabel?: string } = { other: "ALTRA" }): string {
  const fl = (f: string) => (f === OTHER_FLANGE ? opts.other : f);
  const flanges = `${fl(spec.f1)}/${fl(spec.f2)}`;
  const t = spec.type;
  if (t === "custom") return opts.customLabel ?? "SU DISEGNO";
  if (isFlexible(t)) {
    const code = tlfxCode(spec.wr);
    const head = code ? [code, t === "twistable" ? "TWIST" : "SEAMLESS"] : [`${spec.wr} ${opts.flexName ?? (t === "twistable" ? "flessibile twistabile" : "flessibile seamless")}`];
    return [...head, ...(spec.length ? [`L${n(spec.length)}`] : []), flanges].join(" · ");
  }
  if (t === "bend") {
    return [
      `CURVA-${spec.plane ?? "E"}`,
      spec.wr,
      `${n(spec.angle)}°`,
      ...(spec.radius ? [`R ${n(spec.radius)}`] : []),
      `L1 ${n(spec.leg1)}`,
      `L2 ${n(spec.leg2)}`,
      flanges,
    ].join(" · ");
  }
  if (t === "twist") {
    return ["TWIST", spec.wr, `${n(spec.rotation)}° ${spec.direction === "ccw" ? "CCW" : "CW"}`, `L${n(spec.length)}`, flanges].join(" · ");
  }
  return [`DISASSATO-${spec.plane ?? "E"}`, spec.wr, `X${n(spec.offset)}`, `L${n(spec.length)}`, flanges].join(" · ");
}

/** Nome di file sicuro dal riferimento: "TLFX-100_TWIST_L600_UBR100-PBR100" */
export function fileSafe(code: string): string {
  return code.replace(/\s*·\s*/g, "_").replace(/\//g, "-").replace(/°/g, "deg").replace(/\s+/g, "-").replace(/[^A-Za-z0-9_.-]/g, "");
}

export type FieldStatus = "ok" | "invalid" | "out";

/** Lunghezza della flessibile: "out" = fuori dai limiti standard (si valuta nel preventivo, non si blocca). */
export function lengthStatus(spec: PartSpec): FieldStatus {
  const L = spec.length;
  if (!L || !Number.isFinite(L) || L <= 0) return "invalid";
  if (isFlexible(spec.type)) return isStandardLength(spec.wr, L) ? "ok" : "out";
  return "ok";
}

/** Tutti i numeri della geometria sono validi? (gli "out" non bloccano) */
export function specValid(spec: PartSpec): boolean {
  const pos = (v?: number | null) => typeof v === "number" && Number.isFinite(v) && v > 0;
  switch (TYPE_DEF[spec.type].geometry) {
    case "length":
      return pos(spec.length);
    case "bend":
      return pos(spec.angle) && (spec.angle ?? 0) <= 180 && pos(spec.leg1) && pos(spec.leg2) && (spec.radius === null || pos(spec.radius));
    case "twist":
      return pos(spec.rotation) && pos(spec.length);
    case "offset":
      return typeof spec.offset === "number" && spec.offset >= 0 && pos(spec.length);
    default:
      return true;
  }
}
