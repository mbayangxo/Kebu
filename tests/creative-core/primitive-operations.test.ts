import { describe, expect, it } from "vitest";
import { buildIndex, expectFor, orderRootsForDevice, resolveNode, type KcdDocument, type NodeId, type Op } from "@/lib/creative-core";
import { builderNodeMoveOperations, primitiveDefinition, primitiveDuplicateOperation, primitiveInsertOperation, primitivePropertyOperations, primitiveReparentOperation, primitiveResetOverrideOperations, primitiveVisibilityOperation, primitiveVisibilityOperations } from "@/lib/create/kcd-primitive-operations";
import { prepareBuilderTransaction } from "@/lib/create/kcd-write-boundary";
import { documentToRows, rowsToDocument } from "@/lib/create/kcd-adapter";
import { content, emptyDocument, idSource, node, PAGE_A, PAGE_B, uuidFor } from "./helpers";
const root = uuidFor(1, 0xaa) as NodeId, group = uuidFor(2, 0xaa) as NodeId, text = uuidFor(3, 0xaa) as NodeId, legacy = uuidFor(4, 0xaa) as NodeId;
function fixture() {
  const doc = emptyDocument([PAGE_A, PAGE_B]); doc.meta.documentSchemaVersion = "kcd-1";
  for (const item of [node({ id: root, type: "section", pageId: PAGE_A, orderKey: "V" }), node({ id: group, type: "group", pageId: PAGE_A, parentId: root, orderKey: "V" }), node({ id: text, type: "text", pageId: PAGE_A, parentId: group, orderKey: "V", props: { text: "Desktop" } }), node({ id: legacy, type: "legacy-section:text", pageId: PAGE_A, orderKey: "W", props: { heading: "Legacy", body: "Preserved" } })]) doc.nodes[item.id] = item;
  return doc;
}
function apply(doc: KcdDocument, ops: Op[]) {
  const result = prepareBuilderTransaction(doc, { txId: uuidFor(1, 0xab), origin: "user", label: "Native edit", ops, expect: expectFor(doc, ops) });
  if (!result.ok) throw new Error(result.error.message);
  return result.prediction;
}
describe("native editor operation journeys", () => {
  it("inserts only permitted nesting, persists and restores hierarchy with stable identities", () => {
    const doc = fixture(), image = uuidFor(5, 0xaa) as NodeId;
    expect(() => apply(doc, [primitiveInsertOperation(doc, PAGE_A, null, "section")])).not.toThrow();
    const after = apply(doc, [primitiveInsertOperation(doc, PAGE_A, group, "image", image)]).document;
    const restored = rowsToDocument(documentToRows(after)).document;
    expect(content(restored).nodes).toEqual(content(after).nodes);
    expect(restored.pages).toEqual(after.pages);
    expect(restored.nodes[image].parentId).toBe(group);
    expect(() => primitiveInsertOperation(doc, PAGE_A, null, "text")).toThrow(/section/);
    expect(() => primitiveInsertOperation(doc, PAGE_A, group, "section")).toThrow(/section/);
    expect(() => primitiveInsertOperation(doc, PAGE_B, group, "text")).toThrow(/cannot contain/);
    expect(() => primitiveInsertOperation(doc, PAGE_A, legacy, "text")).toThrow(/cannot contain/);
  });
  it("edits independent phone/tablet overrides and resets one field without clearing the other", () => {
    let doc = fixture(); doc = apply(doc, primitivePropertyOperations(doc.nodes[text], "mobile", "text", "Phone")).document;
    doc = apply(doc, primitivePropertyOperations(doc.nodes[text], "tablet", "text", "Tablet")).document;
    expect(resolveNode(doc.nodes[text], "desktop", primitiveDefinition(doc.nodes[text])).text).toBe("Desktop");
    expect(resolveNode(doc.nodes[text], "mobile", primitiveDefinition(doc.nodes[text])).text).toBe("Phone");
    doc = apply(doc, primitiveResetOverrideOperations(doc.nodes[text], "mobile", "text")).document;
    expect(doc.nodes[text].overrides.tablet?.text).toBe("Tablet");
    expect(doc.nodes[text].overrides.mobile?.text).toBeUndefined();
    expect(doc.nodes[text].responsiveState?.mode).toBe("custom");
    doc = apply(doc, primitiveResetOverrideOperations(doc.nodes[text], "tablet", "text")).document;
    expect(doc.nodes[text].responsiveState?.mode).toBe("auto");
  });
  it("shared properties target the base and strict writes reject unsafe image/link addresses", () => {
    const doc = fixture();
    expect(primitivePropertyOperations(doc.nodes[text], "mobile", "color", "#123456")).toEqual([{ op: "setProp", id: text, path: "color", value: "#123456" }]);
    expect(() => apply(doc, primitivePropertyOperations(doc.nodes[text], "desktop", "href", "//foreign.example"))).toThrow();
    expect(() => apply(doc, primitivePropertyOperations(doc.nodes[text], "desktop", "href", "/\\foreign.example"))).toThrow();
    const op = primitiveInsertOperation(doc, PAGE_A, group, "image");
    if (op.op !== "insertNode") throw new Error("Wrong insert"); op.node.props.src = "//foreign.example/img";
    expect(() => apply(doc, [op])).toThrow();
    expect(() => primitivePropertyOperations(doc.nodes[text], "desktop", "unknown", "value")).toThrow(/not supported/);
  });
  it("root device moves retain native/legacy roots and hidden composition, excluding nested ids", () => {
    const doc = fixture(), hidden = uuidFor(9, 0xaa) as NodeId;
    doc.nodes[hidden] = node({ id: hidden, type: "section", pageId: PAGE_A, orderKey: "X" });
    doc.pages[0].deviceLayout.mobile = { hidden: [hidden] };
    const after = apply(doc, builderNodeMoveOperations(doc, root, 1, "mobile")).document;
    expect(after.pages[0].deviceLayout.mobile).toEqual({ order: [legacy, root], hidden: [hidden] });
    expect(orderRootsForDevice(buildIndex(after).children(PAGE_A, null), after.pages[0], "desktop").map((n) => n.id)).toEqual([root, legacy, hidden]);
    expect(orderRootsForDevice(buildIndex(after).children(PAGE_A, null), after.pages[0], "mobile").map((n) => n.id)).toEqual([legacy, root, hidden]);
    expect(apply(doc, builderNodeMoveOperations(doc, legacy, -1)).document.nodes[legacy].orderKey < doc.nodes[root].orderKey).toBe(true);
  });
  it("root moves cross rendered siblings instead of suppressed stored chrome", () => {
    const doc = fixture(), navigation = uuidFor(12, 0xaa) as NodeId;
    doc.meta.siteChrome = { enabled: true, header: { type: "navigation", props: { brand: "Shared brand", links: [] } } };
    doc.nodes[navigation] = node({ id: navigation, type: "legacy-section:navigation", pageId: PAGE_A, orderKey: "VV", props: {} });
    const desktop = apply(doc, builderNodeMoveOperations(doc, root, 1)).document;
    expect(desktop.nodes[root].orderKey > desktop.nodes[legacy].orderKey).toBe(true);
    expect(desktop.nodes[navigation]).toEqual(doc.nodes[navigation]);
    const phone = apply(doc, builderNodeMoveOperations(doc, root, 1, "mobile")).document;
    expect(phone.pages[0].deviceLayout.mobile?.order).toEqual([legacy, root]);
  });
  it("duplicates complete trees with fresh identities and reverses removal atomically", () => {
    const doc = fixture(), copied = apply(doc, [primitiveDuplicateOperation(doc, root, idSource(0xac))]);
    const ids = Object.keys(copied.document.nodes).filter((id) => !doc.nodes[id as NodeId]) as NodeId[];
    expect(ids).toHaveLength(3);
    const newRoot = ids.find((id) => copied.document.nodes[id].parentId === null)!;
    const newGroup = ids.find((id) => copied.document.nodes[id].parentId === newRoot)!;
    expect(ids.some((id) => copied.document.nodes[id].parentId === newGroup && copied.document.nodes[id].props.text === "Desktop")).toBe(true);
    expect(content(apply(copied.document, copied.inverse).document)).toEqual(content(doc));
    const removed = apply(doc, [{ op: "removeNode", id: root }]);
    expect(Object.keys(removed.document.nodes)).toEqual([legacy]);
    expect(content(apply(removed.document, removed.inverse).document)).toEqual(content(doc));
  });
  it("hides/shows one device with schema-valid empty-list removal and preserves other visibility", () => {
    const doc = fixture();
    const hidden = apply(doc, [primitiveVisibilityOperation(doc.nodes[text], "mobile", true)]).document;
    expect(hidden.nodes[text].visibility).toEqual({ hideOn: ["mobile"] });
    expect(apply(hidden, [primitiveVisibilityOperation(hidden.nodes[text], "mobile", false)]).document.nodes[text].visibility).toBeUndefined();
    doc.nodes[text].visibility = { showOn: ["desktop"] };
    expect(apply(doc, [primitiveVisibilityOperation(doc.nodes[text], "mobile", false)]).document.nodes[text].visibility).toEqual({ showOn: ["desktop", "mobile"] });
  });
  it("reparents without changing identity and rejects descendant cycles", () => {
    const doc = fixture(); const after = apply(doc, [primitiveReparentOperation(doc, text, root)]).document;
    expect(after.nodes[text].parentId).toBe(root); expect(after.nodes[text].props.text).toBe("Desktop");
    expect(() => primitiveReparentOperation(doc, root, group)).toThrow();
    expect(() => primitiveReparentOperation(doc, group, group)).toThrow(/inside itself/);
  });
});

it("showing a stored hidden root clears its page gate atomically and preserves other devices",()=>{
 const doc=fixture();doc.nodes[root].props.hidden=true;doc.pages[0].deviceLayout.mobile={hidden:[root],order:[legacy]};
 const result=apply(doc,primitiveVisibilityOperations(doc,doc.nodes[root],"mobile",false));
 expect(result.document.nodes[root].props.hidden).toBeUndefined();expect(result.document.nodes[root].visibility).toEqual({showOn:["mobile"]});expect(result.document.pages[0].deviceLayout.mobile).toEqual({order:[legacy]});
 expect(content(apply(result.document,result.inverse).document)).toEqual(content(doc));
});
