import { describe, expect, it } from "vitest";
import { expectFor, type KcdNode, type NodeId, type Op } from "@/lib/creative-core";
import { builderTransactionSchema } from "@/lib/create/kcd-transaction-schema";
import { normalizeBuilderNode, prepareBuilderTransaction } from "@/lib/create/kcd-write-boundary";
import { sectionPropsForSave } from "@/lib/create/section-props-boundary";
import { repackStoredProps, sectionFieldsOf } from "@/lib/create/kcd-adapter";
import { PAGE_A, emptyDocument, node, uuidFor } from "./helpers";

const id = uuidFor(1, 0x59) as NodeId;
let sequence = 0;
function fixture() {
  const doc = emptyDocument([PAGE_A]);
  doc.meta.documentSchemaVersion = "kcd-1";
  doc.nodes[id] = node({ id, type: "legacy-section:hero", pageId: PAGE_A, orderKey: "V", props: { heading: "Hello", align: "center", obsolete: "3B strips this" }, locked: true });
  return doc;
}
function transaction(ops: Op[]) {
  const doc = fixture();
  return { txId: uuidFor(++sequence, 0x60), origin: "user" as const, label: "Edit", ops, expect: expectFor(doc, ops) };
}

describe("Builder operation request", () => {
  it("does not accept server normalization metadata from a browser", () => {
    const tx = transaction([{ op: "setProp", id, path: "heading", value: "New" }]);
    Object.assign(tx.ops[0], { normalizedProps: { heading: "Injected" } });
    expect(builderTransactionSchema.safeParse(tx).success).toBe(false);
  });
  it("requires a metadata value; null is the explicit removal", () => {
    const tx = transaction([{ op: "setResponsiveState", id, value: null }]);
    expect(builderTransactionSchema.safeParse(tx).success).toBe(true);
    delete (tx.ops[0] as unknown as Record<string, unknown>).value;
    expect(builderTransactionSchema.safeParse(tx).success).toBe(false);
  });
  it("rejects unknown operations and extra top-level fields", () => {
    const tx = transaction([{ op: "setProp", id, path: "heading", value: "New" }]);
    expect(builderTransactionSchema.safeParse({ ...tx, bypass: true }).success).toBe(false);
    expect(builderTransactionSchema.safeParse({ ...tx, ops: [{ op: "replaceDocument", value: {} }] }).success).toBe(false);
  });
});

describe("legacy save normalization", () => {
  it("matches the exact 3B save boundary, preserves locked, and touches one node", () => {
    const doc = fixture();
    const tx = transaction([{ op: "setProp", id, path: "heading", value: "Edited" }]);
    const result = prepareBuilderTransaction(doc, tx);
    if (!result.ok) throw new Error(result.error.message);
    const expected = sectionPropsForSave("hero", { ...repackStoredProps(sectionFieldsOf(doc.nodes[id])), heading: "Edited" });
    if (!expected.ok) throw new Error(expected.error);
    expect(result.transaction.ops[0].normalizedProps).toEqual({ ...expected.props, _locked: true });
    expect(result.prediction.document.nodes[id].locked).toBe(true);
    expect(result.prediction.document.nodes[id].props.obsolete).toBeUndefined();
    expect(result.prediction.versions).toEqual({ [id]: 2 });
    expect(doc.nodes[id].props.heading).toBe("Hello");
  });
  it("does not normalize untouched content on a move", () => {
    const result = prepareBuilderTransaction(fixture(), transaction([{ op: "moveNode", id, parentId: null, orderKey: "W" }]));
    if (!result.ok) throw new Error(result.error.message);
    expect(result.prediction.document.nodes[id].props.obsolete).toBe("3B strips this");
    expect(result.transaction.ops[0].normalizedProps).toBeUndefined();
  });
  it("normalizes final state once for a multi-operation device edit", () => {
    const result = prepareBuilderTransaction(fixture(), transaction([
      { op: "setOverride", id, device: "mobile", key: "align", value: "left" },
      { op: "setResponsiveState", id, value: { mode: "custom", baseHash: "abc" } },
    ]));
    if (!result.ok) throw new Error(result.error.message);
    expect(result.transaction.ops[0].normalizedProps).toBeUndefined();
    expect(result.transaction.ops[1].normalizedProps?.deviceOverrides).toMatchObject({ mobile: { align: "left" }, _state: { mode: "custom", baseHash: "abc" } });
    expect(result.prediction.document.nodes[id].version).toBe(2);
  });
  it("rejects unsafe writes and strict primitive unknown props", () => {
    expect(prepareBuilderTransaction(fixture(), transaction([{ op: "setProp", id, path: "heading", value: "<script>alert(1)</script>" }]))).toMatchObject({ ok: false, error: { code: "KCD_INVALID" } });
    const doc = fixture();
    doc.nodes[id] = { ...doc.nodes[id], type: "section", props: {}, locked: false };
    const tx = transaction([{ op: "setProp", id, path: "fake", value: "x" }]);
    expect(prepareBuilderTransaction(doc, tx)).toMatchObject({ ok: false, error: { code: "KCD_INVALID" } });
  });
  it("preserves responsive metadata and valid extensions during normalization", () => {
    const n: KcdNode = { ...fixture().nodes[id], a11y: { landmark: "region", label: "Intro" }, visibility: { hideOn: ["mobile"] }, responsiveState: { mode: "needs-review", baseHash: "previous" } };
    const normalized = normalizeBuilderNode(n);
    expect(normalized).toMatchObject({ a11y: n.a11y, visibility: n.visibility, responsiveState: n.responsiveState, locked: true });
  });
  it("strips adapter shadows on insert while retaining identity", () => {
    const inserted = uuidFor(2, 0x59) as NodeId;
    const tx = transaction([{ op: "insertNode", node: { id: inserted, type: "legacy-section:hero", typeVersion: 1, props: { heading: "New", obsolete: true }, overrides: {}, unknown: { legacy: { source: { raw: { obsolete: true } } } } }, pageId: PAGE_A, parentId: null, orderKey: "W" }]);
    const result = prepareBuilderTransaction(fixture(), tx);
    if (!result.ok) throw new Error(result.error.message);
    const op = result.transaction.ops[0];
    if (op.op !== "insertNode") throw new Error("Wrong operation");
    expect(op.node.id).toBe(inserted);
    expect(op.node.unknown).toBeUndefined();
    expect(op.node.props.obsolete).toBeUndefined();
  });
});
