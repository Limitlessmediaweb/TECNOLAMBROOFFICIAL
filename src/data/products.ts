import type { Locale } from "@/i18n/routing";
import type { Availability, DrawingKey, ProductLine, ShopFamily } from "@/lib/commerce/types";

export type FamilyKey = "rigid" | "flexible" | "feeds" | "transitions" | "flanges" | "custom";

/** Cella di tabella: testo neutro, chiave di traduzione (products.cells.*) o numero da formattare. */
export type Cell = string | { k: string } | { n: number; prefix?: string; suffix?: string }
  /** intervallo in GHz */
  | { r: [number, number] };

export type SpecTable = {
  /** chiavi in products.columns.* */
  columns: string[];
  rows: Cell[][];
  /** true = dati dimostrativi da sostituire con quelli di Tecnolambro */
  demo: boolean;
};

export type Family = {
  key: FamilyKey;
  slug: Record<Locale, string>;
  /** Misure WR più rilevanti, usate per i link "chiedi questa misura" */
  sizes: string[];
  table: SpecTable;
};

export const FAMILIES: readonly Family[] = [
  {
    key: "rigid",
    slug: { it: "rigida", en: "rigid" },
    sizes: ["WR-28", "WR-42", "WR-62", "WR-75", "WR-90", "WR-112", "WR-137", "WR-229"],
    table: {
      demo: true,
      columns: ["size", "band", "flange", "parts", "vswr"],
      rows: [
        ["WR-28", { r: [26.5, 40] }, "R320", { k: "rigidParts" }, { n: 1.1, prefix: "≤ " }],
        ["WR-42", { r: [18, 26.5] }, "R220", { k: "rigidParts" }, { n: 1.08, prefix: "≤ " }],
        ["WR-62", { r: [12.4, 18] }, "R140", { k: "rigidParts" }, { n: 1.06, prefix: "≤ " }],
        ["WR-75", { r: [10, 15] }, "R120", { k: "rigidParts" }, { n: 1.05, prefix: "≤ " }],
        ["WR-90", { r: [8.2, 12.4] }, "R100", { k: "rigidParts" }, { n: 1.05, prefix: "≤ " }],
        ["WR-137", { r: [5.85, 8.2] }, "R70", { k: "rigidParts" }, { n: 1.05, prefix: "≤ " }],
      ],
    },
  },
  {
    key: "flexible",
    slug: { it: "flessibile", en: "flexible" },
    sizes: ["WR-42", "WR-62", "WR-75", "WR-90", "WR-112", "WR-137"],
    table: {
      demo: true,
      columns: ["size", "band", "type", "length", "vswr"],
      rows: [
        ["WR-42", { r: [18, 26.5] }, { k: "flexTwist" }, "150-600 mm", { n: 1.15, prefix: "≤ " }],
        ["WR-62", { r: [12.4, 18] }, { k: "flexTwist" }, "150-900 mm", { n: 1.12, prefix: "≤ " }],
        ["WR-75", { r: [10, 15] }, { k: "flexTwist" }, "150-1000 mm", { n: 1.1, prefix: "≤ " }],
        ["WR-90", { r: [8.2, 12.4] }, { k: "flexTwist" }, "150-1000 mm", { n: 1.1, prefix: "≤ " }],
        ["WR-112", { r: [7.05, 10] }, { k: "flexOnly" }, "200-1000 mm", { n: 1.1, prefix: "≤ " }],
        ["WR-137", { r: [5.85, 8.2] }, { k: "flexOnly" }, "200-1000 mm", { n: 1.08, prefix: "≤ " }],
      ],
    },
  },
  {
    key: "feeds",
    slug: { it: "illuminatori", en: "feed-horns" },
    sizes: ["WR-75", "WR-90", "WR-112"],
    table: {
      demo: true,
      columns: ["size", "band", "type", "polarization"],
      rows: [
        ["WR-75", { r: [10, 15] }, { k: "feedPrime" }, { k: "linear" }],
        ["WR-90", { r: [8.2, 12.4] }, { k: "feedPrime" }, { k: "linear" }],
        ["WR-90", { r: [8.2, 12.4] }, { k: "feedHorn" }, { k: "linear" }],
        ["WR-112", { r: [7.05, 10] }, { k: "feedHorn" }, { k: "linear" }],
      ],
    },
  },
  {
    key: "transitions",
    slug: { it: "transizioni", en: "transitions" },
    sizes: ["WR-62", "WR-75", "WR-90", "WR-112"],
    table: {
      demo: true,
      columns: ["from", "to", "band", "vswr"],
      rows: [
        ["WR-90", "WR-75", { r: [10, 12.4] }, { n: 1.08, prefix: "≤ " }],
        ["WR-75", "WR-62", { r: [12.4, 15] }, { n: 1.08, prefix: "≤ " }],
        ["WR-112", "WR-90", { r: [8.2, 10] }, { n: 1.08, prefix: "≤ " }],
        ["WR-90", { k: "coax" }, { r: [8.2, 12.4] }, { n: 1.25, prefix: "≤ " }],
      ],
    },
  },
  {
    key: "flanges",
    slug: { it: "flange-e-kit", en: "flanges-and-kits" },
    sizes: ["WR-42", "WR-62", "WR-75", "WR-90", "WR-112", "WR-137"],
    table: {
      demo: true,
      columns: ["size", "flange", "kit"],
      rows: [
        ["WR-42", "UBR220 / PBR220", { k: "kitFull" }],
        ["WR-62", "UBR140 / PBR140", { k: "kitFull" }],
        ["WR-75", "UBR120 / PBR120", { k: "kitFull" }],
        ["WR-90", "UBR100 / PBR100", { k: "kitFull" }],
        ["WR-112", "UBR84 / PBR84", { k: "kitFull" }],
        ["WR-137", "UDR70 / PDR70", { k: "kitFull" }],
      ],
    },
  },
  {
    key: "custom",
    slug: { it: "su-disegno", en: "custom-built" },
    sizes: [],
    table: {
      // Dati veri dal brief: formati accettati, processi interni, partner, laboratorio.
      demo: false,
      columns: ["step", "detail"],
      rows: [
        [{ k: "cStepFiles" }, "PDF · DWG · DXF · STEP"],
        [{ k: "cStepOffice" }, { k: "cStepOfficeD" }],
        [{ k: "cStepNickel" }, { k: "cStepNickelD" }],
        [{ k: "cStepFinish" }, { k: "cStepFinishD" }],
        [{ k: "cStepPartners" }, { k: "cStepPartnersD" }],
        [{ k: "cStepLab" }, { k: "cStepLabD" }],
      ],
    },
  },
] as const;

