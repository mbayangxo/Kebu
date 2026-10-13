import { afterEach, describe, expect, it, vi } from "vitest";
import { type KcdDocument, type NodeId, type Op, type Transaction } from "@/lib/creative-core";
import { OperationCoordinator, type OperationAcknowledgement } from "@/lib/create/kcd-operation-coordinator";
import { prepareBuilderTransaction } from "@/lib/create/kcd-write-boundary";
import { PAGE_A, PAGE_B, emptyDocument, node, uuidFor } from "./helpers";

const id = uuidFor(1, 0x62) as NodeId;
let counter = 0;
const txId = () => uuidFor(++counter, 0x63);
const heading = (value: string): Op[] => [{ op: "setProp", id, path: "heading", value }];
function fixture() {
  const doc = emptyDocument([PAGE_A]);
  doc.nodes[id] = node({ id, type: "legacy-section:hero", pageId: PAGE_A, orderKey: "V", props: { heading: "Original", align: "center" } });
  return doc;
}
function authority(initial: KcdDocument) {
  let doc = initial;
  const committed = new Map<string, OperationAcknowledgement>();
  const calls: Transaction[] = [];
  const send = async (tx: Transaction): Promise<OperationAcknowledgement> => {
    calls.push(structuredClone(tx));
    const replay = committed.get(tx.txId);
    if (replay) return replay;
    const result = prepareBuilderTransaction(doc, tx);
    if (!result.ok) return result;
    doc = result.prediction.document;
    const ack: OperationAcknowledgement = { ok: true, versions: result.prediction.versions, removed: result.prediction.removed, removedPages: result.prediction.removedPages ?? [], pages: doc.pages.filter((page) => result.prediction.versions[page.id]), nodes: Object.keys(result.prediction.versions).flatMap((id) => doc.nodes[id as NodeId] ? [doc.nodes[id as NodeId]] : []) };
    committed.set(tx.txId, ack);
    return ack;
  };
  return { calls, send, document: () => doc };
}

