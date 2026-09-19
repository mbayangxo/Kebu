#!/usr/bin/env node
import { readFileSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";

const root = new URL("../", import.meta.url);
const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const scripts = Object.entries(pkg.scripts ?? {});
const unsafeScripts = scripts.filter(([, command]) => /APPLY_[A-Z0-9_]+\.sql|apply-business-migrations/i.test(String(command)));

const canonicalDir = new URL("../supabase/migrations/", import.meta.url);
const entries = readdirSync(canonicalDir, { withFileTypes: true });
const nonCanonical = entries
  .filter((entry) => entry.isFile() && /^(APPLY_|FIX_|VERIFY_)/i.test(entry.name))
  .map((entry) => entry.name);

const timestamped = entries
  .filter((entry) => entry.isFile() && /^\d{14}_[a-z0-9_]+\.sql$/i.test(entry.name))
  .map((entry) => entry.name);
const duplicateVersions = Object.entries(
  timestamped.reduce((acc, name) => {
    const version = name.slice(0, 14);
    acc[version] = [...(acc[version] ?? []), name];
    return acc;
  }, {}),
).filter(([, names]) => names.length > 1);

let failed = false;
if (unsafeScripts.length) {
  failed = true;
  console.error("Migration hygiene failed: package scripts must not execute historical APPLY_*.sql bundles.");
  for (const [name, command] of unsafeScripts) console.error(`- ${name}: ${command}`);
}
if (duplicateVersions.length) {
  failed = true;
  console.error("Migration hygiene failed: duplicate canonical timestamp versions.");
  for (const [version, names] of duplicateVersions) console.error(`- ${version}: ${names.join(", ")}`);
}

if (nonCanonical.length) {
  console.warn("Migration hygiene warning: legacy manual SQL remains in supabase/migrations and must not be applied automatically:");
  for (const name of nonCanonical) console.warn(`- ${basename(join("supabase/migrations", name))}`);
}

if (failed) process.exit(1);
console.log(`Migration hygiene OK: ${timestamped.length} timestamped canonical migrations; legacy bundles are quarantined from package scripts.`);
