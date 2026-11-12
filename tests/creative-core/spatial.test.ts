import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { alignSpatialBox, snapSpatialBox, expectFor, gestureBox, isSpatialLocked, resolveNode, type Device, type NodeId, type Op } from "@/lib/creative-core";
import { primitiveDefinition, primitiveGeometryOperations, primitivePropertyOperations, primitiveInsertOperation, primitiveReparentOperation } from "@/lib/create/kcd-primitive-operations";
import { prepareBuilderTransaction } from "@/lib/create/kcd-write-boundary";
import { documentToRows, rowsToDocument } from "@/lib/create/kcd-adapter";
import { createKcdPublishedSnapshot, readKcdPublishedSnapshot } from "@/lib/create/kcd-published-snapshot";
import { KcdPrimitiveSubtree } from "@/app/components/create/kcd/primitive-subtree";
import { emptyDocument, node, PAGE_A, uuidFor } from "./helpers";
const root = uuidFor(1, 0x3d) as NodeId, text = uuidFor(2, 0x3d) as NodeId;
function fixture() {
 const doc = emptyDocument(); doc.meta.documentSchemaVersion = "kcd-1";
 doc.nodes[root] = node({ id: root, type: "section", pageId: PAGE_A, orderKey: "V" });
 doc.nodes[text] = node({ id: text, type: "text", parentId: root, pageId: PAGE_A, orderKey: "V", props: { text: "Spatial story", href: "contact" } });
 return doc;
}
function apply(doc: ReturnType<typeof fixture>, ops: Op[]) {
 const result = prepareBuilderTransaction(doc, { txId: crypto.randomUUID(), origin: "user", label: "Layout", ops, expect: expectFor(doc, ops) });
 if (!result.ok) throw new Error(result.error.message); return result.prediction;
}
describe("3D spatial document operations", () => {
 it("commits the element and canvas atomically, restores both through Undo, and redoes", () => {
  const before = fixture(), ops = primitiveGeometryOperations(before, text, "desktop", { x: 40, y: 80, elementWidth: 320, elementHeight: 120 });
  const changed = apply(before, ops);
  expect(changed.document.nodes[text].props).toMatchObject({ position: "absolute", x: 40, y: 80, elementWidth: 320, elementHeight: 120 });
  expect(changed.document.nodes[root].props.canvasHeight).toBe(600);
  expect(changed.document.nodes[text].version).toBe(2); expect(changed.document.nodes[root].version).toBe(2);
  const undone = apply(changed.document, changed.inverse);
  expect(undone.document.nodes[text].props).toEqual(before.nodes[text].props); expect(undone.document.nodes[root].props).toEqual({});
  expect(apply(undone.document, undone.inverse).document.nodes[text].props).toEqual(changed.document.nodes[text].props);
 });
 it("keeps desktop, tablet and phone independent through storage and the detached public snapshot", () => {
  let doc = fixture();
  for (const [device, x] of [["desktop", 40], ["tablet", 20], ["mobile", 8]] as const) doc = apply(doc, primitiveGeometryOperations(doc, text, device, { x, y: 10, elementWidth: 200, elementHeight: 90 })).document;
  doc = apply(doc, primitivePropertyOperations(doc.nodes[text], "mobile", "layer", 7)).document;
  const restored = rowsToDocument(documentToRows(doc)).document;
  const published = createKcdPublishedSnapshot(restored);
  expect(published.snapshot.rendererRequirement.minVersion).toBe(3);
  const publicDoc = readKcdPublishedSnapshot(published.snapshot)!.nativeDocument;
  for (const [device, x] of [["desktop", 40], ["tablet", 20], ["mobile", 8]] as const) expect(resolveNode(publicDoc.nodes[text], device, primitiveDefinition(publicDoc.nodes[text])).x).toBe(x);
  expect(publicDoc.nodes[text].overrides.mobile?.layer).toBe(7); expect(publicDoc.nodes[text].props.layer).toBeUndefined();
 });
 it.each([{ x: NaN }, { x: Infinity }, { x: 10001 }, { elementWidth: 15 }, { elementHeight: -1 }, { x: "4" }, { css: "left:4px" }, {}, []])("rejects malformed or out-of-bounds gestures without writes: %j", patch => {
  const doc = fixture(); expect(() => primitiveGeometryOperations(doc, text, "desktop", patch)).toThrow(); expect(doc.nodes[text].props).toEqual({ text: "Spatial story", href: "contact" });
 });
 it("guards locked ancestors, insertion and reparenting; locks are persisted", () => {
  const doc = fixture(); doc.nodes[root].locked = true;
  expect(isSpatialLocked(doc, text)).toBe(true);
  expect(() => primitiveGeometryOperations(doc, text, "desktop", { x: 2 })).toThrow(/Unlock/);
  expect(() => primitiveInsertOperation(doc, PAGE_A, root, "text")).toThrow(/Unlock/);
  expect(() => primitiveReparentOperation(doc, text, root)).toThrow(/Unlock/);
  expect(rowsToDocument(documentToRows(doc)).document.nodes[root].locked).toBe(true);
 });
 it("bounds drag/resize results and rejects non-finite pointer coordinates", () => {
  const start = { x: 0, y: 0, elementWidth: 100, elementHeight: 80 };
  expect(gestureBox(start, -20000, 20000, false)).toEqual({ ...start, x: -10000, y: 10000 });
  expect(gestureBox(start, -200, 20000, true)).toEqual({ ...start, elementWidth: 16, elementHeight: 10000 });
  expect(() => gestureBox(start, NaN, 0, true)).toThrow();
 });
 it("renders linked geometry once and emits independent responsive layout before hydration", () => {
  let doc = fixture(); doc = apply(doc, primitiveGeometryOperations(doc, text, "desktop", { x: 80, y: 50, elementWidth: 280, elementHeight: 100 })).document;
  doc = apply(doc, primitiveGeometryOperations(doc, text, "mobile", { x: 8, y: 12, elementWidth: 220, elementHeight: 90 })).document;
  const html = (device: Device, responsive = false) => renderToStaticMarkup(createElement(KcdPrimitiveSubtree, { document: doc, rootId: root, device, responsive }));
  const out = html("desktop");
  expect(out.match(new RegExp(`data-kcd-node-id="${text}"`, "g"))).toHaveLength(1);
  expect(out).toContain('position:absolute;left:80px;top:50px;width:280px;height:100px'); expect(out).toContain('min-height:600px'); expect(out).toContain('href="/contact"');
  expect(html("mobile")).toContain('position:absolute;left:8px;top:12px;width:220px;height:90px');
  const publicHtml = html("desktop", true);
  expect(publicHtml).toContain('@media (width <= 640px)'); expect(publicHtml).toContain('left:8px!important;top:12px!important;width:220px!important');
 });
});


