import { describe, expect, it } from "vitest";
import { applyTransaction, expectFor, type KcdDocument, type NodeId, type Op } from "@/lib/creative-core";
import { PAGE_A, content, emptyDocument, node, registry, uuidFor } from "./helpers";

const id = uuidFor(1, 0x55) as NodeId;
let counter = 0;
function fixture() {
  const doc = emptyDocument([PAGE_A]);
  doc.nodes[id] = node({ id, type: "legacy-section:hero", pageId: PAGE_A, orderKey: "V", props: { heading: "Welcome", subheading: "", align: "center" } });
  return doc;
}
function apply(doc: KcdDocument, ops: Op[], expect = expectFor(doc, ops)) {
  return applyTransaction(doc, { txId: uuidFor(++counter, 0x56), origin: "user", label: "Device edit", ops, expect }, registry);
}

describe("responsive metadata transactions", () => {
  it("device edit and responsive state commit together, bump once, and undo exactly", () => {
    const doc = fixture();
    const result = apply(doc, [
      { op: "setOverride", id, device: "mobile", key: "align", value: "left" },
      { op: "setResponsiveState", id, value: { mode: "custom", baseHash: "123abc" } },
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error.message);
    expect(result.document.nodes[id].version).toBe(doc.nodes[id].version + 1);
    expect(result.document.nodes[id].responsiveState).toEqual({ mode: "custom", baseHash: "123abc" });
    const restored = apply(result.document, result.inverse);
    if (!restored.ok) throw new Error(restored.error.message);
    expect(content(restored.document)).toEqual(content(doc));
    expect(doc.nodes[id].responsiveState).toBeUndefined();
  });

  it("Reset to Auto restores both device buckets and the previous metadata on undo", () => {
    const doc = fixture();
    doc.nodes[id].overrides = { tablet: { align: "left" }, mobile: { align: "right" } };
    doc.nodes[id].responsiveState = { mode: "needs-review", baseHash: "old" };
    const result = apply(doc, [
      { op: "clearOverride", id, device: "tablet" },
      { op: "clearOverride", id, device: "mobile" },
      { op: "setResponsiveState", id, value: null },
    ]);
    if (!result.ok) throw new Error(result.error.message);
    expect(result.document.nodes[id].overrides).toEqual({});
    expect(result.document.nodes[id].responsiveState).toBeUndefined();
    const restored = apply(result.document, result.inverse);
    if (!restored.ok) throw new Error(restored.error.message);
    expect(content(restored.document)).toEqual(content(doc));
  });

  it.each([{ mode: "broken" }, { mode: "custom", extra: true }, { mode: "custom", baseHash: "x".repeat(33) }])("rejects invalid state atomically: %j", (value) => {
    const doc = fixture();
    const before = content(doc);
    const result = apply(doc, [
      { op: "setOverride", id, device: "mobile", key: "align", value: "left" },
      { op: "setResponsiveState", id, value },
    ]);
    expect(result.ok).toBe(false);
    expect(content(doc)).toEqual(before);
  });

  it("requires the confirmed version, including state-only writes", () => {
    const result = apply(fixture(), [{ op: "setResponsiveState", id, value: { mode: "auto" } }], { [id]: 9 });
    expect(result).toMatchObject({ ok: false, error: { code: "KCD_CONFLICT" } });
  });
});
