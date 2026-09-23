import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Builder section mutation reliability contract", () => {
  const source = readFileSync(join(process.cwd(), "app/create/[id]/page.tsx"), "utf8");

  it("never injects May Lecor navigation into a generic new site", () => {
    expect(source).not.toContain("defaultMaylecorNavLinks");
    expect(source).toContain(': [{ label: "Home", href: "/" }]');
  });

  it("duplicates a section directly after its source instead of silently appending it", () => {
    expect(source).toContain("await addSection(source.section_type, { ...source.props }, source.id)");
  });

  it("reconciles section order from the server after reorder failures", () => {
    expect(source).toContain("Kebu restored the last saved order.");
    expect(source).toContain("finally {");
    expect(source).toContain("await load();");
  });
});
