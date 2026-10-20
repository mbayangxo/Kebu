import { describe, expect, it } from "vitest";
import { parsePreviewEditorEvent } from "../../lib/create/preview-editor-events";

describe("embedded Builder editor commands", () => {
  it("retains the selected section, element and kind without extra fields", () => {
    expect(parsePreviewEditorEvent({ type: "kebu:element:select", selection: { sectionId: "section", elementId: "cutoutAccent", kind: "image", label: "Photo", unexpected: true } })).toEqual({ type: "kebu:element:select", selection: { sectionId: "section", elementId: "cutoutAccent", kind: "image", label: "Photo" } });
  });
  it("carries a bounded patch to the existing canonical mutation boundary", () => {
    const patch = { layerCrop: { cutoutAccent: 12 } };
    expect(parsePreviewEditorEvent({ type: "kebu:section:patch", sectionId: "section", patch })).toEqual({ type: "kebu:section:patch", sectionId: "section", patch });
  });
  it.each([null, [], {}, { type: "kebu:element:select", selection: { sectionId: "s", elementId: "e", label: "Photo", kind: { toString: null, valueOf: null } } }, { type: "kebu:element:select", selection: null }, { type: "kebu:element:select", selection: { sectionId: "s", elementId: "e", label: "Photo", kind: "admin" } }, { type: "kebu:section:patch", sectionId: "s", patch: [] }, { type: "kebu:section:patch", sectionId: "s", patch: JSON.parse('{"__proto__":{"admin":true}}') }, { type: "kebu:section:patch", sectionId: "s", patch: Object.fromEntries(Array.from({length: 129}, (_,i) => [String(i), 1])) }, { type: "kebu:page:navigate", slug: "x".repeat(161) }])("refuses malformed or unbounded commands %j", value => {
    expect(parsePreviewEditorEvent(value)).toBeNull();
  });
  it("accepts actual navigation commands", () => {
    expect(parsePreviewEditorEvent({ type: "kebu:page:navigate", slug: "about" })).toEqual({ type: "kebu:page:navigate", slug: "about" });
    expect(parsePreviewEditorEvent({ type: "kebu:navigation:edit" })).toEqual({ type: "kebu:navigation:edit" });
  });
});
