import { describe, expect, it } from "vitest";
import { defaultNativeMotion, nativeMotionEnabled, nativeMotionFrames, nativeMotionSchema, nativeInteractionSchema, expectFor, type KcdDocument, type NodeId, type Op } from "@/lib/creative-core";
import { prepareBuilderTransaction } from "@/lib/create/kcd-write-boundary";
import { documentToRows, rowsToDocument } from "@/lib/create/kcd-adapter";
import { primitiveDuplicateOperation } from "@/lib/create/kcd-primitive-operations";
import { content, emptyDocument, idSource, node, PAGE_A, uuidFor } from "./helpers";
const id = uuidFor(1, 0xd3) as NodeId;
function fixture() { const doc = emptyDocument([PAGE_A]); doc.meta.documentSchemaVersion = "kcd-1"; doc.nodes[id] = node({ id, type: "section", pageId: PAGE_A, orderKey: "V" }); return doc; }
function apply(doc: KcdDocument, ops: Op[]) { const result = prepareBuilderTransaction(doc, { txId: uuidFor(1, 0xd4), origin: "user", label: "Motion", ops, expect: expectFor(doc, ops) }); if (!result.ok) throw new Error(result.error.message); return result.prediction; }
describe("native motion document commands", () => {
  it("saves both settings in one version, reloads and reverses exactly", () => {
    const doc = fixture(), interaction = { version: 1, effect: "lift", duration: 180, easing: "ease-out" };
    const saved = apply(doc, [{ op: "setMotion", id, value: defaultNativeMotion }, { op: "setInteraction", id, value: interaction }]);
    expect(saved.document.nodes[id].version).toBe(doc.nodes[id].version + 1);
    expect(rowsToDocument(documentToRows(saved.document)).document.nodes[id]).toMatchObject({ motion: defaultNativeMotion, interaction });
    expect(content(apply(saved.document, saved.inverse).document)).toEqual(content(doc));
    expect(doc.nodes[id].motion).toBeUndefined();
  });
  it("clear and duplicate preserve full device settings and undo", () => {
    const doc = fixture(); doc.nodes[id].motion = { ...defaultNativeMotion, devices: { tablet: { enabled: false }, mobile: { enabled: true } } };
    const copied = apply(doc, [primitiveDuplicateOperation(doc, id, idSource(0xd5))]);
    const copy = Object.values(copied.document.nodes).find(n => n.id !== id)!;
    expect(copy.motion).toEqual(doc.nodes[id].motion);
    const cleared = apply(doc, [{ op: "setMotion", id, value: null }]);
    expect(cleared.document.nodes[id].motion).toBeUndefined();
    expect(content(apply(cleared.document, cleared.inverse).document)).toEqual(content(doc));
  });
  it.each([{ ...defaultNativeMotion, duration: 0 }, { ...defaultNativeMotion, duration: 5001 }, { ...defaultNativeMotion, delay: -1 }, { ...defaultNativeMotion, distance: Infinity }, { ...defaultNativeMotion, version: 2 }, { ...defaultNativeMotion, script: "alert(1)" }, { ...defaultNativeMotion, devices: { desktop: { enabled: false } } }])("rejects invalid motion atomically: %j", value => {
    const doc = fixture(), before = content(doc);
    expect(() => apply(doc, [{ op: "setProp", id, path: "padding", value: "lg" }, { op: "setMotion", id, value }])).toThrow();
    expect(content(doc)).toEqual(before);
  });
  it("rejects unsupported interaction effects and unbounded duration", () => {
    expect(nativeInteractionSchema.safeParse({ version: 1, effect: "script", duration: 200, easing: "ease" }).success).toBe(false);
    expect(nativeInteractionSchema.safeParse({ version: 1, effect: "grow", duration: 1001, easing: "ease" }).success).toBe(false);
  });
  it("refuses native commands on legacy sections before persistence", () => {
    const doc = fixture(); doc.nodes[id].type = "legacy-section:text"; doc.nodes[id].props = { heading: "Legacy", body: "Preserved" };
    expect(() => apply(doc, [{ op: "setMotion", id, value: defaultNativeMotion }])).toThrow(/Native effects require/);
  });
  it("inherits desktop enablement independently for each device", () => {
    const motion = nativeMotionSchema.parse({ ...defaultNativeMotion, enabled: false, devices: { mobile: { enabled: true } } });
    expect(["desktop", "tablet", "mobile"].map(d => nativeMotionEnabled(motion, d as "desktop" | "tablet" | "mobile"))).toEqual([false, false, true]);
    expect(nativeMotionFrames({ ...motion, preset: "slide-right", distance: 42 })).toEqual([{ opacity: 0, transform: "translateX(-42px)" }, { opacity: 1, transform: "none" }]);
  });
});
