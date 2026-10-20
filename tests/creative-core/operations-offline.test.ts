import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NodeId, Transaction } from "@/lib/creative-core";
import { acquireOperationQueueLease, builderQueueBlocker, enqueueSaveSection, enqueueSaveBatchSections, enqueueSaveSettings, enqueueSaveOperations, flushOfflineQueue, listOfflineQueue, _setQueueForTesting, _resetFlushStateForTesting } from "@/lib/create/offline-queue";
import { uuidFor } from "./helpers";

const id = uuidFor(1, 0x64) as NodeId;
const transaction = (n: number): Transaction => ({ txId: uuidFor(n, 0x65), origin: "user", label: "Heading", ops: [{ op: "setProp", id, path: "heading", value: `Edit ${n}` }], expect: { [id]: n } });
const ack = () => new Response(JSON.stringify({ status: "committed", versions: {}, removed: [], nodes: [] }), { status: 200 });
beforeEach(() => { _setQueueForTesting([]); _resetFlushStateForTesting(); });
afterEach(() => vi.unstubAllGlobals());

describe("durable operation transactions", () => {
  it("global sync cannot race an open editor and resumes after all editor leases release", async () => {
    enqueueSaveOperations({ projectId: "project", transaction: transaction(1) });
    const first = acquireOperationQueueLease("project"); const second = acquireOperationQueueLease("project");
    const fetcher = vi.fn(async () => ack()); vi.stubGlobal("fetch", fetcher);
    try {
      await flushOfflineQueue(); first(); await flushOfflineQueue();
      expect(fetcher).not.toHaveBeenCalled();
      second(); await flushOfflineQueue();
      expect(fetcher).toHaveBeenCalledTimes(1);
    } finally { first(); second(); }
  });
  it("surfaces storage quota failure instead of claiming an immutable write is durable", () => {
    vi.stubGlobal("window", { localStorage: { getItem: () => null, setItem: () => { throw new Error("Quota exceeded"); } }, dispatchEvent: () => true });
    expect(() => enqueueSaveOperations({ projectId: "project", transaction: transaction(1) })).toThrow(/Keep this page open/);
  });
  it("keeps a malformed success reply retryable and does not send the successor", async () => {
    enqueueSaveOperations({ projectId: "project", transaction: transaction(1) });
    enqueueSaveOperations({ projectId: "project", transaction: transaction(2) });
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ status: "committed" }), { status: 200 }));
    vi.stubGlobal("fetch", fetcher);
    await flushOfflineQueue();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(listOfflineQueue().map((item) => item.status)).toEqual(["failed", "queued"]);
  });
  it("deduplicates a retry by txId without rewriting the original payload", () => {
    const payload = { projectId: "project", transaction: transaction(1) };
    const first = enqueueSaveOperations(payload);
    expect(enqueueSaveOperations(structuredClone(payload)).id).toBe(first.id);
    expect(listOfflineQueue()).toHaveLength(1);
    expect(() => enqueueSaveOperations({ ...payload, transaction: { ...payload.transaction, label: "Different intent" } })).toThrow(/transaction_id_reused/);
  });
  it("keeps distinct transactions in order and sends the next only after acknowledgement", async () => {
    enqueueSaveOperations({ projectId: "project", transaction: transaction(1) });
    enqueueSaveOperations({ projectId: "project", transaction: transaction(2) });
    let release!: () => void;
    const held = new Promise<void>((resolve) => { release = resolve; });
    const sent: Transaction[] = [];
    const fetcher = vi.fn(async (_url, options) => {
      sent.push(JSON.parse(options.body));
      if (sent.length === 1) await held;
      return ack();
    });
    vi.stubGlobal("fetch", fetcher);
    const flushing = flushOfflineQueue();
    await Promise.resolve();
    expect(sent).toHaveLength(1);
    release();
    const result = await flushing;
    expect(result.synced).toBe(2);
    expect(sent.map((tx) => tx.txId)).toEqual([transaction(1).txId, transaction(2).txId]);
    expect(listOfflineQueue()).toEqual([]);
  });
  it("a conflict becomes terminal and prevents subsequent project transactions from replaying", async () => {
    enqueueSaveOperations({ projectId: "project", transaction: transaction(1) });
    enqueueSaveOperations({ projectId: "project", transaction: transaction(2) });
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ error: "Changed elsewhere" }), { status: 409 }));
    vi.stubGlobal("fetch", fetcher);
    await flushOfflineQueue(); await flushOfflineQueue();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(listOfflineQueue().map((item) => item.status)).toEqual(["terminal", "queued"]);
  });
  it("an uncertain network result retries the same transaction without sending its successor", async () => {
    enqueueSaveOperations({ projectId: "project", transaction: transaction(1) });
    enqueueSaveOperations({ projectId: "project", transaction: transaction(2) });
    const fetcher = vi.fn().mockRejectedValueOnce(new Error("Lost connection"))
      .mockResolvedValueOnce(ack())
      .mockResolvedValueOnce(ack());
    vi.stubGlobal("fetch", fetcher);
    await flushOfflineQueue();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(listOfflineQueue().map((item) => item.status)).toEqual(["failed", "queued"]);
    await flushOfflineQueue();
    expect(fetcher.mock.calls[1][1].body).toBe(fetcher.mock.calls[0][1].body);
    expect(listOfflineQueue()).toEqual([]);
  });
});

describe("Builder queued intent load boundary", () => {
  it("keeps queued/terminal legacy section edits visible and blocks reopening instead of reinterpreting them", () => {
    const item = enqueueSaveSection({ projectId: "project", sectionId: id, props: { heading: "Old offline edit" } });
    expect(builderQueueBlocker("project")).toMatch(/Older section edits/);
    _setQueueForTesting([{ ...item, status: "terminal" }]);
    expect(builderQueueBlocker("project")).toMatch(/Older section edits/);
    expect(listOfflineQueue()[0].payload).toMatchObject({ props: { heading: "Old offline edit" } });
    expect(builderQueueBlocker("other-project")).toBeNull();
  });
  it("also blocks legacy batch intents and operation retries", () => {
    enqueueSaveBatchSections({ projectId: "project", updates: [{ id, props: { heading: "Undo snapshot" } }] });
    expect(builderQueueBlocker("project")).toMatch(/Older section edits/);
    _setQueueForTesting([]); enqueueSaveOperations({ projectId: "project", transaction: transaction(1) });
    expect(builderQueueBlocker("project")).toMatch(/Operation changes/);
  });
  it("allows independent settings queues without relabeling them as section intents", () => {
    enqueueSaveSettings({ projectId: "project", subdomain: "queued-name" });
    expect(builderQueueBlocker("project")).toBeNull();
  });
});
