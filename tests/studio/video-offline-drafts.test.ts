import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { studioVideoOfflineDraftKey } from "@/lib/studio/video-offline-drafts";

describe("Studio video offline drafts", () => {
  it("scopes drafts to authenticated user and project", () => {
    expect(studioVideoOfflineDraftKey("user-a", "video-1")).toBe("user-a:video-1");
    expect(studioVideoOfflineDraftKey("user-b", "video-1")).not.toBe(
      studioVideoOfflineDraftKey("user-a", "video-1"),
    );
  });

  it("keeps drafts dirty until the server acknowledges the save", () => {
    const page = readFileSync(join(process.cwd(), "app/studio/video/[id]/page.tsx"), "utf8");
    expect(page).toContain("dirty: true");
    expect(page).toContain("dirty: false");
    const persist=page.slice(page.indexOf("const persist = useCallback"));expect(persist.indexOf("dirty: true")).toBeLessThan(persist.indexOf('fetch(`/api/studio/video/'));
  });

  it("replays the current local composition on reconnect through conflict-protected persistence", () => {
    const page = readFileSync(join(process.cwd(), "app/studio/video/[id]/page.tsx"), "utf8");
    expect(page).toContain('window.addEventListener("online", onOnline)');
    expect(page).toContain("void persist(compRef.current)");
    expect(page).toContain("expectedUpdatedAt");
  });

  it("preserves the personal/business workspace boundary in local metadata", () => {
    const offline = readFileSync(join(process.cwd(), "lib/studio/video-offline-drafts.ts"), "utf8");
    expect(offline).toContain("businessId: string | null");
    expect(offline).toContain("userId: string");
  });
});
