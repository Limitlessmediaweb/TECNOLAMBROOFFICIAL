/**
 * Impacchetta la geometria parametrica del configuratore del sito (src/lib/part3d.ts) per il browser
 * dello spot: stesso codice dei modelli 3D del sito, nessun modello scaricato.
 * Uso: node scripts/bundle.mjs -> scenes/part3d.bundle.js
 */
import { build } from "esbuild";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(join(dirname(fileURLToPath(import.meta.url)), ".."));
const SITE = resolve(ROOT, "..", "..");
await build({
  stdin: {
    contents: `export { buildPart, disposeGroup } from "@/lib/part3d";
export { defaultSpec, visualBendRadius } from "@/data/configurator/defaults";
export { SIZE_BY_WR, SIZES } from "@/data/waveguides";`,
    resolveDir: SITE,
    loader: "ts",
  },
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  outfile: join(ROOT, "scenes", "part3d.bundle.js"),
  alias: { "@": join(SITE, "src") },
  external: ["three", "three/*"],
  logLevel: "info",
});
