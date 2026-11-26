import { describe, expect, it } from "vitest";
import { benchmarkSourceHash, evaluate3jGate, requiredGates } from "../../scripts/check-3j-gate.mjs";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
const outputHash = "a".repeat(64);
const report = () => ({ version: 1, sourceHash: "current", gates: Object.fromEntries(requiredGates.map(name => [name, { status: "pass", evidence: "Recorded verification", ...(name === "realProvider" ? { provenance: "real-provider", inputTokens: 10, outputTokens: 20, outputHash } : {}), ...(name === "visualQuality" ? { reviewMethod: "visual-inspection", reviewedOutputHash: outputHash } : {}) }])) });
describe("3J completion gate", () => {
  it("requires every independent stage", () => {
    for (const name of requiredGates) { const value = report(); delete value.gates[name]; expect(evaluate3jGate(value, "current").status).toBe("blocked"); }
  });
  it("rejects stale evidence, fixture provenance and absent provider usage", () => {
    expect(evaluate3jGate(report(), "new source").status).toBe("blocked");
    const value = report(); Object.assign(value.gates.realProvider, { provenance: "manual-native-reference", inputTokens: 0 });
    expect(evaluate3jGate(value, "current").status).toBe("blocked");
  });
  it("does not accept automated tests as visual sign-off", () => {
    const value = report(); Object.assign(value.gates.visualQuality, { reviewMethod: "automated-tests" });
    expect(evaluate3jGate(value, "current").status).toBe("blocked");
    expect(evaluate3jGate(report(), "current").status).toBe("pass");
  });
  it("requires visual review of the exact generated output", () => {
    const value = report(); Object.assign(value.gates.visualQuality, { reviewedOutputHash: "b".repeat(64) });
    expect(evaluate3jGate(value, "current").status).toBe("blocked");
  });
  it("invalidates evidence when renderer styling, dependency versions or approved image bytes change", () => {
    const root = mkdtempSync(join(tmpdir(), "kebu-3j-source-"));
    const write = (path: string, content: string) => { mkdirSync(dirname(join(root, path)), { recursive: true }); writeFileSync(join(root, path), content); };
    try {
      for (const directory of ["lib", "app", "supabase/migrations", "tests/creative-core"]) write(`${directory}/source.ts`, "original source");
      for (const path of ["package.json", "package-lock.json", "playwright.config.ts", "vitest.config.ts", "next.config.ts", "middleware.ts", "docs/decisions/3J-real-content-blueprint.md", "scripts/check-3j-gate.mjs", "scripts/run-kcd-native-local-ui.mjs", "scripts/run-local-postgres-tests.mjs", ...["may-figure.png", "city-skyline.png", "portrait.jpg", "logo-stacked.png"].map(name => `public/templates/maylecor/${name}`)]) write(path, "original content");
      write("app/globals.css", "original content");
      const original = benchmarkSourceHash(root);
      for (const path of ["app/globals.css", "package-lock.json", "public/templates/maylecor/portrait.jpg"]) {
        write(path, "changed content"); expect(benchmarkSourceHash(root)).not.toBe(original);
        write(path, "original content"); expect(benchmarkSourceHash(root)).toBe(original);
      }
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
});