export function familyBySlug(slug: string, locale: Locale): Family | undefined {
  return FAMILIES.find((f) => f.slug[locale] === slug);
}

export function familyByAnySlug(slug: string): Family | undefined {
  return FAMILIES.find((f) => f.slug.it === slug || f.slug.en === slug);
}

/* ------------------------------------------------------------------ SHOP */

/**
 * Catalogo dello shop: le 12 voci dello shop di prova.
 * TUTTI DATI DIMOSTRATIVI: codici, prezzi, materiali, lunghezze e VSWR arriveranno da Tecnolambro.
 * Le bande WR sono valori standard EIA; per i pezzi radioamatoriali è indicata la banda d'uso.
 * Prezzi in EUR IVA esclusa, listino 1-4 pezzi (sconti per quantità in lib/commerce/pricing.ts).
 */
export type ShopProductData = {
  handle: string;
  code: string;
  family: ShopFamily;
  line: ProductLine;
  drawing: DrawingKey;
  /** famiglia del sito usata per precompilare il preventivo "variante su misura" */
  quoteFamily: FamilyKey;
  wr: string | null;
  band: { min: number; max: number } | null;
  length: string | null;
  flanges: string | null;
  material: Record<Locale, string>;
  vswr: number | null;
  price: number;
  availability: Availability;
  title: Record<Locale, string>;
  shortTitle: Record<Locale, string>;
  description: Record<Locale, string>;
};

const DEMO_BRASS = { it: "Ottone, finitura brillantata (dimostrativo)", en: "Brass, bright-dipped finish (demo)" };
const DEMO_ALU = { it: "Alluminio verniciato (dimostrativo)", en: "Painted aluminium (demo)" };

