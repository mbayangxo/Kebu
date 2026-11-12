import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Studio video persistence safety", () => {
  it("guards video saves with optimistic concurrency", () => {
    const api = readFileSync(join(process.cwd(), "app/api/studio/video/[id]/route.ts"), "utf8");
    expect(api).toContain("expectedUpdatedAt");
    expect(api).toContain("studio_video_version_conflict");
    expect(api).toContain("updated_at");
  });

  it("never labels an unsynced video edit as saved", () => {
    const page = readFileSync(join(process.cwd(), "app/studio/video/[id]/page.tsx"), "utf8");
    expect(page).toContain('setSaveState("offline")');
    expect(page).toContain("Offline — changes not synced");
    expect(page).toContain("Sync conflict — choose a version");
    expect(page).toContain("expectedUpdatedAt");
  });
});