describe("Builder operation coordinator", () => {
  afterEach(() => vi.useRealTimers());
  it("delays real keystroke events for 750 ms while showing every edit immediately", async () => {
    vi.useFakeTimers();
    const server = authority(fixture());
    const client = new OperationCoordinator(fixture(), server.send, txId, () => undefined, 750);
    const first = client.submit("Typing", heading("F"), 0);
    await vi.advanceTimersByTimeAsync(100);
    const second = client.submit("Typing", heading("Final"), 100);
    expect(client.document.nodes[id].props.heading).toBe("Final");
    expect(client.canPublish).toBe(false);
    await vi.advanceTimersByTimeAsync(749);
    expect(server.calls).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1);
    await Promise.all([first, second]);
    expect(server.calls).toHaveLength(1);
    expect(server.calls[0].ops).toEqual(heading("Final"));
  });
  it("checkpoints unsent intents in order with their predicted versions and immutable IDs", async () => {
    vi.useFakeTimers();
    const server = authority(fixture());
    const client = new OperationCoordinator(fixture(), server.send, txId, () => undefined, 750);
    const first = client.submit("Typing", heading("One"), 0);
    const second = client.submit("Later typing", heading("Two"), 1000);
    const persisted: Transaction[] = [];
    client.checkpointPending((tx) => persisted.push(structuredClone(tx)));
    expect(persisted.map((tx) => tx.expect[id])).toEqual([1, 2]);
    expect(new Set(persisted.map((tx) => tx.txId)).size).toBe(2);
    await client.flush(); await Promise.all([first, second]);
    expect(server.calls).toEqual(persisted);
  });
  it("blocks publishing when a committed reply omits canonical changed nodes", async () => {
    const client = new OperationCoordinator(fixture(), async () => ({ ok: true, versions: { [id]: 2 }, removed: [], nodes: [] }), txId);
    await expect(client.submit("Heading", heading("Unknown canonical value"))).rejects.toThrow(/Saved versions differ/);
    expect(client.canPublish).toBe(false);
    expect(client.history.size).toBe(0);
  });
  it("coalesces queued keystrokes and never sends a whole document", async () => {
    const initial = fixture(); const server = authority(initial);
    const client = new OperationCoordinator(initial, server.send, txId);
    const first = client.submit("Heading", heading("One"), 0);
    const second = client.submit("Heading", heading("Two"), 100);
    expect(client.document.nodes[id].props.heading).toBe("Two");
    expect(client.canPublish).toBe(false);
    await Promise.all([first, second]);
    expect(server.calls).toHaveLength(1);
    expect(server.calls[0].ops).toEqual(heading("Two"));
    expect(server.calls[0]).not.toHaveProperty("document");
    expect(client.confirmedDocument.nodes[id].version).toBe(2);
    expect(client.canPublish).toBe(true);
  });

  it("rebases edits made during a save on its confirmed version", async () => {
    const initial = fixture(); const server = authority(initial);
    let release!: () => void;
    const held = new Promise<void>((resolve) => { release = resolve; });
    let sends = 0;
    const client = new OperationCoordinator(initial, async (tx) => { if (++sends === 1) await held; return server.send(tx); }, txId);
    const one = client.submit("Heading", heading("One"), 0);
    await Promise.resolve();
    const two = client.submit("Heading", heading("Two"), 100);
    const three = client.submit("Heading", heading("Three"), 200);
    release();
    await Promise.all([one, two, three]);
    expect(server.calls.map((tx) => tx.expect[id])).toEqual([1, 2]);
    expect(client.document.nodes[id].props.heading).toBe("Three");
    await client.travel("undo");
    expect(client.document.nodes[id].props.heading).toBe("Original");
    await client.travel("redo");
    expect(client.document.nodes[id].props.heading).toBe("Three");
  });

  it("retries a committed but unacknowledged save with exactly the same txId and versions", async () => {
    const initial = fixture(); const server = authority(initial);
    let lost = true;
    const client = new OperationCoordinator(initial, async (tx) => {
      const result = await server.send(tx);
      if (lost) { lost = false; throw new Error("Lost acknowledgement"); }
      return result;
    }, txId);
    const saved = client.submit("Heading", heading("Once"));
    await client.flush();
    expect(client.status).toBe("queued");
    expect(client.canPublish).toBe(false);
    await client.flush(); await saved;
    expect(server.calls).toHaveLength(2);
    expect(server.calls[1]).toEqual(server.calls[0]);
    expect(server.document().nodes[id].version).toBe(2);
    expect(client.history.size).toBe(1);
  });

  it("a conflict preserves the user's view and blocks later writes/publish", async () => {
    const initial = fixture();
    const client = new OperationCoordinator(initial, async () => ({ ok: false, error: { code: "KCD_CONFLICT", message: "Changed elsewhere", conflicts: [{ id, expected: 1, actual: 2 }] } }), txId);
    await expect(client.submit("Heading", heading("My edit"))).rejects.toThrow(/Changed elsewhere/);
    expect(client.document.nodes[id].props.heading).toBe("My edit");
    expect(client.confirmedDocument.nodes[id].props.heading).toBe("Original");
    expect(client.status).toBe("conflicted");
    expect(client.canPublish).toBe(false);
    await expect(client.submit("Later", heading("Overwrite"))).rejects.toThrow(/Changed elsewhere/);
  });

  it("a validation rejection rolls back optimistic content and creates no history", async () => {
    const initial = fixture();
    const client = new OperationCoordinator(initial, async () => ({ ok: false, error: { code: "KCD_INVALID", message: "Rejected by authority" } }), txId);
    await expect(client.submit("Heading", heading("No"))).rejects.toThrow(/Rejected/);
    expect(client.document.nodes[id].props.heading).toBe("Original");
    expect(client.history.canUndo).toBe(false);
    expect(client.canPublish).toBe(false);
  });

  it("structural edits are barriers, retain ids, and undo in operation order", async () => {
    const initial = fixture(); const server = authority(initial);
    const client = new OperationCoordinator(initial, server.send, txId);
    const one = client.submit("Heading", heading("One"), 0);
    const move = client.submit("Move", [{ op: "moveNode", id, parentId: null, orderKey: "W" }], 100);
    const two = client.submit("Heading", heading("Two"), 200);
    await Promise.all([one, move, two]);
    expect(server.calls.map((tx) => tx.ops[0].op)).toEqual(["setProp", "moveNode", "setProp"]);
    await client.travel("undo");
    expect(client.document.nodes[id].props.heading).toBe("One");
    await client.travel("undo");
    expect(client.document.nodes[id].orderKey).toBe("V");
    expect(Object.keys(client.document.nodes)).toEqual([id]);
  });

  it("remove/restore cycles reuse ids through the transport", async () => {
    const initial = fixture(); const server = authority(initial);
    const client = new OperationCoordinator(initial, server.send, txId);
    await client.submit("Remove", [{ op: "removeNode", id }]);
    for (let i = 0; i < 3; i++) {
      await client.travel("undo"); expect(client.document.nodes[id].id).toBe(id);
      await client.travel("redo"); expect(client.document.nodes[id]).toBeUndefined();
    }
  });
});

describe("page history acknowledgements", () => {
  it("preserves page and node identities through delete / Undo / Redo / Undo", async () => {
    const doc = emptyDocument([PAGE_A, PAGE_B]); const page = doc.pages[1];
    const element = uuidFor(44, 0x62) as NodeId;
    doc.nodes[element] = node({ id: element, pageId: page.id, type: "legacy-section:text", orderKey: "V", props: { heading: "Story", body: "Content" } });
    const server = authority(doc); const client = new OperationCoordinator(doc, server.send, txId);
    await client.submit("Delete page", [{ op: "removePage", pageId: page.id }]);
    expect(client.document.pages.find((p) => p.id === page.id)).toBeUndefined();
    await client.travel("undo");
    expect(client.document.pages.find((p) => p.id === page.id)?.layoutVersion).toBe(2);
    expect(client.document.nodes[element].version).toBe(2);
    await client.travel("redo"); await client.travel("undo");
    expect(client.document.nodes[element].version).toBe(3);
    expect(client.canPublish).toBe(true);
  });
  it("cannot advance history from a reply missing canonical pages", async () => {
    const doc = emptyDocument(); const server = authority(doc);
    const client = new OperationCoordinator(doc, async (tx) => { const ack = await server.send(tx); if (ack.ok) delete ack.pages; return ack; }, txId);
    await expect(client.submit("Rename", [{ op: "updatePage", pageId: doc.pages[0].id, title: "Changed" }])).rejects.toThrow(/acknowledgement is incomplete/);
    expect(client.history.canUndo).toBe(false); expect(client.canPublish).toBe(false);
  });
});
