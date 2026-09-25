// Loads .env.test.local into process.env for QA harness tests.
// This runs in each vitest worker so the harness constants (evaluated at
// module-load time) see the QA credentials without relying on shell exports.
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const envFile = resolve(process.cwd(), ".env.test.local");
if (existsSync(envFile)) {
  const content = readFileSync(envFile, "utf-8");
  let loaded = 0;
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    // Don't overwrite non-empty shell exports, but do fill in missing/empty ones
    if (!process.env[key]) {
      process.env[key] = value;
    }
    loaded++;
  }
  // Debug: confirm what was loaded (values hidden)
  const keys = ["SUPABASE_QA_DESIGNATED", "SUPABASE_QA_URL", "SUPABASE_QA_ANON_KEY", "SUPABASE_QA_SERVICE_ROLE_KEY"];
  console.log(`[load-qa-env] loaded ${loaded} vars from ${envFile}`);
  for (const k of keys) {
    console.log(`[load-qa-env] ${k}=${process.env[k] ? `<set, len=${process.env[k]!.length}>` : "<MISSING>"}`);
  }
} else {
  console.warn(`[load-qa-env] WARNING: ${envFile} not found — QA tests will be skipped`);
}
