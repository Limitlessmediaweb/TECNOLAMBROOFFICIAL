#!/usr/bin/env node
/**
 * Fallisce se trova <img> o <Image> senza attributo alt nei sorgenti (src/**.tsx|jsx)
 * e, se esiste una build, nell'HTML generato (.next/server/app/**.html).
 * Le immagini decorative devono avere alt="" esplicito.
 */
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const problems = [];

function walk(dir, exts, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".git")) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, exts, out);
    else if (exts.some((e) => name.endsWith(e))) out.push(full);
  }
  return out;
}

// Tag <img ...> o <Image ...> (anche su più righe) senza alt=
const TAG_RE = /<(img|Image)\b([^>]*?)\/?>/gs;

for (const file of walk(join(root, "src"), [".tsx", ".jsx"])) {
  const text = readFileSync(file, "utf8");
  for (const m of text.matchAll(TAG_RE)) {
    if (!/\balt\s*=/.test(m[2])) {
      const line = text.slice(0, m.index).split("\n").length;
      problems.push(`${relative(root, file)}:${line}  <${m[1]}> senza alt`);
    }
  }
}

for (const file of walk(join(root, ".next", "server", "app"), [".html"])) {
  const text = readFileSync(file, "utf8");
  for (const m of text.matchAll(/<img\b([^>]*)>/g)) {
    if (!/\balt=/.test(m[1])) problems.push(`${relative(root, file)}  <img> senza alt nell'HTML generato`);
  }
}

if (problems.length) {
  console.error(`check:alt: ${problems.length} immagini senza alt\n` + problems.join("\n"));
  process.exit(1);
}
console.log("check:alt: ok, tutte le immagini hanno l'attributo alt.");
