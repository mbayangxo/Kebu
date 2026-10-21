// Visual rendering QA — renders every built .woff2's full character set in a
// real Chromium browser and saves a screenshot per file. qa.py catches
// structural bugs (missing glyphs, empty outlines, bad metrics) but can't
// catch a glyph that has ink in the wrong place — a winding bug that
// punches a hole through a letter still has non-zero area, so it passes
// the structural check and only shows up visually. This is a human-review
// step, not a pass/fail oracle (there's no "correct" baseline image for an
// original typeface to diff against), but it's the same technique used by
// hand throughout this font's development, now reusable on every rebuild.
import { chromium } from "playwright";
import { readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, basename } from "node:path";

const distDir = process.argv[2] ? resolve(process.argv[2]) : resolve(import.meta.dirname, "dist");
const outDir = resolve(distDir, "render-qa");
mkdirSync(outDir, { recursive: true });

const chromiumPath = process.env.KEBU_CHROMIUM_EXECUTABLE_PATH;
if (!chromiumPath) throw new Error("Set KEBU_CHROMIUM_EXECUTABLE_PATH to a local Chromium executable.");

const files = readdirSync(distDir).filter((f) => f.endsWith(".woff2"));
if (!files.length) throw new Error(`No .woff2 files found in ${distDir}`);

const sample = "ABCDEFGHIJKLM\nNOPQRSTUVWXYZ\n0123456789\nÉÈÀÇ !?.,:;-()/'";

const browser = await chromium.launch({ executablePath: chromiumPath, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1200, height: 420 } });

const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(String(e)));

for (const file of files) {
  const family = "KebuQA_" + basename(file).replace(/[^a-zA-Z0-9]/g, "");
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    @font-face { font-family: "${family}"; src: url("${file}"); }
    body { background: white; margin: 0; padding: 16px; }
    pre { font-family: "${family}"; font-size: 52px; white-space: pre-wrap; margin: 0; color: black; }
  </style></head><body><pre>${sample}</pre></body></html>`;
  const htmlPath = resolve(distDir, `_qa_${family}.html`);
  writeFileSync(htmlPath, html);
  await page.goto(`file://${htmlPath}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(250);
  const loaded = await page.evaluate(() => document.fonts.status === "loaded" || [...document.fonts].some((f) => f.status === "loaded"));
  if (!loaded) pageErrors.push(`${file}: FontFace never reported loaded`);
  await page.screenshot({ path: resolve(outDir, `${basename(file, ".woff2")}.png`) });
}

await browser.close();

console.log(`Rendered ${files.length} font(s) to ${outDir} — review by eye, this does not auto-pass/fail shape correctness.`);
if (pageErrors.length) {
  console.error("Page/load errors:", pageErrors);
  process.exit(1);
}
