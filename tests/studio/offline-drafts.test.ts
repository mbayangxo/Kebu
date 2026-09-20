import { describe, expect, it } from "vitest";
import { studioOfflineDraftKey } from "@/lib/studio/offline-drafts";

describe("Studio offline drafts", () => {
  it("scopes local drafts to both user and design", () => {
    expect(studioOfflineDraftKey("user-a", "design-1")).toBe("user-a:design-1");
    expect(studioOfflineDraftKey("user-b", "design-1")).not.toBe(studioOfflineDraftKey("user-a", "design-1"));
  });
});
