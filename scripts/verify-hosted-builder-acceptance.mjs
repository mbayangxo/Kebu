/** Strict opt-in QA acceptance. Never provision fixtures or mutate production. */
import { execFileSync, spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = process.env.KEBU_HOSTED_ACCEPTANCE_REPORT_DIR || mkdtempSync(join(tmpdir(), "kebu-hosted-acceptance-"));
mkdirSync(output, { recursive: true });
function blocked(details) {
  const summary = { scope: "authenticated-builder-staging", status: "blocked", accepted: false, expectedCases: 26, ...details };
  writeFileSync(join(output, "summary.json"), JSON.stringify(summary, null, 2) + "\n");
  console.error(JSON.stringify(summary));
  process.exit(1);
}
const required = ["KEBU_E2E_BASE_URL", "KEBU_HOSTED_QA_ORIGIN", "KEBU_E2E_BUILDER_COOKIE", "KEBU_E2E_PROJECT_ID"];
const missing = required.filter(name => !process.env[name]?.trim());
if (missing.length || process.env.KEBU_E2E_DISPOSABLE_PROJECT !== "1") {
  blocked({ missing, disposableStagingProjectConfirmed: process.env.KEBU_E2E_DISPOSABLE_PROJECT === "1" });
}
let originApproved = false;
try {
  const target = new URL(process.env.KEBU_E2E_BASE_URL), approved = new URL(process.env.KEBU_HOSTED_QA_ORIGIN);
  originApproved = target.origin === approved.origin && [target, approved].every(url => !url.username && !url.password && !url.search && !url.hash && url.pathname === "/"
    && (url.protocol === "https:" || (url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))));
} catch { /* Refuse malformed destinations without printing supplied values. */ }
if (!originApproved) blocked({ reason: "Deployment origin does not match the explicitly approved QA origin." });
const sourceCommit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
const dirty = execFileSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8" }).trim();
if (dirty || (process.env.KEBU_HOSTED_SOURCE_SHA && process.env.KEBU_HOSTED_SOURCE_SHA !== sourceCommit)) {
  blocked({ reason: "QA source must be clean and match the reviewed deployment commit." });
}

const resultFile = join(output, "results.json");
const child = spawn(process.execPath, [join(root, "node_modules/playwright/cli.js"), "test",
  "tests/create/e2e-builder-full-journey.spec.ts", "tests/create/e2e-builder-route.spec.ts",
  "--grep", "full authenticated Builder journey|authenticated canvas, measured panel",
  "--workers=1", "--retries=0", "--reporter=json", `--output=${join(output, "test-output")}`], {
  cwd: root,
  stdio: ["ignore", "inherit", "inherit"],
  env: { ...process.env, KEBU_REQUIRE_HOSTED_BUILDER_ACCEPTANCE: "1", PLAYWRIGHT_JSON_OUTPUT_FILE: resultFile },
});
const interrupt = () => child.kill("SIGTERM");
process.once("SIGINT", interrupt); process.once("SIGTERM", interrupt);
const code = await new Promise((done, fail) => { child.once("error", fail); child.once("exit", done); });
let stats;
try { stats = JSON.parse(readFileSync(resultFile, "utf8")).stats; } catch { stats = null; }
const accepted = code === 0 && stats?.expected === 26 && stats.skipped === 0 && stats.unexpected === 0 && stats.flaky === 0;
const summary = { scope: "authenticated-builder-staging", sourceCommit, accepted, expectedCases: 26, stats, exitCode: code,
  note: "A pass certifies only these executed Builder cases; other products, May/provider acceptance and production promotion require separate evidence." };
writeFileSync(join(output, "summary.json"), JSON.stringify(summary, null, 2) + "\n");
console.log(JSON.stringify(summary));
process.exitCode = accepted ? 0 : 1;
