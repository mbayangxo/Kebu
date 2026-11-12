import { describe, expect, it } from "vitest";
import type { NodeId } from "@/lib/creative-core";
import { createKcdRenderProjection, kcdRenderDefinition } from "@/lib/create/kcd-adapter/render-view";
import { builderKcdDocumentView, builderKcdView } from "@/lib/create/kcd-adapter/builder-view";
import { documentToRows } from "@/lib/create/kcd-adapter";
import { emptyDocument, node, PAGE_A, uuidFor } from "./helpers";
const first = uuidFor(1, 0x96) as NodeId, other = uuidFor(2, 0x96) as NodeId;
function fixture() {
  const doc = emptyDocument(); doc.meta.documentSchemaVersion = "kcd-1";
  doc.nodes[first] = node({ id: first, pageId: PAGE_A, orderKey: "V", type: "legacy-section:hero", props: { heading: "Original" } });
  doc.nodes[other] = node({ id: other, pageId: PAGE_A, orderKey: "W", type: "legacy-section:text", props: { heading: "Unchanged", body: "Story" }, overrides: { mobile: { heading: "Phone" } } });
  return doc;
}
describe("immutable Builder render projection", () => {
  it("matches the canonical renderer and keeps unchanged sections by identity after edit/Undo/Redo", () => {
    const doc = fixture(), render = createKcdRenderProjection(), original = render(doc);
    expect(original).toEqual(kcdRenderDefinition(doc));
    const edited = { ...doc, nodes: { ...doc.nodes, [first]: { ...doc.nodes[first], version: 2, props: { heading: "Edited" } } } };
    const next = render(edited);
    expect(next).toEqual(kcdRenderDefinition(edited));
    expect(next.pages[0].sections[1]).toBe(original.pages[0].sections[1]);
    expect(next.pages[0].sections[0]).not.toBe(original.pages[0].sections[0]);
    expect(render(doc)).toEqual(original); expect(render(edited)).toEqual(next);
  });
  it("does not read unchanged content again and refuses unsupported nested/native nodes", () => {
    const doc = fixture(), render = createKcdRenderProjection(); render(doc);
    Object.defineProperty(doc.nodes[other], "props", { get() { throw new Error("Unchanged content reserialized"); } });
    expect(render({ ...doc, nodes: { ...doc.nodes, [first]: { ...doc.nodes[first], version: 2 } } }).pages[0].sections[1].props).toMatchObject({ heading: "Unchanged" });
    expect(() => render({ ...doc, nodes: { ...doc.nodes, [first]: { ...doc.nodes[first], type: "text" } } })).toThrow(/cannot be displayed/);
  });
  it("reflects live chrome/title/theme/SEO while matching the row-based Builder path", () => {
    const doc = fixture(), rows = documentToRows(doc);
    const project = { ...rows.project, title: "Renamed", theme: { primary: "#123456", fontDisplay: "Fraunces", fontBody: "Inter" }, seo: { title: "SEO title" } };
    const siteChrome = { enabled: true, header: { type: "navigation", props: { brand: "Changed brand", links: [] } } };
    expect(builderKcdDocumentView(doc, project, siteChrome, createKcdRenderProjection())).toEqual(builderKcdView({ project, pages: rows.pages, sections: rows.sections, siteChrome }));
  });
});
