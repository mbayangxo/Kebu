import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SiteRenderer } from "@/app/components/create/site-renderer";
import { builderKcdDocumentView, builderKcdView } from "@/lib/create/kcd-adapter/builder-view";
import { createKcdRenderProjection, kcdLegacyRenderDefinition, kcdRenderDefinition, PILOT_WEB_DOM_MANIFEST, WEB_DOM_MANIFEST } from "@/lib/create/kcd-adapter/render-view";
import { documentToRows } from "@/lib/create/kcd-adapter";
import { emptyDocument, node, PAGE_A, uuidFor } from "./helpers";
import { evenlySpacedKeys, type Device, type NodeId } from "@/lib/creative-core";
const legacy = uuidFor(1, 0xbe) as NodeId, root = uuidFor(2, 0xbe) as NodeId, text = uuidFor(3, 0xbe) as NodeId;
function fixture() { const doc = emptyDocument(); doc.meta.documentSchemaVersion = "kcd-1"; const keys = evenlySpacedKeys(2);
  doc.nodes[legacy] = node({ id: legacy, type: "legacy-section:text", pageId: PAGE_A, orderKey: keys[0], props: { heading: "Legacy story", body: "Unchanged legacy body" } });
  doc.nodes[root] = node({ id: root, type: "section", pageId: PAGE_A, orderKey: keys[1], props: { background: "token:primary" } });
  doc.nodes[text] = node({ id: text, type: "text", pageId: PAGE_A, parentId: root, orderKey: "V", props: { text: "Native desktop" }, overrides: { mobile: { text: "Native phone" } } });
  return doc;
}
function html(doc: ReturnType<typeof fixture>, device: Device = "desktop") { return renderToStaticMarkup(createElement(SiteRenderer, { definition: kcdLegacyRenderDefinition(doc), nativeDocument: doc, mode: "preview", editor: { editDevice: device } })); }
describe("shared mixed-page renderer", () => {
  it("retains legacy/native roots in canonical order without converting native content into website-v1", () => {
    const doc = fixture(); const definition = kcdLegacyRenderDefinition(doc);
    expect(definition.pages[0].sections.map((section) => section.id)).toEqual([legacy]);
    const desktop = html(doc), phone = html(doc, "mobile");
    expect(desktop.indexOf("Legacy story")).toBeLessThan(desktop.indexOf("Native desktop"));
    expect(phone).toContain("Native phone"); expect(phone).not.toContain("Native desktop");
    expect(phone.match(new RegExp(`data-kcd-node-id="${text}"`, "g"))).toHaveLength(1);
  });
  it("uses canonical chrome and page composition for both root types", () => {
    const doc = fixture(); doc.meta.siteChrome = { enabled: true, header: { type: "navigation", props: { brand: "Shared brand", links: [] } }, footer: { type: "footer", props: { text: "Shared footer" } } };
    doc.pages[0].deviceLayout.mobile = { order: [root, legacy] };
    const output = html(doc, "mobile");
    expect(output.indexOf("Shared brand")).toBeLessThan(output.indexOf("Native phone"));
    expect(output.indexOf("Native phone")).toBeLessThan(output.indexOf("Legacy story"));
    expect(output.indexOf("Legacy story")).toBeLessThan(output.indexOf("Shared footer"));
    doc.pages[0].deviceLayout.mobile = { hidden: [root] };
    expect(html(doc, "mobile")).not.toContain("Native phone"); expect(html(doc)).toContain("Native desktop");
  });
  it("loads canonical native documents from saved rows and reflects live theme tokens", () => {
    const doc = fixture(), rows = documentToRows(doc);
    const view = builderKcdView({ project: rows.project, pages: rows.pages, sections: rows.sections, siteChrome: null });
    expect(view.ok && view.nativeDocument?.nodes[text].parentId).toBe(root);
    const live = builderKcdDocumentView(doc, { ...rows.project, theme: { primary: "#123456" } }, null, createKcdRenderProjection(true));
    expect(live.ok && live.nativeDocument?.tokens.primary).toBe("#123456");
    const edited = { ...doc, nodes: { ...doc.nodes, [text]: { ...doc.nodes[text], props: { text: "Edited" } } } };
    const render = createKcdRenderProjection(true), before = render(doc), after = render(edited);
    expect(after.pages[0].sections[0]).toBe(before.pages[0].sections[0]);
  });
  it("keeps the release renderer manifest closed and explicitly refuses unknown types/versions", () => {
    const doc = fixture(); expect(() => kcdRenderDefinition(doc)).toThrow(/cannot be displayed/);
    expect(WEB_DOM_MANIFEST.supportsNodeType("section", 1)).toBe(false);
    expect(PILOT_WEB_DOM_MANIFEST.supportsNodeType("section", 1)).toBe(true);
    doc.nodes[text].typeVersion = 2; expect(() => kcdLegacyRenderDefinition(doc)).toThrow(/cannot be displayed/);
  });
  it("matches the existing legacy-only render view exactly", () => {
    const doc = fixture(); delete doc.nodes[root]; delete doc.nodes[text];
    expect(kcdLegacyRenderDefinition(doc)).toEqual(kcdRenderDefinition(doc));
  });
});
