import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  discardQueuedSectionSave,
  discardQueuedSiteChrome,
  enqueueSaveSection,
  enqueueSaveSiteChrome,
  flushOfflineQueue,
  listOfflineQueue,
} from "@/lib/create/offline-queue";

describe("Builder durable offline queue", () => {
  beforeEach(() => {
    for (const item of listOfflineQueue()) {
      if (item.kind === "save_section") discardQueuedSectionSave(item.payload.projectId, item.payload.sectionId);
      if (item.kind === "save_site_chrome") discardQueuedSiteChrome(item.payload.projectId, item.payload.part);
    }
    vi.restoreAllMocks();
  });

  it("coalesces section edits so reconnect only sends the newest snapshot", () => {
    enqueueSaveSection({ projectId: "p1", sectionId: "s1", props: { title: "old" } });
    enqueueSaveSection({ projectId: "p1", sectionId: "s1", props: { title: "new" } });
    const saves = listOfflineQueue().filter((item) => item.kind === "save_section");
    expect(saves).toHaveLength(1);
    expect(saves[0]?.payload.props).toEqual({ title: "new" });
  });

  it("durably queues header/footer edits instead of only changing a status label", () => {
    enqueueSaveSiteChrome({ projectId: "p1", part: "header", props: { brand: "Old" } });
    enqueueSaveSiteChrome({ projectId: "p1", part: "header", props: { brand: "New" } });
    const saves = listOfflineQueue().filter((item) => item.kind === "save_site_chrome");
    expect(saves).toHaveLength(1);
    expect(saves[0]?.payload.props).toEqual({ brand: "New" });
  });

  it("flushes a queued chrome edit to the real site-chrome endpoint and removes it only on success", async () => {
    enqueueSaveSiteChrome({ projectId: "p2", part: "footer", props: { text: "© Kebu" } });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ siteChrome: {} }), { status: 200, headers: { "Content-Type": "application/json" } }),
    );
    const result = await flushOfflineQueue();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/projects/p2/site-chrome",
      expect.objectContaining({ method: "PATCH", credentials: "include" }),
    );
    expect(result.synced).toBeGreaterThanOrEqual(1);
    expect(listOfflineQueue().some((item) => item.kind === "save_site_chrome" && item.payload.projectId === "p2")).toBe(false);
  });
});
