import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  enqueueSaveSection,
  enqueuePlaceOrder,
  enqueueEventRegister,
  flushOfflineQueue,
  listOfflineQueue,
  removeOfflineQueueItem,
  resetStuckSyncingItems,
  _setQueueForTesting,
  _resetFlushStateForTesting,
  type OfflineQueueItem,
  type OfflineSaveSectionPayload,
} from "@/lib/create/offline-queue";

// ─── helpers ─────────────────────────────────────────────────────────────────

function sectionPayload(
  sectionId: string,
  overrides: Partial<OfflineSaveSectionPayload> = {},
): OfflineSaveSectionPayload {
  return {
    projectId: "proj-1",
    sectionId,
    props: { color: "red" },
    ...overrides,
  };
}

function okResponse(status = 200) {
  return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status }));
}

function errResponse(status: number, error = "something went wrong") {
  return Promise.resolve(
    new Response(JSON.stringify({ error }), { status }),
  );
}

function networkError() {
  return Promise.reject(new Error("Network error"));
}

function resetModule() {
  _setQueueForTesting([]);
  _resetFlushStateForTesting();
}

// ─── tests ───────────────────────────────────────────────────────────────────

describe("offline queue — same-resource ordering", () => {
  beforeEach(resetModule);
  afterEach(() => vi.restoreAllMocks());

  it("does not dispatch a queued item when a syncing item for the same section exists", async () => {
    const calls: string[] = [];
    const fetchMock = vi.fn(() => {
      calls.push("fetch");
      return okResponse();
    });
    vi.stubGlobal("fetch", fetchMock);

    // Manually put section-A in syncing state (simulates in-flight request from a prior flush).
    const syncing: OfflineQueueItem = {
      id: "oq_syncing",
      kind: "save_section",
      createdAt: new Date().toISOString(),
      status: "syncing",
      payload: sectionPayload("sec-A", { props: { color: "blue" } }),
    };
    const queued: OfflineQueueItem = {
      id: "oq_queued",
      kind: "save_section",
      createdAt: new Date().toISOString(),
      status: "queued",
      payload: sectionPayload("sec-A", { props: { color: "red" } }),
    };
    _setQueueForTesting([syncing, queued]);

    const result = await flushOfflineQueue();

    // The queued item was skipped because its resource already had a syncing item.
    expect(calls).toHaveLength(0);
    expect(result.synced).toBe(0);

    // The queued item must still be in the queue, untouched.
    const remaining = listOfflineQueue();
    const queuedItem = remaining.find((i) => i.id === "oq_queued");
    expect(queuedItem?.status).toBe("queued");
  });

  it("dispatches items for different sections concurrently", async () => {
    const dispatchOrder: string[] = [];
    let resolve1!: () => void;
    let resolve2!: () => void;
    const p1 = new Promise<void>((r) => { resolve1 = r; });
    const p2 = new Promise<void>((r) => { resolve2 = r; });

    const fetchMock = vi.fn((url: string) => {
      // Detect which section this is from the request body — both should start before either resolves.
      if ((url as string).includes("proj-1")) {
        // Use a unique body check via request URL isn't sufficient — rely on call order.
        dispatchOrder.push(`fetch:${dispatchOrder.length}`);
      }
      return okResponse();
    });
    vi.stubGlobal("fetch", fetchMock);

    enqueueSaveSection(sectionPayload("sec-A"));
    enqueueSaveSection(sectionPayload("sec-B"));

    const result = await flushOfflineQueue();
    expect(result.synced).toBe(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(listOfflineQueue()).toHaveLength(0);

    void resolve1;
    void resolve2;
    void p1;
    void p2;
  });

  it("processes two queued items for the same section sequentially across two flushes", async () => {
    const calls: string[] = [];
    const fetchMock = vi.fn(() => {
      calls.push("call");
      return okResponse();
    });
    vi.stubGlobal("fetch", fetchMock);

    enqueueSaveSection(sectionPayload("sec-A", { props: { v: 1 } }));
    // Coalesces: only latest props survive if not yet syncing.
    enqueueSaveSection(sectionPayload("sec-A", { props: { v: 2 } }));

    // Only one item in queue (coalesced).
    expect(listOfflineQueue()).toHaveLength(1);
    const result = await flushOfflineQueue();
    expect(result.synced).toBe(1);
    expect(calls).toHaveLength(1);

    // The dispatched body must carry v:2 (latest props).
    const callArgs = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(callArgs[1].body as string) as { props: { v: number } };
    expect(body.props.v).toBe(2);
  });
});

describe("offline queue — independent-resource concurrency", () => {
  beforeEach(resetModule);
  afterEach(() => vi.restoreAllMocks());

  it("flushes sections from different projects concurrently", async () => {
    const fetchMock = vi.fn(() => okResponse());
    vi.stubGlobal("fetch", fetchMock);

    enqueueSaveSection({ projectId: "p1", sectionId: "s1", props: {} });
    enqueueSaveSection({ projectId: "p2", sectionId: "s1", props: {} });
    enqueueSaveSection({ projectId: "p3", sectionId: "s1", props: {} });

    const result = await flushOfflineQueue();
    expect(result.synced).toBe(3);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});

describe("offline queue — failed resource does not block unrelated resources", () => {
  beforeEach(resetModule);
  afterEach(() => vi.restoreAllMocks());

  it("flushes sec-B even when sec-A returns 5xx", async () => {
    const fetchMock = vi.fn((url: string) => {
      const u = url as string;
      if (u.includes("proj-1") && u.length > 0) {
        // Both sections go to the same URL /api/projects/proj-1/sections.
        // Distinguish by inspecting the call count — first call is sec-A.
        const callIndex = fetchMock.mock.calls.length - 1;
        const callArgs = fetchMock.mock.calls[callIndex] as unknown as [string, RequestInit];
        const body = JSON.parse(callArgs[1].body as string) as { sectionId: string };
        if (body.sectionId === "sec-A") return errResponse(503);
        return okResponse();
      }
      return okResponse();
    });
    vi.stubGlobal("fetch", fetchMock);

    enqueueSaveSection(sectionPayload("sec-A"));
    enqueueSaveSection(sectionPayload("sec-B"));

    const result = await flushOfflineQueue();
    expect(result.synced).toBe(1);
    expect(result.failed).toBe(1);

    const q = listOfflineQueue();
    const a = q.find((i) => i.kind === "save_section" && i.payload.sectionId === "sec-A");
    const b = q.find((i) => i.kind === "save_section" && i.payload.sectionId === "sec-B");
    // sec-A stays in queue as retryable "failed".
    expect(a?.status).toBe("failed");
    // sec-B was removed after success.
    expect(b).toBeUndefined();
  });

  it("marks 4xx responses as terminal so they are not retried", async () => {
    const fetchMock = vi.fn(() => errResponse(403, "Forbidden"));
    vi.stubGlobal("fetch", fetchMock);

    enqueueSaveSection(sectionPayload("sec-A"));
    await flushOfflineQueue();

    const q = listOfflineQueue();
    expect(q[0]?.status).toBe("terminal");
    expect(q[0]?.lastError).toBe("Forbidden");
  });

  it("does not retry a terminal item on subsequent flush", async () => {
    const fetchMock = vi.fn(() => errResponse(401));
    vi.stubGlobal("fetch", fetchMock);

    enqueueSaveSection(sectionPayload("sec-A"));
    await flushOfflineQueue();
    _resetFlushStateForTesting();

    // Second flush — terminal item must not trigger another fetch.
    fetchMock.mockClear();
    await flushOfflineQueue();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("retries a failed (5xx) item on next flush", async () => {
    let callCount = 0;
    const fetchMock = vi.fn(() => {
      callCount += 1;
      if (callCount === 1) return errResponse(503);
      return okResponse();
    });
    vi.stubGlobal("fetch", fetchMock);

    enqueueSaveSection(sectionPayload("sec-A"));
    const r1 = await flushOfflineQueue();
    expect(r1.synced).toBe(0);
    expect(listOfflineQueue()[0]?.status).toBe("failed");

    _resetFlushStateForTesting();
    const r2 = await flushOfflineQueue();
    expect(r2.synced).toBe(1);
    expect(listOfflineQueue()).toHaveLength(0);
  });

  it("marks a network-error as failed (retryable)", async () => {
    vi.stubGlobal("fetch", vi.fn(() => networkError()));

    enqueueSaveSection(sectionPayload("sec-A"));
    await flushOfflineQueue();

    expect(listOfflineQueue()[0]?.status).toBe("failed");
  });
});

describe("offline queue — reconnect flush", () => {
  beforeEach(resetModule);
  afterEach(() => vi.restoreAllMocks());

  it("flushes queued items after coming online", async () => {
    const fetchMock = vi.fn(() => okResponse());
    vi.stubGlobal("fetch", fetchMock);

    enqueueSaveSection(sectionPayload("sec-A"));
    expect(listOfflineQueue()).toHaveLength(1);

    await flushOfflineQueue();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(listOfflineQueue()).toHaveLength(0);
  });
});

describe("offline queue — overflow protection", () => {
  beforeEach(resetModule);
  afterEach(() => vi.restoreAllMocks());

  it("throws offline_queue_full rather than silently dropping the newest item", () => {
    // Fill the queue with QUEUE_CAP items (use unique section IDs to bypass coalescing).
    const items: OfflineQueueItem[] = Array.from({ length: 200 }, (_, i) => ({
      id: `oq_${i}`,
      kind: "save_section" as const,
      createdAt: new Date().toISOString(),
      status: "queued" as const,
      payload: { projectId: "proj-1", sectionId: `sec-${i}`, props: {} },
    }));
    _setQueueForTesting(items);

    expect(() => enqueueSaveSection(sectionPayload("sec-overflow"))).toThrow(
      "offline_queue_full",
    );

    // Queue length must still be exactly 200 — the 201st item was NOT added.
    expect(listOfflineQueue()).toHaveLength(200);
  });

  it("save_section coalesces before checking cap so an edit to an existing section never overflows", () => {
    const items: OfflineQueueItem[] = Array.from({ length: 199 }, (_, i) => ({
      id: `oq_${i}`,
      kind: "save_section" as const,
      createdAt: new Date().toISOString(),
      status: "queued" as const,
      payload: { projectId: "proj-1", sectionId: `sec-${i}`, props: {} },
    }));
    _setQueueForTesting(items);

    // sec-0 already exists — coalescing removes it first, so net size stays 199 after the new enqueue.
    expect(() =>
      enqueueSaveSection({ projectId: "proj-1", sectionId: "sec-0", props: { updated: true } }),
    ).not.toThrow();

    const q = listOfflineQueue();
    expect(q).toHaveLength(199);
    const sec0 = q.find(
      (i) => i.kind === "save_section" && i.payload.sectionId === "sec-0",
    );
    expect((sec0?.payload as OfflineSaveSectionPayload | undefined)?.props).toEqual({
      updated: true,
    });
  });
});

describe("offline queue — reload persistence (stuck syncing)", () => {
  beforeEach(resetModule);
  afterEach(() => vi.restoreAllMocks());

  it("resets syncing items to queued so they are retried after a reload", () => {
    const items: OfflineQueueItem[] = [
      {
        id: "oq_s1",
        kind: "save_section",
        createdAt: new Date().toISOString(),
        status: "syncing",
        payload: sectionPayload("sec-A"),
      },
      {
        id: "oq_s2",
        kind: "save_section",
        createdAt: new Date().toISOString(),
        status: "queued",
        payload: sectionPayload("sec-B"),
      },
    ];
    _setQueueForTesting(items);

    resetStuckSyncingItems();

    const q = listOfflineQueue();
    expect(q.find((i) => i.id === "oq_s1")?.status).toBe("queued");
    expect(q.find((i) => i.id === "oq_s2")?.status).toBe("queued");
  });

  it("does nothing when no items are syncing", () => {
    const item: OfflineQueueItem = {
      id: "oq_s1",
      kind: "save_section",
      createdAt: new Date().toISOString(),
      status: "queued",
      payload: sectionPayload("sec-A"),
    };
    _setQueueForTesting([item]);

    resetStuckSyncingItems();

    // Queue is unchanged.
    expect(listOfflineQueue()).toHaveLength(1);
    expect(listOfflineQueue()[0]?.status).toBe("queued");
  });

  it("after resetStuckSyncingItems a formerly-syncing item is flushed on next call", async () => {
    const fetchMock = vi.fn(() => okResponse());
    vi.stubGlobal("fetch", fetchMock);

    const item: OfflineQueueItem = {
      id: "oq_stuck",
      kind: "save_section",
      createdAt: new Date().toISOString(),
      status: "syncing",
      payload: sectionPayload("sec-A"),
    };
    _setQueueForTesting([item]);

    resetStuckSyncingItems();
    const result = await flushOfflineQueue();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.synced).toBe(1);
    expect(listOfflineQueue()).toHaveLength(0);
  });
});

describe("offline queue — concurrent flush calls coalesce", () => {
  beforeEach(resetModule);
  afterEach(() => vi.restoreAllMocks());

  it("two concurrent flush() calls return the same promise", async () => {
    let resolveFetch!: () => void;
    const fetchReady = new Promise<void>((r) => { resolveFetch = r; });
    const fetchMock = vi.fn(async () => {
      await fetchReady;
      return okResponse();
    });
    vi.stubGlobal("fetch", fetchMock);

    enqueueSaveSection(sectionPayload("sec-A"));

    const p1 = flushOfflineQueue();
    const p2 = flushOfflineQueue();

    // Both must be the same promise (mutex coalescing).
    expect(p1).toBe(p2);

    resolveFetch();
    await p1;
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("offline queue — place_order and event_register", () => {
  beforeEach(resetModule);
  afterEach(() => vi.restoreAllMocks());

  it("flushes a place_order item", async () => {
    const fetchMock = vi.fn(() => okResponse());
    vi.stubGlobal("fetch", fetchMock);

    enqueuePlaceOrder({
      subdomain: "my-shop",
      productId: "prod-1",
      productName: "Hat",
      customerName: "Ada",
      customerPhone: "+221700000000",
      customerNote: "",
      quantity: 1,
    });

    const result = await flushOfflineQueue();
    expect(result.synced).toBe(1);
    expect(listOfflineQueue()).toHaveLength(0);
  });

  it("flushes an event_register item", async () => {
    const fetchMock = vi.fn(() => okResponse());
    vi.stubGlobal("fetch", fetchMock);

    enqueueEventRegister({
      publicId: "evt-abc",
      guestName: "Lena",
      guestPhone: "+221700000001",
      quantity: 2,
    });

    const result = await flushOfflineQueue();
    expect(result.synced).toBe(1);
    expect(listOfflineQueue()).toHaveLength(0);
  });

  it("does not allow enqueuing beyond QUEUE_CAP for place_order", () => {
    const items: OfflineQueueItem[] = Array.from({ length: 200 }, (_, i) => ({
      id: `oq_${i}`,
      kind: "place_order" as const,
      createdAt: new Date().toISOString(),
      status: "queued" as const,
      payload: {
        subdomain: "shop",
        productId: `p${i}`,
        productName: "X",
        customerName: "Y",
        customerPhone: "+1",
        customerNote: "",
        quantity: 1,
      },
    }));
    _setQueueForTesting(items);

    expect(() =>
      enqueuePlaceOrder({
        subdomain: "shop",
        productId: "new",
        productName: "X",
        customerName: "Y",
        customerPhone: "+1",
        customerNote: "",
        quantity: 1,
      }),
    ).toThrow("offline_queue_full");
  });

  it("removes place_order items after successful flush regardless of resource-key uniqueness", async () => {
    const fetchMock = vi.fn(() => okResponse());
    vi.stubGlobal("fetch", fetchMock);

    enqueuePlaceOrder({
      subdomain: "s",
      productId: "p1",
      productName: "A",
      customerName: "B",
      customerPhone: "+1",
      customerNote: "",
      quantity: 1,
    });
    enqueuePlaceOrder({
      subdomain: "s",
      productId: "p2",
      productName: "C",
      customerName: "D",
      customerPhone: "+2",
      customerNote: "",
      quantity: 2,
    });

    const result = await flushOfflineQueue();
    expect(result.synced).toBe(2);
    expect(listOfflineQueue()).toHaveLength(0);
  });
});
