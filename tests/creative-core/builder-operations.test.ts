import { describe, expect, it } from "vitest";
import { expectFor, type NodeId } from "@/lib/creative-core";
import { builderInsertOperation, builderPatchOperations, builderReorderOperations } from "@/lib/create/kcd-builder-operations";
import { prepareBuilderTransaction } from "@/lib/create/kcd-write-boundary";
import { deviceScopedPatch } from "@/lib/create/device-overrides";
import { PAGE_A, emptyDocument, node, uuidFor } from "./helpers";

const id = uuidFor(1, 0x80) as NodeId;
function fixture() {
  const doc = emptyDocument(); doc.meta.documentSchemaVersion = "kcd-1";
  doc.nodes[id] = node({ id, pageId: PAGE_A, type: "legacy-section:hero", orderKey: "V", props: { heading: "Original", align: "center" } });
  return doc;
}
describe("existing Builder controls on the operation path", () => {
  it("does not block a normal property edit because untouched legacy metadata was malformed", () => {
    const before = fixture().nodes[id];
    before.unknown = { legacy: { source: { form: "rows", raw: { ...before.props, _a11y: { label: 42 } } } } };
    expect(builderPatchOperations(before, { heading: "Edited" })).toEqual([{ op: "setProp", id, path: "heading", value: "Edited" }]);
    expect(() => builderPatchOperations(before, { _a11y: { label: 42 } })).toThrow(/accessibility/);
  });
  it("turns a single inspector patch into a single property operation", () => {
    expect(builderPatchOperations(fixture().nodes[id], { heading: "Edited" })).toEqual([{ op: "setProp", id, path: "heading", value: "Edited" }]);
  });
  it("stores a real 3B device patch and its state atomically, without changing Desktop", () => {
    const doc = fixture(); const before = doc.nodes[id];
    const patch = deviceScopedPatch("hero", before.props, "mobile", { align: "left" });
    const ops = builderPatchOperations(before, patch);
    expect(ops.map((op) => op.op)).toEqual(["setOverride", "setResponsiveState"]);
    const result = prepareBuilderTransaction(doc, { txId: uuidFor(1, 0x81), origin: "user", label: "Mobile", expect: expectFor(doc, ops), ops });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error.message);
    expect(result.prediction.document.nodes[id].props.align).toBe("center");
    expect(result.prediction.document.nodes[id].overrides.mobile?.align).toBe("left");
    expect(result.prediction.document.nodes[id].responsiveState?.mode).toBe("custom");
    expect(result.prediction.versions[id]).toBe(2);
  });
  it("Reset to Auto clears both buckets and responsive metadata in one transaction", () => {
    const before = { ...fixture().nodes[id], overrides: { tablet: { align: "right" }, mobile: { align: "left" } }, responsiveState: { mode: "custom" as const, baseHash: "abc" } };
    expect(builderPatchOperations(before, { deviceOverrides: null })).toEqual([
      { op: "clearOverride", id, device: "tablet", key: "align" },
      { op: "clearOverride", id, device: "mobile", key: "align" },
      { op: "setResponsiveState", id, value: null },
    ]);
  });
  it("uses dedicated accessibility, visibility and locking operations", () => {
    expect(builderPatchOperations(fixture().nodes[id], { _a11y: { label: "Welcome" }, _visibility: { hideOn: ["mobile"] }, _locked: true }).map((op) => op.op)).toEqual(["setA11y", "setVisibility", "setLocked"]);
  });
  it("preserves opaque extensions and explicitly refuses unsupported edits", () => {
    const before = { ...fixture().nodes[id], motion: { preset: "fade" } };
    expect(builderPatchOperations(before, { _motion: { preset: "fade" } })).toEqual([]);
    expect(() => builderPatchOperations(before, { _motion: { preset: "slide" } })).toThrow(/preserved/);
    expect(before.motion).toEqual({ preset: "fade" });
  });
  it("does not send no-op property patches", () => {
    expect(builderPatchOperations(fixture().nodes[id], { heading: "Original" })).toEqual([]);
  });
  it("inserts between stable siblings or at the page start with client-minted identity", () => {
    const doc = fixture(); const newId = uuidFor(2, 0x80) as NodeId;
    const beginning = builderInsertOperation(doc, PAGE_A, "hero", undefined, null, newId);
    expect(beginning.op).toBe("insertNode");
    if (beginning.op !== "insertNode") throw new Error("Wrong operation");
    expect(beginning.orderKey < doc.nodes[id].orderKey).toBe(true);
    expect(beginning.node.id).toBe(newId);
    expect(beginning.node.props.heading).toBeTruthy();
    expect(() => builderInsertOperation(doc, PAGE_A, "hero", undefined, "missing", newId)).toThrow(/insertion point/);
  });
  it("reorders all roots atomically and refuses partial or duplicate ids", () => {
    const doc = fixture(); const second = uuidFor(2, 0x80) as NodeId;
    doc.nodes[second] = node({ ...doc.nodes[id], id: second, orderKey: "W" });
    const ops = builderReorderOperations(doc, PAGE_A, [second, id]);
    const result = prepareBuilderTransaction(doc, { txId: uuidFor(2, 0x81), origin: "user", label: "Move", expect: expectFor(doc, ops), ops });
    if (!result.ok) throw new Error(result.error.message);
    expect(result.prediction.document.nodes[second].orderKey < result.prediction.document.nodes[id].orderKey).toBe(true);
    expect(() => builderReorderOperations(doc, PAGE_A, [second])).toThrow(/page changed/);
    expect(() => builderReorderOperations(doc, PAGE_A, [id, id])).toThrow(/page changed/);
  });
});

describe("Builder atomic page controls", () => {
  it("adds page and both starter nodes in a single reversible transaction", async () => {
    const { builderInsertPageOperations, builderReorderPageOperations } = await import("@/lib/create/kcd-builder-operations");
    const doc = fixture(); const pageId = uuidFor(20, 0x80) as import("@/lib/creative-core").PageId;
    const ops = builderInsertPageOperations(doc, "About", "about", pageId, uuidFor(21, 0x80) as NodeId, uuidFor(22, 0x80) as NodeId);
    const result = prepareBuilderTransaction(doc, { txId: uuidFor(23, 0x80), origin: "user", label: "Page", expect: expectFor(doc, ops), ops });
    expect(result.ok).toBe(true); if (!result.ok) return;
    expect(ops.map((op) => op.op)).toEqual(["insertPage", "insertNode", "insertNode"]);
    expect(Object.values(result.prediction.document.nodes).filter((node) => node.pageId === pageId)).toHaveLength(2);
    expect(result.prediction.inverse.at(-1)).toEqual({ op: "removePage", pageId });
    const reverse = result.prediction.document.pages.map((page) => page.id).reverse();
    const reorder = builderReorderPageOperations(result.prediction.document, reverse);
    const reordered = prepareBuilderTransaction(result.prediction.document, { txId: uuidFor(24, 0x80), origin: "user", label: "Reorder", expect: expectFor(result.prediction.document, reorder), ops: reorder });
    expect(reordered.ok && reordered.prediction.document.pages.map((page) => page.id)).toEqual(reverse);
    expect(() => builderReorderPageOperations(result.prediction.document, [pageId, pageId])).toThrow(/page list changed/);
  });
});
