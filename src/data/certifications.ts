import type { Locale } from "@/i18n/routing";

/**
 * Certificazioni (dati degli attestati PJR). Gli attestati PDF stanno in public/certificazioni/,
 * le miniature WebP della prima pagina le crea scripts/cert-preview.mjs in public/certificazioni/anteprime/.
 * Loghi PJR e ACCREDIA: NON usarli fuori dal PDF finché non sono verificate le loro regole d'uso.
 */
export type Certification = {
  id: "iso9001" | "iso14001";
  /** "ISO 9001:2015" */
  standard: string;
  /** riferimento aggiuntivo, es. regolamento tecnico ACCREDIA */
  extra?: string;
  system: Record<Locale, string>;
  number: string;
  /** date ISO (AAAA-MM-GG) */
  firstIssue: string;
  currentIssue: string;
  expiry: string;
  /** percorso pubblico del PDF */
  pdf: string;
  /** percorso pubblico della miniatura */
  preview: string;
};

export const CERT_BODY = {
  name: "Perry Johnson Registrars, Inc.",
  short: "PJR",
  accreditation: "ACCREDIA",
  accreditationNumber: "00277",
  iafSectors: ["17", "19"],
} as const;

/** Scopo della certificazione, testuale dagli attestati (identico per entrambe). */
export const CERT_SCOPE: Record<Locale, string> = {
  it: "Progettazione e Produzione di Componenti di Guide d'Onda attraverso le Fasi di Taglio, Fresatura, Tornitura, Assemblaggio e Giunzione.",
  en: "Design and manufacture of waveguide components through cutting, milling, turning, assembly and joining.",
};

export const CERTIFICATIONS: readonly Certification[] = [
  {
    id: "iso9001",
    standard: "ISO 9001:2015",
    system: { it: "Sistema di Gestione Qualità", en: "Quality Management System" },
    number: "C2026-05582",
    firstIssue: "2023-09-14",
    currentIssue: "2026-09-10",
    expiry: "2029-09-13",
    pdf: "/certificazioni/ISO-9001-2015_Tecnolambro_C2026-05582.pdf",
    preview: "/certificazioni/anteprime/ISO-9001-2015_Tecnolambro_C2026-05582.webp",
  },
  {
    id: "iso14001",
    standard: "ISO 14001:2015",
    extra: "Regolamento Tecnico ACCREDIA RT-09",
    system: { it: "Sistema di Gestione Ambientale", en: "Environmental Management System" },
    number: "C2026-05583",
    firstIssue: "2023-09-14",
    currentIssue: "2026-09-10",
    expiry: "2029-04-30",
    pdf: "/certificazioni/ISO-14001-2015_Tecnolambro_C2026-05583.pdf",
    preview: "/certificazioni/anteprime/ISO-14001-2015_Tecnolambro_C2026-05583.webp",
  },
] as const;

/** Oltre la scadenza la card mostra "in rinnovo" invece di "valido fino al". */
export function isExpired(c: Certification, now = new Date()): boolean {
  return now.getTime() > new Date(`${c.expiry}T23:59:59`).getTime();
}

export function formatDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === "it" ? "it-IT" : "en-GB", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${iso}T12:00:00`));
}
