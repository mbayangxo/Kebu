import { afterEach, describe, expect, it, vi } from "vitest";
import { reconcilePageNavigation } from "@/lib/create/kcd-page-navigation";
const queue = vi.hoisted(() => vi.fn());
vi.mock("@/lib/create/offline-queue", () => ({ enqueueSyncNav: queue }));
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });
describe("page navigation reconciliation", () => {
  it("loads canonical source chrome only after successful navigation sync", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(new Response('{"ok":true}')).mockResolvedValueOnce(new Response('{"siteChrome":{"enabled":false}}'));
    vi.stubGlobal("fetch", fetcher);
    expect(await reconcilePageNavigation("project")).toEqual({ enabled: false });
    expect(fetcher.mock.calls.map(([url]) => url)).toEqual(["/api/projects/project/site-chrome/sync-nav", "/api/projects/project/site-chrome"]);
    expect(queue).not.toHaveBeenCalled();
  });
  it("queues failed sync and reports that the page save did not save navigation", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response('{}', { status: 500 })));
    await expect(reconcilePageNavigation("project")).rejects.toThrow(/Page saved, but navigation still needs synchronization/);
    expect(queue).toHaveBeenCalledWith({ projectId: "project" });
  });
  it("reports queue exhaustion rather than hiding the failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    queue.mockImplementationOnce(() => { throw new Error("full"); });
    await expect(reconcilePageNavigation("project")).rejects.toThrow(/could not be synchronized or queued/);
  });
  it("treats malformed source chrome as unconfirmed", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response('{}')).mockResolvedValueOnce(new Response('{"siteChrome":{"header":{"type":"wrong"}}}')));
    await expect(reconcilePageNavigation("project")).rejects.toThrow(/needs synchronization/);
    expect(queue).toHaveBeenCalledOnce();
  });
});
