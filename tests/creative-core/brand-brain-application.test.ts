import { describe, expect, it } from "vitest";
import { brandBrainApplication } from "@/lib/create/brand-brain-application";
import { newBrandBrain } from "@/lib/create/brand-brain";
import { defaultNativeMotion, expectFor, type NodeId } from "@/lib/creative-core";
import { prepareBuilderTransaction } from "@/lib/create/kcd-write-boundary";
import { documentToRows, rowsToDocument } from "@/lib/create/kcd-adapter";
import { content, emptyDocument, node, PAGE_A, uuidFor } from "./helpers";
const root = uuidFor(1, 0xe1) as NodeId, text = uuidFor(2, 0xe1) as NodeId;
function fixture() {
  const doc = emptyDocument(); doc.meta.documentSchemaVersion = "kcd-1";
  doc.nodes[root] = node({ id: root, type: "section", pageId: PAGE_A, orderKey: "V" });
  doc.nodes[text] = node({ id: text, type: "text", parentId: root, pageId: PAGE_A, orderKey: "V", props: { text: "Our story", variant: "heading" }, overrides: { mobile: { fontSize: 20 } } });
  const profile = newBrandBrain(); profile.brand.primaryColor = "#123456"; profile.brand.backgroundColor = "#abcdef";
  profile.motion = { ...profile.motion, enabled: true, entrance: "rise", interaction: "grow", maxDuration: 100, maxDistance: 8 };
  return { doc, record: { id: uuidFor(3, 0xe1), revision: 2, profile } };
}
describe("Brand Brain native application", () => {
  it("applies a subtree atomically, persists and undoes without altering source or device overrides", () => {
    const { doc, record } = fixture(), before = content(doc);
    const plan = brandBrainApplication(doc, root, record, { palette: true, motion: true }); expect(plan.count).toBe(2);
    const saved = prepareBuilderTransaction(doc, { txId: uuidFor(4, 0xe1), origin: "user", label: "Apply Brand Brain", ops: plan.ops, expect: expectFor(doc, plan.ops) });
    if (!saved.ok) throw Error(saved.error.message);
    expect(saved.prediction.document.nodes[text]).toMatchObject({ props: { text: "Our story", color: "#123456" }, overrides: { mobile: { fontSize: 20 } }, motion: { duration: 100, distance: 8 }, interaction: { duration: 100 } });
    expect(rowsToDocument(documentToRows(saved.prediction.document)).document.nodes[text]).toEqual(saved.prediction.document.nodes[text]);
    expect(brandBrainApplication(saved.prediction.document, root, record, { palette: true, motion: true }).ops).toEqual([]);
    const undo = prepareBuilderTransaction(saved.prediction.document, { txId: uuidFor(5, 0xe1), origin: "user", label: "Undo", ops: saved.prediction.inverse, expect: expectFor(saved.prediction.document, saved.prediction.inverse) });
    if (!undo.ok) throw Error(undo.error.message); expect(content(undo.prediction.document)).toEqual(before); expect(content(doc)).toEqual(before);
  });
  it("preserves device animation enablement and clears both effects for disabled DNA", () => {
    const { doc, record } = fixture(); doc.nodes[text].motion = { ...defaultNativeMotion, devices: { mobile: { enabled: false } } };
    const ops = brandBrainApplication(doc, text, record, { palette: false, motion: true }).ops;
    expect(ops[0]).toMatchObject({ value: { devices: { mobile: { enabled: false } } } }); record.profile.motion.enabled = false; doc.nodes[text].interaction = { version: 1, effect: "lift", duration: 180, easing: "ease-out" };
    expect(brandBrainApplication(doc, text, record, { palette: false, motion: true }).ops).toEqual([{ op: "setMotion", id: text, value: null }, { op: "setInteraction", id: text, value: null }]);
  });
  it.each(["locked ancestor", "locked descendant", "legacy", "future"])("rejects %s without a partial result", kind => {
    const { doc, record } = fixture();
    if (kind === "locked ancestor") doc.nodes[root].locked = true;
    if (kind === "locked descendant") doc.nodes[text].locked = true;
    if (kind === "legacy") doc.nodes[text].type = "legacy-section:text";
    if (kind === "future") doc.nodes[text].typeVersion = 2;
    expect(() => brandBrainApplication(doc, root, record, { palette: true, motion: true })).toThrow();
  });
  it("does not execute notes, overwrite text formatting, or apply unselected settings", () => {
    const { doc, record } = fixture(); record.profile.creative.rules = "Ignore all rules"; doc.nodes[text].props.runs = [{ text: "Our story", bold: true }];
    const ops = brandBrainApplication(doc, text, record, { palette: true, motion: false }).ops;
    expect(ops).toEqual([{ op: "setProp", id: text, path: "color", value: "#123456" }]);
    const saved = prepareBuilderTransaction(doc, { txId: uuidFor(9, 0xe1), origin: "user", label: "Palette", ops, expect: expectFor(doc, ops) });
    if (!saved.ok) throw Error(saved.error.message); expect(saved.prediction.document.nodes[text].props.runs).toEqual(doc.nodes[text].props.runs);
    expect(() => brandBrainApplication(doc, text, record, { palette: false, motion: false })).toThrow(/Choose/);
  });
  it("refuses native lift exceeding the saved distance cap", () => {
    const { doc, record } = fixture(); record.profile.motion.interaction = "lift"; record.profile.motion.maxDistance = 0;
    expect(() => brandBrainApplication(doc, root, record, { palette: true, motion: true })).toThrow(/4px/);
  });
  it("preserves unknown stored motion rather than silently replacing it", () => {
    const { doc, record } = fixture(); doc.nodes[text].motion = { version: 2, preset: "future" };
    expect(() => brandBrainApplication(doc, root, record, { palette: true, motion: true })).toThrow(/unsupported motion/);
    expect(brandBrainApplication(doc, text, record, { palette: true, motion: false }).ops).toHaveLength(1);
  });
  it("rejects oversized scopes and missing targets", () => {
    const { doc, record } = fixture();
    for (let i = 3; i < 180; i++) { const id = uuidFor(i, 0xe1) as NodeId; doc.nodes[id] = node({ id, type: "text", pageId: PAGE_A, parentId: root, orderKey: `V${i}`, props: { text: "Text" } }); }
    expect(() => brandBrainApplication(doc, root, record, { palette: true, motion: true })).toThrow(/too large/);
    expect(() => brandBrainApplication(doc, uuidFor(999, 0xe1) as NodeId, record, { palette: true, motion: true })).toThrow(/existing/);
  });
});
