import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("Studio workspace depth", () => {
  it("scopes design and video lists to the active Personal or Business Kebu", () => {
    const home = readFileSync(join(root, "app/studio/page.tsx"), "utf8");
    expect(home).toContain("loadActiveWorkspaceScope");
    expect(home).toContain('ownedDesignQuery.eq("business_id", workspace.activeBusinessId)');
    expect(home).toContain('ownedDesignQuery.is("business_id", null)');
    expect(home).toContain('videoQuery.eq("business_id", workspace.activeBusinessId)');
    expect(home).toContain('videoQuery.is("business_id", null)');
    expect(home).toContain('sharedQuery.eq("business_id", workspace.activeBusinessId)');
  });

  it("keeps optimistic concurrency and explicit conflict resolution in the video editor", () => {
    const editor = readFileSync(join(root, "app/studio/video/[id]/page.tsx"), "utf8");
    expect(editor).toContain("studio_video_version_conflict");
    expect(editor).toContain("useServerConflictVersion");
    expect(editor).toContain("keepLocalConflictVersion");
    expect(editor).toContain("expectedUpdatedAt: conflictServer.updatedAt");
  });

  it("bounds per-project offline media instead of allowing unbounded cache growth", () => {
    const offline = readFileSync(join(root, "lib/studio/video-offline-drafts.ts"), "utf8");
    expect(offline).toContain("pruneStudioVideoMediaCache");
    expect(offline).toContain("150 * 1024 * 1024");
    expect(offline).toContain("Oldest media is pruned first");
  });
});
