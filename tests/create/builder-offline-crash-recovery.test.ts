import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OfflineQueueItem } from "@/lib/create/offline-queue";

describe("Builder offline queue crash recovery", () => {
  beforeEach(() => {
    vi.resetModules();
    const store = new Map<string, string>();
    Object.defineProperty(globalThis, "window", {
      value: {
        localStorage: {
          getItem: (key: string) => store.get(key) ?? null,
          setItem: (key: string, value: string) => store.set(key, value),
        },
        dispatchEvent: () => true,
      },
      configurable: true,
    });
    Object.defineProperty(globalThis, "navigator", { value: { onLine: false }, configurable: true });
  });

  it("recovers a persisted syncing section edit as queued after reload", async () => {
    const q = await import("@/lib/create/offline-queue");
    window.localStorage.setItem(
      q.OFFLINE_QUEUE_KEY,
      JSON.stringify([{
        id: "old",
        kind: "save_section",
        createdAt: new Date().toISOString(),
        status: "syncing",
        payload: { projectId: "p1", sectionId: "s1", props: { title: "latest" } },
      }]),
    );
    expect(q.listOfflineQueue()).toMatchObject([
      { kind: "save_section", status: "queued", payload: { props: { title: "latest" } } },
    ]);
  });

  it("coalesces a newer edit even when the older copy was syncing", async () => {
    const q = await import("@/lib/create/offline-queue");
    window.localStorage.setItem(
      q.OFFLINE_QUEUE_KEY,
      JSON.stringify([{
        id: "old",
        kind: "save_section",
        createdAt: new Date().toISOString(),
        status: "syncing",
        payload: { projectId: "p1", sectionId: "s1", props: { title: "old" } },
      }]),
    );
    q.enqueueSaveSection({ projectId: "p1", sectionId: "s1", props: { title: "new" } });
    const items = q.listOfflineQueue();
    expect(items).toHaveLength(1);
    const item = items[0] as Extract<OfflineQueueItem, { kind: "save_section" }>;
    expect(item.payload.props.title).toBe("new");
  });
});
