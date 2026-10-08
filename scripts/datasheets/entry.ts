// Dati e disegni del sito per le schede tecniche (impacchettato con esbuild ed eseguito in Node).
export { SIZES, SIZE_BY_WR, DIM_BY_WR, TWIST_TABLE, SEAMLESS_TABLE, MATERIAL, isOnRequest, num, range, standardLengths, sizeLabel } from "@/data/waveguides";
export { flangesFor } from "@/data/flanges";
export { VISIBLE_FAMILIES, familySlug } from "@/data/families";
export { drawingSvg } from "@/lib/drawing";
export { defaultSpec } from "@/data/configurator/defaults";
export { partReference } from "@/lib/part";
export { getPathname } from "@/i18n/switch-path";
export { LOCALES, LOCALE_META, intlLocale } from "@/i18n/locales";
export { COMPANY, ENV } from "@/data/site";
export { CERTIFICATIONS } from "@/data/certifications";
export { wrSlug } from "@/lib/wr-page";