export const SHOP_PRODUCTS: readonly ShopProductData[] = [
  {
    handle: "flex-twist-wr75-600",
    code: "TL-FT75-600",
    family: "flexible",
    line: "pro",
    drawing: "flexible",
    quoteFamily: "flexible",
    wr: "WR-75",
    band: { min: 10, max: 15 },
    length: "600 mm",
    flanges: "UBR120 / PBR120",
    material: DEMO_BRASS,
    vswr: 1.1,
    price: 380,
    availability: "in_stock",
    title: { it: "Guida flessibile-twistabile WR-75, 600 mm", en: "Flexible-twistable waveguide WR-75, 600 mm" },
    shortTitle: { it: "Guida flessibile-twistabile 600 mm", en: "Flexible-twistable waveguide 600 mm" },
    description: {
      it: "Tratto flessibile e twistabile per collegare radio e antenna con flange non allineate. Di produzione Tecnolambro.",
      en: "Flexible and twistable section to connect radio and antenna when flanges are not aligned. Made by Tecnolambro.",
    },
  },
  {
    handle: "flex-twist-wr90-600",
    code: "TL-FT90-600",
    family: "flexible",
    line: "pro",
    drawing: "flexible",
    quoteFamily: "flexible",
    wr: "WR-90",
    band: { min: 8.2, max: 12.4 },
    length: "600 mm",
    flanges: "UBR100 / PBR100",
    material: DEMO_BRASS,
    vswr: 1.1,
    price: 340,
    availability: "in_stock",
    title: { it: "Guida flessibile-twistabile WR-90, 600 mm", en: "Flexible-twistable waveguide WR-90, 600 mm" },
    shortTitle: { it: "Guida flessibile-twistabile 600 mm", en: "Flexible-twistable waveguide 600 mm" },
    description: {
      it: "Tratto flessibile e twistabile in banda X, per ponti radio e banchi di misura. Di produzione Tecnolambro.",
      en: "Flexible and twistable X-band section for microwave links and test benches. Made by Tecnolambro.",
    },
  },
  {
    handle: "bend-e-wr90-90",
    code: "TL-BE90-90",
    family: "bends",
    line: "pro",
    drawing: "rigid",
    quoteFamily: "rigid",
    wr: "WR-90",
    band: { min: 8.2, max: 12.4 },
    length: "R 45 mm",
    flanges: "UBR100 / PBR100",
    material: DEMO_BRASS,
    vswr: 1.05,
    price: 145,
    availability: "in_stock",
    title: { it: "Curva piano E 90° WR-90", en: "E-plane bend 90° WR-90" },
    shortTitle: { it: "Curva piano E 90°", en: "E-plane bend 90°" },
    description: {
      it: "Curva rigida a 90° nel piano E, con flange montate e controllate.",
      en: "Rigid 90° bend in the E plane, with flanges fitted and checked.",
    },
  },
  {
    handle: "bend-h-wr90-90",
    code: "TL-BH90-90",
    family: "bends",
    line: "pro",
    drawing: "rigid",
    quoteFamily: "rigid",
    wr: "WR-90",
    band: { min: 8.2, max: 12.4 },
    length: "R 60 mm",
    flanges: "UBR100 / PBR100",
    material: DEMO_BRASS,
    vswr: 1.05,
    price: 145,
    availability: "low_stock",
    title: { it: "Curva piano H 90° WR-90", en: "H-plane bend 90° WR-90" },
    shortTitle: { it: "Curva piano H 90°", en: "H-plane bend 90°" },
    description: {
      it: "Curva rigida a 90° nel piano H, con flange montate e controllate.",
      en: "Rigid 90° bend in the H plane, with flanges fitted and checked.",
    },
  },
  {
    handle: "twist-wr75-90",
    code: "TL-TW75-90",
    family: "twist",
    line: "pro",
    drawing: "rigid",
    quoteFamily: "rigid",
    wr: "WR-75",
    band: { min: 10, max: 15 },
    length: "100 mm",
    flanges: "UBR120 / PBR120",
    material: DEMO_BRASS,
    vswr: 1.06,
    price: 165,
    availability: "in_stock",
    title: { it: "Twist 90° WR-75", en: "90° twist WR-75" },
    shortTitle: { it: "Twist 90°", en: "90° twist" },
    description: {
      it: "Ruota la polarizzazione di 90° tra due flange, su 100 mm di lunghezza.",
      en: "Rotates polarization by 90° between two flanges over a 100 mm length.",
    },
  },
  {
    handle: "straight-wr90-300",
    code: "TL-ST90-300",
    family: "rigid",
    line: "pro",
    drawing: "rigid",
    quoteFamily: "rigid",
    wr: "WR-90",
    band: { min: 8.2, max: 12.4 },
    length: "300 mm",
    flanges: "UBR100 / PBR100",
    material: DEMO_BRASS,
    vswr: 1.03,
    price: 95,
    availability: "in_stock",
    title: { it: "Tratto dritto WR-90, 300 mm", en: "Straight section WR-90, 300 mm" },
    shortTitle: { it: "Tratto dritto 300 mm", en: "Straight section 300 mm" },
    description: {
      it: "Guida rigida dritta con flange, per prolunghe e banchi di misura.",
      en: "Straight rigid waveguide with flanges, for extensions and test benches.",
    },
  },
  {
    handle: "flange-adapter-wr90",
    code: "TL-FA90",
    family: "flanges",
    line: "pro",
    drawing: "flanges",
    quoteFamily: "flanges",
    wr: "WR-90",
    band: { min: 8.2, max: 12.4 },
    length: "20 mm",
    flanges: "UBR100 → PDR100",
    material: DEMO_BRASS,
    vswr: 1.04,
    price: 85,
    availability: "low_stock",
    title: { it: "Adattatore di flangia WR-90 UBR100 → PDR100", en: "Flange adapter WR-90 UBR100 → PDR100" },
    shortTitle: { it: "Adattatore di flangia UBR100 → PDR100", en: "Flange adapter UBR100 → PDR100" },
    description: {
      it: "Collega flange di tipo diverso sulla stessa misura di guida.",
      en: "Connects different flange types on the same waveguide size.",
    },
  },
  {
    handle: "install-kit-wr75",
    code: "TL-KIT75",
    family: "flanges",
    line: "pro",
    drawing: "flanges",
    quoteFamily: "flanges",
    wr: "WR-75",
    band: { min: 10, max: 15 },
    length: null,
    flanges: "UBR120 / PBR120",
    material: { it: "Flangia, guarnizione, viteria inox (dimostrativo)", en: "Flange, gasket, stainless hardware (demo)" },
    vswr: null,
    price: 48,
    availability: "in_stock",
    title: { it: "Kit di installazione WR-75", en: "Installation kit WR-75" },
    shortTitle: { it: "Kit di installazione", en: "Installation kit" },
    description: {
      it: "Flangia, guarnizione e viteria per una connessione di ponte radio.",
      en: "Flange, gasket and hardware for one microwave link connection.",
    },
  },
  {
    handle: "transition-wr90-n",
    code: "TL-WN90",
    family: "transitions",
    line: "pro",
    drawing: "transitions",
    quoteFamily: "transitions",
    wr: "WR-90",
    band: { min: 8.2, max: 12.4 },
    length: "65 mm",
    flanges: "UBR100 / N",
    material: DEMO_BRASS,
    vswr: 1.25,
    price: 210,
    availability: "on_order",
    title: { it: "Transizione guida → N, WR-90", en: "Waveguide to N transition, WR-90" },
    shortTitle: { it: "Transizione guida → N", en: "Waveguide to N transition" },
    description: {
      it: "Da guida d’onda a connettore coassiale N, per strumenti e apparati coassiali.",
      en: "From waveguide to N coaxial connector, for coaxial instruments and equipment.",
    },
  },
  {
    handle: "termination-wr90",
    code: "TL-TL90",
    family: "rigid",
    line: "pro",
    drawing: "rigid",
    quoteFamily: "rigid",
    wr: "WR-90",
    band: { min: 8.2, max: 12.4 },
    length: "120 mm",
    flanges: "UBR100",
    material: DEMO_ALU,
    vswr: 1.05,
    price: 175,
    availability: "on_order",
    title: { it: "Terminazione adattata WR-90", en: "Matched termination WR-90" },
    shortTitle: { it: "Terminazione adattata", en: "Matched termination" },
    description: {
      it: "Carico adattato per chiudere una linea in guida durante misure e collaudi.",
      en: "Matched load to terminate a waveguide run during measurements and tests.",
    },
  },
  {
    handle: "feed-10ghz-qo100",
    code: "TL-HF10-QO",
    family: "ham",
    line: "ham",
    drawing: "feeds",
    quoteFamily: "feeds",
    wr: "WR-75",
    band: { min: 10, max: 10.5 },
    length: "140 mm",
    flanges: "UBR120",
    material: DEMO_ALU,
    vswr: 1.2,
    price: 120,
    availability: "in_stock",
    title: { it: "Illuminatore 10 GHz per QO-100", en: "10 GHz feed for QO-100" },
    shortTitle: { it: "Illuminatore 10 GHz QO-100", en: "10 GHz QO-100 feed" },
    description: {
      it: "Illuminatore per parabola in banda 10 GHz, adatto alla ricezione del downlink QO-100.",
      en: "Dish feed for the 10 GHz band, suited to receiving the QO-100 downlink.",
    },
  },
  {
    handle: "transition-10ghz-sma",
    code: "TL-HS10-SMA",
    family: "ham",
    line: "ham",
    drawing: "transitions",
    quoteFamily: "transitions",
    wr: "WR-75",
    band: { min: 10, max: 10.5 },
    length: "45 mm",
    flanges: "UBR120 / SMA",
    material: DEMO_BRASS,
    vswr: 1.3,
    price: 95,
    availability: "low_stock",
    title: { it: "Transizione 10 GHz → SMA", en: "10 GHz to SMA transition" },
    shortTitle: { it: "Transizione 10 GHz → SMA", en: "10 GHz to SMA transition" },
    description: {
      it: "Da guida WR-75 a connettore SMA per le stazioni radioamatoriali a 10 GHz.",
      en: "From WR-75 waveguide to SMA connector for 10 GHz amateur stations.",
    },
  },
];

export function shopProductByHandle(handle: string): ShopProductData | undefined {
  return SHOP_PRODUCTS.find((p) => p.handle === handle);
}
