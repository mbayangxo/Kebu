/**
 * S1 gate — the Creative Core stays renderer- and host-agnostic (3C DESIGN FREEZE §13):
 * lib/creative-core imports only `zod` and its own modules. No React, Next.js, Supabase, DOM,
 * Node built-ins or lib/create; no dynamic imports or require; no host globals.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "../../lib/creative-core");

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return sources(p);
    return /\.(ts|tsx|js|mjs|cjs)$/.test(e.name) ? [p] : [];
  });
}

/** Strip comments so prose can mention anything. */
function code(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
}

const FILES = sources(ROOT);
const ALLOWED = (spec: string) => spec === "zod" || /^\.\/[a-z-]+$/.test(spec);

describe("creative-core import boundary", () => {
  it("has source files to check", () => {
    expect(FILES.length).toBeGreaterThanOrEqual(10);
    expect(FILES.every((f) => f.endsWith(".ts"))).toBe(true);
  });

  it.each(FILES.map((f) => [relative(ROOT, f), f]))("%s imports only zod and sibling modules", (_name, file) => {
    const text = code(readFileSync(file, "utf8"));
    const specs = [...text.matchAll(/\b(?:import|export)\s[^;]*?\bfrom\s*["']([^"']+)["']/g), ...text.matchAll(/\bimport\s*["']([^"']+)["']/g)].map((m) => m[1]);
    expect(specs.filter((s) => !ALLOWED(s))).toEqual([]);
    expect(text).not.toMatch(/\brequire\s*\(/);
    expect(text).not.toMatch(/\bimport\s*\(/);
  });

  it.each(FILES.map((f) => [relative(ROOT, f), f]))("%s uses no host globals", (_name, file) => {
    const text = code(readFileSync(file, "utf8"));
    for (const pattern of [/\bwindow\b/, /\bdocument\./, /\bprocess\./, /\bfetch\s*\(/, /\blocalStorage\b/, /\bsessionStorage\b/, /\bnavigator\b/, /\bBuffer\b/]) {
      expect(text, `${pattern}`).not.toMatch(pattern);
    }
  });

  it("the boundary check itself catches a forbidden import", () => {
    const sample = code('import { x } from "@/lib/create/website-schema";\nimport React from "react";\n// import "fs" in a comment is fine');
    const specs = [...sample.matchAll(/\b(?:import|export)\s[^;]*?\bfrom\s*["']([^"']+)["']/g)].map((m) => m[1]);
    expect(specs.filter((s) => !ALLOWED(s))).toEqual(["@/lib/create/website-schema", "react"]);
  });
});
