import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Studio variants and creation mutation security", () => {
  it("creates variants as new persisted editable designs without mutating the source", () => {
    const source = readFileSync(join(process.cwd(), "app/studio/[id]/page.tsx"), "utf8");
    expect(source).toContain("resizeCanvasDocument(doc, { designType })");
    expect(source).toContain('fetch("/api/create/designs"');
    expect(source).toContain('aria-label="Create editable size variant"');
  });

  for (const route of ["app/api/create/designs/route.ts", "app/api/studio/video/route.ts"]) {
    it(route + " validates mutation origin", () => {
      const source = readFileSync(join(process.cwd(), route), "utf8");
      expect(source).toContain("assertSameOriginMutation(req)");
    });
  }
});
