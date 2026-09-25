// Loads .env.test.local into process.env for QA harness tests.
// This runs in each vitest worker so the harness constants (evaluated at
// module-load time) see the QA credentials without relying on shell exports.
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const envFile = resolve(process.cwd(), ".env.test.local");
if (existsSync(envFile)) {
  const content = readFileSync(envFile, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    // Don't overwrite vars already set by the shell
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}
