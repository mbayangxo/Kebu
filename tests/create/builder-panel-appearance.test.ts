import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BUILDER } from "@/lib/create/builder-ui";
import { BUILDER_PANEL, builderPanelVariables } from "@/lib/create/builder-panel-appearance";
import { BUILDER_APPEARANCE_PALETTES } from "@/lib/create/builder-appearance";
import { BuilderAppearanceProvider, BuilderPanelScope } from "@/app/components/create/builder-appearance-provider";
import { KcdPrimitivePanel } from "@/app/components/create/kcd/primitive-panel";
import { parseDocument, serializeDocument } from "@/lib/creative-core";
import envelope from "@/evidence/3c/s7/qa/publish-envelope.json";
import { SiteImageUpload } from "@/app/components/create/site-image-upload";
import { SiteMediaUpload } from "@/app/components/create/site-media-upload";

describe("Opt-in inspector color boundary", () => {
  it.each(["image", "video"] as const)("%s upload box defines its foreground with its surface rather than inheriting pale text", kind => {
    const html = kind === "image"
      ? renderToStaticMarkup(createElement(SiteImageUpload, { projectId: "qa-fixture", kind: "section", value: "", onChange: () => {} }))
      : renderToStaticMarkup(createElement(SiteMediaUpload, { projectId: "qa-fixture", kind: "video", value: "", onChange: () => {}, showPreview: false }));
    const rootStyle = html.match(/^<div[^>]*style="([^"]+)"/)?.[1];
    expect(rootStyle).toContain("background:var(--builder-panel-surface-muted, #F6F6F7)");
    expect(rootStyle).toContain("color:var(--builder-panel-ink, #0A0A0A)");
    expect(rootStyle).toContain("color-scheme:var(--builder-panel-color-scheme, light)");
  });
  it.each(["light", "dark"] as const)("%s variables are panel-only and keep site/legacy colors intact", appearance => {
    const variables = builderPanelVariables(appearance);
    expect(Object.keys(variables).every(key => key.startsWith("--builder-panel-"))).toBe(true);
    expect(variables["--builder-panel-ink"]).toBe(BUILDER_APPEARANCE_PALETTES[appearance].ink);
    expect(variables["--builder-panel-surface"]).toBe(BUILDER_APPEARANCE_PALETTES[appearance].surface);
    expect(BUILDER.ink).toBe("#0A0A0A");
    expect(BUILDER.surface).toBe("#FFFFFF");
    // Accent backgrounds still support the picker's existing alpha concatenation.
    expect(BUILDER_PANEL.orange).toBe("#FF6A00");
  });
  it("renders the actual inspector with scoped variables without changing document values", () => {
    const parsed = parseDocument(envelope.snapshot.document);
    if (!parsed.ok) throw new Error("Invalid original QA envelope");
    const document = parsed.document;
    const before = serializeDocument(document);
    const node = Object.values(document.nodes).find(node => node.type === "text")!;
    const html = renderToStaticMarkup(createElement(BuilderAppearanceProvider, null,
      createElement(BuilderPanelScope, null, createElement(KcdPrimitivePanel, {
        document, pageId: document.pages[0].id, device: "desktop", selectedId: node.id,
        onSelect: () => {}, onSubmit: async () => {},
      })),
      createElement("div", { "data-customer-fixture": true, style: { background: "#FFF8E7", color: "#173B2B" } }, "Customer content"),
    ));
    expect(html).toContain('data-builder-panel-appearance="light"');
    expect(html).toContain("color-scheme:var(--builder-panel-color-scheme, light)");
    expect(html).toContain("background:var(--builder-panel-surface, #FFFFFF)");
    expect(html).toContain("background:#FFF8E7;color:#173B2B");
    expect(html).toContain("QA native story");
    expect(serializeDocument(document)).toBe(before);
  });
});
