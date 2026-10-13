import { describe, expect, it } from "vitest";
import { expectFor, type NodeId } from "@/lib/creative-core";
import { initialBuilderRows, projectBuilderEdit } from "@/lib/create/kcd-builder-projection";
import { prepareBuilderTransaction } from "@/lib/create/kcd-write-boundary";
import { emptyDocument, node, PAGE_A, uuidFor } from "./helpers";
const id = uuidFor(1, 0x94) as NodeId;
const other = uuidFor(2, 0x94) as NodeId;
function fixture() {
  const doc = emptyDocument(); doc.meta.documentSchemaVersion = "kcd-1";
  doc.nodes[id] = node({ id, type: "legacy-section:hero", pageId: PAGE_A, orderKey: "V", props: { heading: "One", align: "center" } });
  doc.nodes[other] = node({ ...doc.nodes[id], id: other, orderKey: "W", props: { heading: "Untouched" } });
  return doc;
}
describe("incremental Builder projection", () => {
  it("updates canonical stored props/version and preserves untouched row identity", () => {
    const doc = fixture(); const rows = initialBuilderRows(doc);
    const ops = [{ op: "setProp" as const, id, path: "heading", value: "Edited" }];
    const result = prepareBuilderTransaction(doc, { txId: uuidFor(3, 0x94), origin: "user", label: "Edit", expect: expectFor(doc, ops), ops });
    if (!result.ok) throw new Error(result.error.message);
    const projected = projectBuilderEdit(doc, result.prediction.document, rows);
    expect(projected.sections[0]).toMatchObject({ props: { heading: "Edited" }, node_version: 2 });
    expect(projected.sections[1]).toBe(rows.sections[1]); expect(projected.pages).toBe(rows.pages);
  });
  it("does not serialize or inspect untouched props during a content edit", () => {
    const doc = fixture(); const rows = initialBuilderRows(doc);
    const next = { ...doc, nodes: { ...doc.nodes, [id]: { ...doc.nodes[id], version: 2, props: { heading: "Edited" } } } };
    Object.defineProperty(doc.nodes[other], "props", { get() { throw new Error("Untouched content serialized"); } });
    expect(projectBuilderEdit(doc, next, rows).sections[0].props.heading).toBe("Edited");
  });
  it("reprojects ordering for structural changes and page layout changes", () => {
    const doc = fixture(); const rows = initialBuilderRows(doc);
    const next = { ...doc, nodes: { ...doc.nodes, [id]: { ...doc.nodes[id], orderKey: "Z" } } };
    expect(projectBuilderEdit(doc, next, rows).sections.map((row) => row.id)).toEqual([other, id]);
    const device = { ...doc, pages: [{ ...doc.pages[0], layoutVersion: 2, deviceLayout: { mobile: { hidden: [id] } } }] };
    expect(projectBuilderEdit(doc, device, rows).pages[0]).toMatchObject({ layout_version: 2, device_layouts: { mobile: { hiddenSections: [id] } } });
  });
});
