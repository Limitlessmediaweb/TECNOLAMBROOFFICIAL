#!/usr/bin/env node
/**
 * Lighthouse mobile sulla home (profilo predefinito: Moto G Power, 4G lento, CPU 4×).
 * Uso: BASE_URL=http://localhost:3000 node scripts/lighthouse.mjs [percorso]
 * Avvia Chromium di Playwright con porta di debug e collega Lighthouse a quella porta.
 * Report: lighthouse/<nome>.report.html e .json
 */
import { chromium } from "playwright";
import lighthouse from "lighthouse";
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const path = process.argv[2] ?? "/";
const name = (process.argv[3] ?? "home-mobile").replace(/[^\w-]/g, "");
const port = 9333;

const RUNS = Number(process.env.RUNS ?? 1);
const browser = await chromium.launch({ args: [`--remote-debugging-port=${port}`] });
try {
  // Con RUNS > 1 riporta la mediana della Performance (il TBT locale è rumoroso).
  const scores = [];
  for (let i = 1; i < RUNS; i++) {
    const r = await lighthouse(BASE + path, { port, logLevel: "error", onlyCategories: ["performance"] });
    const a = r.lhr.audits;
    scores.push(Math.round(r.lhr.categories.performance.score * 100));
    const longTasks = (a["long-tasks"]?.details?.items ?? [])
      .slice(0, 3)
      .map((t) => `${Math.round(t.duration)}ms@${Math.round(t.startTime)} ${String(t.url ?? "").split("/").pop()}`)
      .join(", ");
    console.log(`giro ${i}: perf ${scores.at(-1)} | LCP ${a["largest-contentful-paint"].displayValue} | TBT ${a["total-blocking-time"].displayValue} | ${longTasks}`);
  }
  const result = await lighthouse(BASE + path, {
    port,
    output: ["html", "json"],
    logLevel: "error",
    onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
  });
  mkdirSync("lighthouse", { recursive: true });
  const [html, json] = result.report;
  writeFileSync(`lighthouse/${name}.report.html`, html);
  writeFileSync(`lighthouse/${name}.report.json`, json);
  const { categories, audits } = result.lhr;
  if (RUNS > 1) {
    scores.push(Math.round(categories.performance.score * 100));
    const sorted = [...scores].sort((a, b) => a - b);
    console.log(`giri: ${scores.join(", ")} -> mediana ${sorted[Math.floor(sorted.length / 2)]}`);
  }
  for (const [key, cat] of Object.entries(categories)) console.log(`${key.padEnd(16)} ${Math.round(cat.score * 100)}`);
  for (const id of ["first-contentful-paint", "largest-contentful-paint", "total-blocking-time", "cumulative-layout-shift", "speed-index"]) {
    console.log(`${id.padEnd(26)} ${audits[id].displayValue}`);
  }
  const failed = Object.values(audits).filter((a) => a.score !== null && a.score < 0.9 && a.scoreDisplayMode !== "informative" && a.scoreDisplayMode !== "notApplicable");
  if (failed.length) console.log("\nDa migliorare:\n" + failed.map((a) => `- ${a.id}: ${a.title}${a.displayValue ? ` (${a.displayValue})` : ""}`).join("\n"));
} finally {
  await browser.close();
}
