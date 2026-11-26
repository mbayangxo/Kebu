import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NodeId, Transaction } from "@/lib/creative-core";
import { sendKcdTransaction } from "@/lib/create/kcd-operation-transport";
import { _setQueueForTesting, listOfflineQueue } from "@/lib/create/offline-queue";
import { uuidFor } from "./helpers";
import { PAGE_A, node } from "./helpers";

const id = uuidFor(1, 0x70) as NodeId;
const transaction: Transaction = { txId: uuidFor(1, 0x71), origin: "user", label: "Heading", ops: [{ op: "setProp", id, path: "heading", value: "Saved" }], expect: { [id]: 1 } };
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
beforeEach(() => _setQueueForTesting([]));
afterEach(() => vi.unstubAllGlobals());

describe("operation transport retry contract", () => {
  it.each(["network", "server", "invalid-success"])("retains the original transaction after %s uncertainty", async (failure) => {
    const fetcher = failure === "network" ? vi.fn().mockRejectedValue(new Error("Disconnected"))
      : vi.fn().mockResolvedValue(failure === "server" ? response({}, 503) : response({ status: "committed" }));
    vi.stubGlobal("fetch", fetcher);
    await expect(sendKcdTransaction("project", transaction)).rejects.toThrow();
    expect(listOfflineQueue()).toHaveLength(1);
    expect(listOfflineQueue()[0].payload).toEqual({ projectId: "project", transaction });
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual(transaction);
  });
  it("removes an uncertain write only after a valid acknowledgement of the same txId", async () => {
    const fetcher = vi.fn().mockRejectedValueOnce(new Error("Lost reply"))
      .mockResolvedValueOnce(response({ status: "committed", versions: { [id]: 2 }, removed: [], nodes: [node({ id, pageId: PAGE_A, type: "legacy-section:hero", orderKey: "V", version: 2, props: { heading: "Saved" } })] }));
    vi.stubGlobal("fetch", fetcher);
    await expect(sendKcdTransaction("project", transaction)).rejects.toThrow();
    expect((await sendKcdTransaction("project", transaction)).ok).toBe(true);
    expect(fetcher.mock.calls[1][1].body).toBe(fetcher.mock.calls[0][1].body);
    expect(listOfflineQueue()).toEqual([]);
  });
  it("surfaces a conflict without queueing a fresh overwrite", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ error: "Changed elsewhere", conflicts: [{ id, expected: 1, actual: 2 }] }, 409)));
    expect(await sendKcdTransaction("project", transaction)).toMatchObject({ ok: false, error: { code: "KCD_CONFLICT" } });
    expect(listOfflineQueue()).toEqual([]);
  });
});

describe("page acknowledgement retry contract", () => {
  const page = { id: PAGE_A, title: "Renamed", slug: "home", orderKey: "V", deviceLayout: {}, layoutVersion: 2 };
  const rename: Transaction = { ...transaction, ops: [{ op: "updatePage", pageId: PAGE_A, title: "Renamed" }], expect: { [PAGE_A]: 1 } };
  it.each(["missing-pages", "missing-tombstones", "wrong-version", "duplicate-pages", "duplicate-tombstones"])("retains immutable intent for %s", async (failure) => {
    const ack: Record<string, unknown> = { status: "committed", versions: { [PAGE_A]: 2 }, removed: [], nodes: [], pages: [page], removedPages: [] };
    if (failure === "missing-pages") delete ack.pages;
    if (failure === "missing-tombstones") delete ack.removedPages;
    if (failure === "wrong-version") ack.pages = [{ ...page, layoutVersion: 3 }];
    if (failure === "duplicate-pages") ack.pages = [page, page];
    if (failure === "duplicate-tombstones") ack.removedPages = [id, id];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(ack)));
    await expect(sendKcdTransaction("project", rename)).rejects.toThrow(/incomplete/);
    expect(listOfflineQueue()[0].payload).toEqual({ projectId: "project", transaction: rename });
  });
  it("returns canonical page metadata and version only on a complete reply", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ status: "committed", versions: { [PAGE_A]: 2 }, removed: [], nodes: [], pages: [page], removedPages: [] })));
    expect(await sendKcdTransaction("project", rename)).toMatchObject({ ok: true, pages: [page], removedPages: [] });
    expect(listOfflineQueue()).toEqual([]);
  });
});
