import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { YandeAssistant } from "@/app/components/create/yande-assistant";
import { BuilderAiPreviewPanel } from "@/app/components/create/builder-ai-preview-panel";
import { YandePanelBody, type YandePanelBodyProps } from "@/app/components/create/yande-panel-body";

const change = { sectionId: "hero", pageSlug: "home", pageTitle: "Home", sectionType: "hero", summary: "Change heading", isNew: false };
const noop = () => {};
const proposal = (selected: string[], busy = false, changes = [change]) => renderToStaticMarkup(createElement(BuilderAiPreviewPanel, {
  intents: ["Change colors"], sectionChanges: changes, acceptedSectionIds: new Set(selected),
  onToggleSection: noop, onSelectAll: noop, onClearAll: noop, onApply: noop, onDiscard: noop, busy,
}));

describe("Yande proposal approval and appearance regressions", () => {
  it("pairs assistant surfaces with explicit semantic foreground and form scheme", () => {
    const html = renderToStaticMarkup(createElement(YandeAssistant, { variant: "improve", value: "Change heading", onChange: noop, onSubmit: noop }));
    expect(html).toContain("background:var(--builder-panel-surface-muted, #F6F6F7);color:var(--builder-panel-ink, #0A0A0A);color-scheme:var(--builder-panel-color-scheme, light)");
    expect(html).not.toContain("background:#fff");
    expect(html).toContain("background:var(--builder-panel-action, #0A0A0A);color:var(--builder-panel-on-action, #FFFFFF)");
  });
  it("disables Apply when every changed section is unchecked", () => {
    expect(proposal([])).toMatch(/<button[^>]*disabled=""[^>]*>Apply/);
    expect(proposal(["hero"])).not.toMatch(/<button[^>]*disabled=""[^>]*>Apply/);
  });
  it("keeps intent-only proposals approvable without invented section IDs", () => {
    expect(proposal([], false, [])).not.toMatch(/<button[^>]*disabled=""[^>]*>Apply/);
  });
  it("locks all selection and approval actions during a request", () => {
    const html = proposal(["hero"], true);
    expect((html.match(/<button[^>]*disabled=""/g) ?? [])).toHaveLength(4);
    expect(html).toMatch(/<input[^>]*disabled=""/);
  });
  it("selected rows keep a themed surface rather than pale text on a fixed cream background", () => {
    const html = proposal(["hero"]);
    expect(html).not.toContain("#FFF4EC");
    expect(html).toContain("border-left:3px solid #FF5500");
    expect(html).toContain("color:var(--builder-panel-muted, #616161)");
  });
  it("the proposed-change body has one authoritative Apply path independent of the old prompt", () => {
    const props: YandePanelBodyProps = {
      aiPreview: { definition: {} as NonNullable<YandePanelBodyProps["aiPreview"]>["definition"], intents: [], sectionChanges: [change], acceptedSectionIds: new Set(), repaired: false },
      improving: false, improveMode: "free", improveInstruction: "Old prompt", improveNote: null,
      setImproveMode: noop, setImproveInstruction: noop, setAiPreview: noop,
      applyAiPreview: noop, discardAiPreview: noop, previewWithAi: noop,
    };
    const html = renderToStaticMarkup(createElement(YandePanelBody, props));
    expect(html).not.toContain("<textarea");
    expect((html.match(/>Apply/g) ?? [])).toHaveLength(1);
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Apply/);
  });
});
