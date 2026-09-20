import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Studio product UI", () => {
  it("keeps discovery, creation, brand, campaigns and library in the Studio home", () => {
    const source = readFileSync(join(process.cwd(), "app/studio/page.tsx"), "utf8");
    for (const label of ["What will you create today?", "Start creating", "Continue creating", "Studio spaces", "Brand-aware creation", "Your Studio"]) expect(source).toContain(label);
    expect(source).toContain("/studio/templates");
    expect(source).toContain("/studio/brand");
    expect(source).toContain("/studio/campaigns");
    expect(source).toContain("/studio/video/new");
  });
  it("uses a compact non-wrapping editor command surface", () => {
    const page = readFileSync(join(process.cwd(), "app/studio/[id]/page.tsx"), "utf8");
    const canvas = readFileSync(join(process.cwd(), "app/components/studio/studio-canvas-editor.tsx"), "utf8");
    expect(page).toContain("overflow-x-auto whitespace-nowrap");
    expect(canvas).toContain("overflow-x-auto whitespace-nowrap");
    expect(canvas).toContain('w-[240px]');
  });
});
