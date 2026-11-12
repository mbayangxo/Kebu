import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const [reportPath, budgetsPath] = process.argv.slice(2);
if (!reportPath || !budgetsPath) throw new Error("Usage: node scripts/check-kcd-browser-perf.mjs REPORT_JSON BUDGETS_JSON");
const report = JSON.parse(readFileSync(reportPath, "utf8"));
const budgets = JSON.parse(readFileSync(budgetsPath, "utf8"));
assert.equal(report.results.length, 9, "All three devices at all three sizes are required");
const seen = new Set();
for (const row of report.results) {
  assert.ok(["desktop", "tablet", "mobile"].includes(row.device));
  assert.ok([100, 500, 2000].includes(row.nodes));
  const key = `${row.device}:${row.nodes}`;
  assert.ok(!seen.has(key), "Duplicate measurement"); seen.add(key);
  assert.equal(row.samplesMs.length, 7);
  assert.ok(row.samplesMs.every((sample) => Number.isFinite(sample) && sample > 0));
  const median = [...row.samplesMs].sort((a, b) => a - b)[3];
  assert.equal(row.medianMs, median);
  const budget = budgets.medianMsByNodes[String(row.nodes)];
  assert.ok(Number.isFinite(budget) && budget > 0);
  assert.ok(median <= budget, `${key}: ${median.toFixed(1)} ms exceeds ${budget} ms local budget`);
  console.log(`${key}: ${median.toFixed(1)} ms <= ${budget} ms`);
}
console.log("9/9 controlled-authority local browser budgets passed; authenticated QA performance remains separate.");
