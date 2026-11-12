import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { searchStudioElements } from "@/lib/studio/elements-pack";

describe("Studio themes, elements and media depth", () => {
  it("supports searchable categorized offline-safe elements", () => {
    expect(searchStudioElements("video", "social").some((item) => item.id === "icon-play")).toBe(true);
    expect(searchStudioElements("", "business").length).toBeGreaterThan(0);
    expect(searchStudioElements("does-not-exist")).toEqual([]);
  });
  it("persists audio alongside image and video uploads", () => {
    const source = readFileSync(join(process.cwd(), "app/api/studio/upload/route.ts"), "utf8");
    expect(source).toContain('kind === "audio"');
    expect(source).toContain("business_id: uploadBusinessId");
  });
  it("gives the editor searchable Elements and reusable workspace Uploads", () => {
    const source = readFileSync(join(process.cwd(), "app/components/studio/studio-canvas-editor.tsx"), "utf8");
    expect(source).toContain('placeholder="Search elements"');
    expect(source).toContain("searchStudioElements(elementQuery,elementCategory)");
    expect(source).toContain("designId={designId}");
  });
  it("gives uploads search, filtering and direct upload workflow", () => {
    const source = readFileSync(join(process.cwd(), "app/components/studio/studio-uploads-library.tsx"), "utf8");
    expect(source).toContain('placeholder="Search uploads"');
    expect(source).toContain('["all","image","video","audio"]');
    expect(source).toContain('fetch("/api/studio/upload"');
  });
});
