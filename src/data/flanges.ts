import { SIZE_BY_WR, iecNumber } from "./waveguides";

/**
 * [DA CONFERMARE con l'ufficio tecnico Tecnolambro]
 * Flange proposte nel configuratore per ogni misura. Sono i tipi comuni delle norme
 * IEC 60154 (UBR piatta, PBR a gola, PDR / UDR per le misure più grandi) ed EIA (CPR),
 * più "Altra (specifica nelle note)". L'elenco reale, con le varianti prodotte da
 * Tecnolambro, va confermato prima del lancio.
 */
export type FlangeOption = { id: string; label: string };

export const OTHER_FLANGE = "other";

/** Misure grandi (fino a R84 / WR-112) dove si usano anche UDR e CPR. */
const LARGE = new Set(["WR-112", "WR-137", "WR-159", "WR-187", "WR-229", "WR-284"]);

export function flangesFor(wr: string): FlangeOption[] {
  const size = SIZE_BY_WR.get(wr);
  if (!size) return [];
  const n = iecNumber(size);
  const list = [`UBR${n}`, `PBR${n}`, `PDR${n}`];
  if (LARGE.has(wr)) list.push(`UDR${n}`, `CPR${wr.slice(3)}F`, `CPR${wr.slice(3)}G`);
  return list.map((label) => ({ id: label, label }));
}

/**
 * [DA CONFERMARE] Opzioni aggiuntive del pezzo. Restano nascoste (visible: false) finché
 * l'ufficio tecnico non le conferma; i testi sono in messages → configurator.options.<id>.
 */
export type ExtraOption = { id: string; visible: boolean };

export const EXTRA_OPTIONS: readonly ExtraOption[] = [
  { id: "jacket", visible: false },
  { id: "pressurized", visible: false },
] as const;

export const VISIBLE_OPTIONS = EXTRA_OPTIONS.filter((o) => o.visible);
