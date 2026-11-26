import { describe, expect, it } from "vitest";
import { applyKcdPreviewUpdate, kcdPreviewUpdate, type KcdPreviewUpdate } from "@/lib/create/kcd-preview-update";
import type { NodeId } from "@/lib/creative-core";
import { emptyDocument, node, PAGE_A, uuidFor } from "./helpers";
const root = uuidFor(1, 0xba) as NodeId, text = uuidFor(2, 0xba) as NodeId;
function fixture() { const doc = emptyDocument(); doc.nodes[root] = node({ id: root, type: "section", pageId: PAGE_A, orderKey: "V" }); doc.nodes[text] = node({ id: text, type: "text", pageId: PAGE_A, parentId: root, orderKey: "V", props: { text: "Original" } }); return doc; }
describe("canonical native preview transport", () => {
  it("loads, applies a sparse edit, preserves untouched nodes, and clears intentionally", () => {
    const doc = fixture(); const initial = applyKcdPreviewUpdate(null, 0, kcdPreviewUpdate(null, doc, 1, 0));
    expect(initial).toEqual(doc);
    const next = { ...doc, nodes: { ...doc.nodes, [text]: { ...doc.nodes[text], props: { text: "Edited" } } } };
    const patch = kcdPreviewUpdate(doc, next, 2, 1);
    expect(patch.kind).toBe("delta"); if (patch.kind !== "delta") return;
    expect(patch.nodes.map((node) => node.id)).toEqual([text]);
    const received = applyKcdPreviewUpdate(doc, 1, patch)!;
    expect(received?.nodes[text].props.text).toBe("Edited"); expect(received?.nodes[root]).toBe(doc.nodes[root]);
    expect(applyKcdPreviewUpdate(received, 2, kcdPreviewUpdate(received, null, 3, 2))).toBeNull();
  });
  it("requires resynchronisation after sequence gaps, stale updates or project changes", () => {
    const doc = fixture(), patch = kcdPreviewUpdate(doc, doc, 2, 1);
    expect(applyKcdPreviewUpdate(doc, 2, patch)).toBeUndefined();
    expect(applyKcdPreviewUpdate(doc, 0, patch)).toBeUndefined();
    const switched = { ...doc, id: uuidFor(1, 0xbb) };
    expect(kcdPreviewUpdate(doc, switched, 3, 2).kind).toBe("full");
    expect(applyKcdPreviewUpdate(doc, 1, { ...patch, sequence: 3 } as KcdPreviewUpdate)).toBeUndefined();
  });
  it("rejects malformed/duplicate ids, invalid trees and incomplete removals", () => {
    const doc = fixture(); const patch = kcdPreviewUpdate(doc, doc, 2, 1); if (patch.kind !== "delta") throw new Error("Expected delta");
    expect(applyKcdPreviewUpdate(doc, 1, { ...patch, nodes: [doc.nodes[text], doc.nodes[text]] })).toBeUndefined();
    expect(applyKcdPreviewUpdate(doc, 1, { ...patch, nodes: [{ ...doc.nodes[text], id: "__proto__" as NodeId }] })).toBeUndefined();
    expect(applyKcdPreviewUpdate(doc, 1, { ...patch, removed: [root] })).toBeUndefined();
    expect(applyKcdPreviewUpdate(doc, 1, { ...patch, removed: [text, text] })).toBeUndefined();
    expect(applyKcdPreviewUpdate(doc, 1, { ...patch, removed: [uuidFor(9) as NodeId] })).toBeUndefined();
    const empty = applyKcdPreviewUpdate(doc, 1, { ...patch, removed: [root, text] }); expect(empty?.nodes).toEqual({});
  });
});

it("preserves page identity and validates deltas without reading unchanged props", () => {
 const doc=fixture(); const next={...doc,nodes:{...doc.nodes,[text]:{...doc.nodes[text],props:{text:"Edited"}}}};
 const patch=kcdPreviewUpdate(doc,next,2,1);
 Object.defineProperty(doc.nodes[root],"props",{get(){throw new Error("Untouched props read");}});
 const received=applyKcdPreviewUpdate(doc,1,patch);
 expect(received?.pages[0]).toBe(doc.pages[0]); expect(received?.nodes[text].props.text).toBe("Edited");
});
