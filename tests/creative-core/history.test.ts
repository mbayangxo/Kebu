import { describe, expect, it } from "vitest";
import { OperationHistory, applyTransaction, expectFor, type KcdDocument, type NodeId, type Op } from "@/lib/creative-core";
import { PAGE_A, content, emptyDocument, node, registry, uuidFor } from "./helpers";

const id = uuidFor(1, 0x57) as NodeId;
let sequence = 0;
function fixture() {
  const doc = emptyDocument([PAGE_A]);
  doc.nodes[id] = node({ id, type: "legacy-section:hero", pageId: PAGE_A, orderKey: "V", props: { heading: "Initial", subheading: "", align: "center" } });
  return doc;
}
const prop = (value: string): Op => ({ op: "setProp", id, path: "heading", value });
function edit(history: OperationHistory, before: KcdDocument, ops: Op[], at: number) {
  const tx = { txId: uuidFor(++sequence, 0x58), origin: "user" as const, label: "Heading", ops, expect: expectFor(before, ops) };
  const result = applyTransaction(before, tx, registry);
  if (!result.ok) throw new Error(result.error.message);
  history.record(before, tx, result, at);
  return result.document;
}
function travel(history: OperationHistory, before: KcdDocument, direction: "undo" | "redo") {
  const prepared = history.prepare(direction, before, uuidFor(++sequence, 0x58));
  if (!prepared.ok) throw new Error(prepared.reason);
  const result = applyTransaction(before, prepared.transaction, registry);
  if (!result.ok) throw new Error(result.error.message);
  history.confirm(direction, before, result);
  return result.document;
}

describe("confirmed operation history", () => {
  it("coalesces device keystrokes together with their responsive metadata", () => {
    const history = new OperationHistory();
    const initial = fixture();
    const deviceEdit = (value: string, baseHash: string): Op[] => [
      { op: "setOverride", id, device: "mobile", key: "heading", value },
      { op: "setResponsiveState", id, value: { mode: "custom", baseHash } },
    ];
    let doc = edit(history, initial, deviceEdit("Phone 1", "a"), 0);
    doc = edit(history, doc, deviceEdit("Phone 2", "b"), 100);
    expect(history.size).toBe(1);
    doc = travel(history, doc, "undo");
    expect(content(doc)).toEqual(content(initial));
    doc = travel(history, doc, "redo");
    expect(doc.nodes[id].overrides.mobile?.heading).toBe("Phone 2");
    expect(doc.nodes[id].responsiveState?.baseHash).toBe("b");
  });

  it("Undo/Redo is a coalescing barrier even inside the keystroke window", () => {
    const history = new OperationHistory();
    let doc = edit(history, fixture(), [prop("One")], 0);
    doc = travel(history, doc, "undo");
    doc = travel(history, doc, "redo");
    doc = edit(history, doc, [prop("Two")], 100);
    expect(history.size).toBe(2);
    doc = travel(history, doc, "undo");
    expect(doc.nodes[id].props.heading).toBe("One");
  });

  it("coalesces keystrokes within 750ms to the earliest inverse and latest forward", () => {
    const history = new OperationHistory();
    const initial = fixture();
    let doc = edit(history, initial, [prop("One")], 0);
    doc = edit(history, doc, [prop("Two")], 750);
    expect(history.size).toBe(1);
    doc = travel(history, doc, "undo");
    expect(content(doc)).toEqual(content(initial));
    doc = travel(history, doc, "redo");
    expect(doc.nodes[id].props.heading).toBe("Two");
  });

  it("keeps separate steps after the window and tracks own versions through repeated travel", () => {
    const history = new OperationHistory();
    let doc = edit(history, fixture(), [prop("One")], 0);
    doc = edit(history, doc, [prop("Two")], 751);
    expect(history.size).toBe(2);
    for (let i = 0; i < 3; i++) {
      doc = travel(history, doc, "undo");
      expect(doc.nodes[id].props.heading).toBe("One");
      doc = travel(history, doc, "undo");
      expect(doc.nodes[id].props.heading).toBe("Initial");
      doc = travel(history, doc, "redo");
      doc = travel(history, doc, "redo");
      expect(doc.nodes[id].props.heading).toBe("Two");
    }
  });

  it("does not overwrite an externally changed node, even after a later local edit", () => {
    const history = new OperationHistory();
    let doc = edit(history, fixture(), [prop("One")], 0);
    doc = structuredClone(doc);
    doc.nodes[id].version++;
    doc.nodes[id].props.heading = "Elsewhere";
    expect(history.prepare("undo", doc, uuidFor(++sequence, 0x58))).toMatchObject({ ok: false, reason: "changed-elsewhere", ids: [id] });
    doc = edit(history, doc, [prop("Three")], 200);
    expect(history.size).toBe(2);
    doc = travel(history, doc, "undo");
    expect(doc.nodes[id].props.heading).toBe("Elsewhere");
    expect(history.prepare("undo", doc, uuidFor(++sequence, 0x58))).toMatchObject({ ok: false, reason: "changed-elsewhere" });
  });

  it("remove/restore cycles retain ids and current restore versions", () => {
    const history = new OperationHistory();
    const initial = fixture();
    let doc = edit(history, initial, [{ op: "removeNode", id }], 0);
    for (let i = 0; i < 3; i++) {
      expect(doc.nodes[id]).toBeUndefined();
      doc = travel(history, doc, "undo");
      expect(content(doc)).toEqual(content(initial));
      doc = travel(history, doc, "redo");
    }
  });

  it("failed undo leaves the entry available for retry with a fresh txId", () => {
    const history = new OperationHistory();
    const doc = edit(history, fixture(), [prop("One")], 0);
    const first = history.prepare("undo", doc, uuidFor(++sequence, 0x58));
    const retry = history.prepare("undo", doc, uuidFor(++sequence, 0x58));
    expect(first.ok && retry.ok && first.transaction.txId !== retry.transaction.txId).toBe(true);
    expect(history.canUndo).toBe(true);
    expect(history.canRedo).toBe(false);
  });

  it("a new edit discards redo and caps old entries", () => {
    const history = new OperationHistory(2);
    let doc = edit(history, fixture(), [prop("One")], 0);
    doc = edit(history, doc, [prop("Two")], 1000);
    doc = edit(history, doc, [prop("Three")], 2000);
    expect(history.size).toBe(2);
    doc = travel(history, doc, "undo");
    edit(history, doc, [prop("Four")], 3000);
    expect(history.canRedo).toBe(false);
    expect(history.size).toBe(2);
  });

  it("no-op transactions add no entry; an oversized history entry is dropped", () => {
    const history = new OperationHistory();
    const doc = fixture();
    edit(history, doc, [{ op: "moveNode", id, parentId: null, orderKey: "V" }], 0);
    expect(history.canUndo).toBe(false);
    const small = new OperationHistory(200, 200);
    edit(small, doc, [prop("Long text".repeat(10))], 0);
    expect(small.canUndo).toBe(false);
  });
});
