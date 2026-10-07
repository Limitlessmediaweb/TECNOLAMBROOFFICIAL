/**
 * Colori del brand per i contesti dove le variabili CSS non arrivano
 * (meta theme-color, immagine Open Graph generata sul server, fallback del canvas).
 * Devono restare allineati ai token in src/app/globals.css.
 * Origine: scripts/extract-logo-colors.mjs su public/brand/logo.png.
 */
export const LOGO = {
  blue: "#0070bd",
  grey: "#a1adb7",
  graphite: "#3c404c",
} as const;

export const THEME = {
  light: { bg: "#f5f8fa", surface2: "#e5ebf0", line: "#ced7de", fg: "#171e2c", muted: "#495765", primary: LOGO.blue, accent: "#0066cc" },
  dark: { bg: "#09121a", surface2: "#162431", line: "#273949", fg: "#ebf0f4", muted: "#99a9b8", primary: "#55ade7", accent: "#3daef5" },
} as const;