describe("3D alignment and snapping", () => {
 const box = { x: 30, y: 40, elementWidth: 200, elementHeight: 80 };
 it.each([["left",0,40],["center-x",200,40],["right",400,40],["top",30,0],["center-y",30,260],["bottom",30,520]] as const)("aligns %s while preserving dimensions", (alignment,x,y) => {
  expect(alignSpatialBox(box,{width:600,height:600},alignment)).toEqual({...box,x,y});
 });
 it("aligns oversized elements without silently changing their sizes",()=>{
  expect(alignSpatialBox({...box,elementWidth:800},{width:600,height:600},"right").x).toBe(-200);
 });
 it("persists an alignment as one geometry edit and restores it through the inverse",()=>{
  const doc=fixture(), aligned=alignSpatialBox(box,{width:600,height:600},"center-x");
  const changed=apply(doc,primitiveGeometryOperations(doc,text,"tablet",aligned));
  expect(changed.document.nodes[text].overrides.tablet?.x).toBe(200);
  expect(rowsToDocument(documentToRows(changed.document)).document.nodes[text].overrides.tablet?.x).toBe(200);
  expect(apply(changed.document,changed.inverse).document.nodes[text].overrides).toEqual({});
 });
 it("snaps the nearest edge or centre on independent axes",()=>{
  expect(snapSpatialBox(box,{x:[234],y:[77]},false)).toEqual({box:{...box,x:34,y:37},guides:[{axis:"x",position:234},{axis:"y",position:77}]});
 });
 it("uses screen-scaled tolerance and permits exact bypass without quantization",()=>{
  expect(snapSpatialBox(box,{x:[238],y:[]},false).guides).toEqual([]);
  expect(snapSpatialBox(box,{x:[238],y:[]},false,{x:12,y:12}).box.x).toBe(38);
 });
 it("resizes the bottom/right while retaining the top-left",()=>{
  expect(snapSpatialBox(box,{x:[234],y:[123]},true)).toEqual({box:{...box,elementWidth:204,elementHeight:83},guides:[{axis:"x",position:234},{axis:"y",position:123}]});
 });
 it("ignores snaps that violate bounds or minimum size",()=>{
  const tiny={x:0,y:0,elementWidth:16,elementHeight:16};
  expect(snapSpatialBox(tiny,{x:[12],y:[12]},true)).toEqual({box:tiny,guides:[]});
  const edge={...box,x:10000};expect(snapSpatialBox(edge,{x:[10204],y:[]},false).guides).toEqual([]);
 });
 it("resolves ties deterministically regardless of target storage order",()=>{
  expect(snapSpatialBox(box,{x:[34,26],y:[]},false).box.x).toBe(26);
  expect(snapSpatialBox(box,{x:[26,NaN,34,26],y:[]},false).box.x).toBe(26);
 });
 it("rejects non-finite geometry and negative tolerance",()=>{
  expect(()=>alignSpatialBox(box,{width:NaN,height:600},"left")).toThrow();
  expect(()=>snapSpatialBox(box,{x:[],y:[]},false,{x:-1,y:6})).toThrow();
 });
});
