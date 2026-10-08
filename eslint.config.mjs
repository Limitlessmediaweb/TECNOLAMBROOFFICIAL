import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // file generati e output locali (spot video, dati delle schede)
    "test-output/**",
    "video/*/scenes/part3d.bundle.js",
    "video/*/node_modules/**",
  ]),
]);

export default eslintConfig;
