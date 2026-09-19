#!/usr/bin/env node
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const scripts = Object.entries(pkg.scripts ?? {});
const unsafe = scripts.filter(([, command]) => /APPLY_[A-Z0-9_]+\.sql|apply-business-migrations/i.test(String(command)));

if (unsafe.length) {
  console.error("Migration hygiene failed: package scripts must not execute historical APPLY_*.sql bundles.");
  for (const [name, command] of unsafe) console.error(`- ${name}: ${command}`);
  process.exit(1);
}

console.log("Migration hygiene OK: no package script executes historical APPLY_*.sql bundles.");
