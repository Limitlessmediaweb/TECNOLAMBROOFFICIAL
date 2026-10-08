import { SIZE_BY_WR } from "@/data/waveguides";
import { flangesFor, OTHER_FLANGE } from "@/data/flanges";
import { FINISHES, TREATMENTS, TYPE_DEF, type Finish, type PartSpec, type PartType, type Plane, type Treatment, type TwistDirection } from "./types";

/**
 * Valori di partenza di ogni tipo (modificabili dall'utente: non sono specifiche Tecnolambro).
 * Il raggio "standard" della curva non è un dato pubblicato: nel 3D e nel disegno si usa un raggio
 * indicativo (vedi visualBendRadius) e nel riferimento compare "R standard".
 */
export function defaultSpec(type: PartType, wr = "WR-90"): PartSpec {
  const flanges = flangesFor(wr);
  const base: PartSpec = {
    type,
    wr,
    f1: flanges[0]?.id ?? OTHER_FLANGE,
    f2: (type === "twistable" || type === "seamless" ? flanges[1]?.id : flanges[0]?.id) ?? OTHER_FLANGE,
    finish: "raw",
    treatment: "none",
  };
  switch (TYPE_DEF[type].geometry) {
    case "length":
      return { ...base, length: 600 };
    case "bend":
      return { ...base, plane: "E", angle: 90, radius: null, leg1: 100, leg2: 100 };
    case "twist":
      return { ...base, rotation: 90, direction: "cw", length: 100 };
    case "offset":
      return { ...base, plane: "E", offset: 20, length: 150 };
    default:
      return { ...base, wr: "unknown" };
  }
}

/** Raggio indicativo per disegno e 3D quando il raggio è "standard": 2 volte la dimensione interna nel piano di curvatura. */
export function visualBendRadius(spec: PartSpec): number {
  if (spec.radius) return spec.radius;
  const s = SIZE_BY_WR.get(spec.wr);
  if (!s) return 40;
  return Math.max(10, Math.round((spec.plane === "H" ? s.a : s.b) * 2));
}

/* -------------------------------------------------------- link condivisibile */

/**
 * La configurazione nell'URL, es. ?tipo=curva&piano=E&wr=90&ang=90&l1=100&l2=100&f1=UBR100&f2=UBR100
 * Chiavi italiane in entrambe le lingue (sono interne).
 */
export const TYPE_PARAM: Record<PartType, string> = {
  twistable: "twistabile",
  seamless: "seamless",
  bend: "curva",
  twist: "twist",
  offset: "disassato",
  custom: "disegno",
};
const FINISH_PARAM: Record<Finish, string> = { raw: "grezza", bright: "brillantata", painted: "verniciata" };
const TREATMENT_PARAM: Record<Treatment, string> = { none: "nessuno", galvanic: "galvanico", thermal: "termico" };

const invert = <T extends string>(m: Record<T, string>) => Object.fromEntries(Object.entries(m).map(([k, v]) => [v, k])) as Record<string, T>;
const TYPE_FROM: Record<string, PartType> = { ...invert(TYPE_PARAM), twistable: "twistable" as PartType, bends: "bend" as PartType, curve: "bend" as PartType };
const FINISH_FROM = invert(FINISH_PARAM);
const TREATMENT_FROM = invert(TREATMENT_PARAM);

export function specToParams(spec: PartSpec): URLSearchParams {
  const p = new URLSearchParams();
  p.set("tipo", TYPE_PARAM[spec.type]);
  if (spec.wr !== "unknown") p.set("wr", spec.wr.replace("WR-", ""));
  const geo = TYPE_DEF[spec.type].geometry;
  if (geo === "bend") {
    p.set("piano", spec.plane ?? "E");
    p.set("ang", String(spec.angle ?? 90));
    p.set("r", spec.radius ? String(spec.radius) : "std");
    p.set("l1", String(spec.leg1 ?? 100));
    p.set("l2", String(spec.leg2 ?? 100));
  }
  if (geo === "twist") {
    p.set("rot", String(spec.rotation ?? 90));
    p.set("dir", spec.direction === "ccw" ? "antiorario" : "orario");
  }
  if (geo === "offset") {
    p.set("piano", spec.plane ?? "E");
    p.set("x", String(spec.offset ?? 20));
  }
  if (geo === "length" || geo === "twist" || geo === "offset") p.set("l", String(spec.length ?? 600));
  if (geo !== "custom") {
    p.set("f1", spec.f1);
    p.set("f2", spec.f2);
    p.set("fin", FINISH_PARAM[spec.finish]);
    p.set("tr", TREATMENT_PARAM[spec.treatment]);
  }
  return p;
}

const num = (v: string | null, min: number, max: number): number | undefined => {
  if (v == null || v === "") return undefined;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) && n >= min && n <= max ? n : undefined;
};

/** Legge una configurazione dall'URL (accetta anche i link della v2: ?tipo=twistable&misura=WR-90). */
export function specFromParams(p: URLSearchParams): PartSpec | null {
  const tipo = p.get("tipo");
  const type = tipo ? TYPE_FROM[tipo] : undefined;
  const wrRaw = p.get("wr") ?? p.get("misura")?.replace("WR-", "") ?? null;
  const wr = wrRaw && SIZE_BY_WR.has(`WR-${wrRaw}`) ? `WR-${wrRaw}` : undefined;
  if (!type && !wr) return null;
  const spec = defaultSpec(type ?? "twistable", wr ?? "WR-90");
  const plane = p.get("piano");
  if (plane === "E" || plane === "H") spec.plane = plane as Plane;
  spec.angle = num(p.get("ang"), 1, 180) ?? spec.angle;
  if (p.get("r") && p.get("r") !== "std") spec.radius = num(p.get("r"), 1, 5000) ?? spec.radius;
  spec.leg1 = num(p.get("l1"), 0, 5000) ?? spec.leg1;
  spec.leg2 = num(p.get("l2"), 0, 5000) ?? spec.leg2;
  spec.rotation = num(p.get("rot"), 1, 360) ?? spec.rotation;
  if (p.get("dir")) spec.direction = (p.get("dir") === "antiorario" ? "ccw" : "cw") as TwistDirection;
  spec.offset = num(p.get("x"), 0, 2000) ?? spec.offset;
  spec.length = num(p.get("l"), 1, 100000) ?? spec.length;
  const f1 = p.get("f1");
  const f2 = p.get("f2");
  if (f1 && /^[A-Za-z0-9-]{2,20}$/.test(f1)) spec.f1 = f1;
  if (f2 && /^[A-Za-z0-9-]{2,20}$/.test(f2)) spec.f2 = f2;
  const fin = FINISH_FROM[p.get("fin") ?? ""];
  if (fin && FINISHES.includes(fin)) spec.finish = fin;
  const tr = TREATMENT_FROM[p.get("tr") ?? ""];
  if (tr && TREATMENTS.includes(tr)) spec.treatment = tr;
  return spec;
}
