import { readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { join } from "node:path";

/** Bind evidence to compiler, renderer, authority, migrations, harness and actual input assets. */
export function benchmarkSourceHash(root = process.cwd()) {
  const files = [];
  const walk = directory => {
    for (const entry of readdirSync(join(root, directory), { withFileTypes: true })) {
      const path = `${directory}/${entry.name}`;
      if (entry.isDirectory()) walk(path);
      else if (entry.isFile() && /\.(?:ts|tsx|mjs|mts|sql|css|json)$/.test(path)) files.push(path);
    }
  };
  for (const directory of ["lib", "app", "supabase/migrations", "tests/creative-core"]) walk(directory);
  files.push("package.json", "package-lock.json", "playwright.config.ts", "vitest.config.ts", "next.config.ts", "middleware.ts", "docs/decisions/3J-real-content-blueprint.md", "scripts/check-3j-gate.mjs", "scripts/run-kcd-native-local-ui.mjs", "scripts/run-local-postgres-tests.mjs", ...["may-figure.png", "city-skyline.png", "portrait.jpg", "logo-stacked.png"].map(name => `public/templates/maylecor/${name}`));
  const hash = createHash("sha256");
  for (const path of files.sort()) hash.update(`${path}\0`).update(readFileSync(join(root, path))).update("\0");
  return hash.digest("hex");
}

export const requiredGates = ["referencePreservation", "nativeEditingBrowser", "realProvider", "visualQuality", "ownerPortfolioParity", "databaseAuthority", "hostedReadiness", "stablePerformance", "concurrentQuota"];
export function evaluate3jGate(report, sourceHash) {
  const reasons = [];
  if (report?.version !== 1 || report?.sourceHash !== sourceHash) reasons.push("Missing, future or stale source evidence");
  for (const name of requiredGates) {
    const entry = report?.gates?.[name];
    if (entry?.status !== "pass" || typeof entry.evidence !== "string" || !entry.evidence.trim()) reasons.push(`${name}: ${entry?.status ?? "missing"}`);
  }
  const provider = report?.gates?.realProvider;
  if (provider?.provenance !== "real-provider" || !(provider?.inputTokens > 0) || !(provider?.outputTokens > 0)) reasons.push("Real provider usage has not been established");
  if (typeof provider?.outputHash !== "string" || !/^[a-f\d]{64}$/.test(provider.outputHash)) reasons.push("Generated output digest is missing");
  if (report?.gates?.visualQuality?.reviewMethod !== "visual-inspection" || report?.gates?.visualQuality?.reviewedOutputHash !== provider?.outputHash) reasons.push("Generated visual quality needs inspection of the exact output");
  return { status: reasons.length ? "blocked" : "pass", reasons };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const report = JSON.parse(readFileSync(process.argv[2] ?? "evidence/3j/gate.json", "utf8"));
  const sourceHash = benchmarkSourceHash();
  const result = evaluate3jGate(report, sourceHash);
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.status === "pass" ? 0 : 1;
}
