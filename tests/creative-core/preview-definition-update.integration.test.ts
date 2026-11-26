import { describe, expect, it } from "vitest";
import { websiteDefinitionSchema } from "@/lib/create/website-schema";
import { applyPreviewDefinitionUpdate, previewDefinitionUpdate } from "@/lib/create/preview-definition-update";
const first = "11111111-1111-4111-8111-111111111111", second = "22222222-2222-4222-8222-222222222222";
function definition() {
  return websiteDefinitionSchema.parse({ schemaVersion: "website-v1", title: "Preview", theme: {}, pages: [{ slug: "home", title: "Home", sections: [
    { id: first, type: "hero", props: { heading: "Original" } }, { id: second, type: "text", props: { heading: "Unchanged", body: "Text" } },
  ] }] });
}
describe("responsive preview incremental transport", () => {
  it("sends initial full state then only changed content; structured-cloned deltas retain unchanged receiver identities", () => {
    const original = definition(), receiver = structuredClone(original);
    expect(previewDefinitionUpdate(null, original, 1, 0)).toEqual({ kind: "full", sequence: 1, definition: original });
    const changed = { ...original.pages[0].sections[0], props: { heading: "Edited" } };
    const next = { ...original, pages: [{ ...original.pages[0], sections: [changed, original.pages[0].sections[1]] }] };
    const update = previewDefinitionUpdate(original, next, 2, 1);
    expect(update.kind).toBe("delta"); if (update.kind !== "delta") throw new Error("Expected delta");
    expect(update.sections).toEqual([changed]);
    const result = applyPreviewDefinitionUpdate(receiver, 1, structuredClone(update))!;
    expect(result).toEqual(next);
    expect(result.pages[0].sections[1]).toBe(receiver.pages[0].sections[1]);
    expect(result.pages[0].sections[0]).not.toBe(receiver.pages[0].sections[0]);
  });
  it("preserves exact page order, removed sections, page metadata, themes and responsive composition", () => {
    const original = definition();
    const next = { ...original, title: "New title", theme: { ...original.theme, backgroundColor: "#123456" }, pages: [
      { ...original.pages[0], slug: "shop", title: "Shop", sections: [original.pages[0].sections[1]] },
    ] };
    const update = previewDefinitionUpdate(original, next, 2, 1);
    expect(applyPreviewDefinitionUpdate(original, 1, structuredClone(update))).toEqual(next);
  });
  it("uses full state for id-less legacy sections and full refresh after a dropped delta", () => {
    const original = definition();
    const legacy = { ...original, pages: [{ ...original.pages[0], sections: original.pages[0].sections.map((section) => ({ ...section, id: undefined })) }] };
    expect(previewDefinitionUpdate(legacy, legacy, 2, 1).kind).toBe("full");
    const delta = previewDefinitionUpdate(original, original, 3, 2);
    expect(applyPreviewDefinitionUpdate(original, 1, delta)).toBeNull();
    expect(applyPreviewDefinitionUpdate(null, 0, delta)).toBeNull();
    expect(applyPreviewDefinitionUpdate(original, 1, previewDefinitionUpdate(null, original, 4, 3))).toBe(original);
  });
  it("rejects a missing section or duplicate placement without mutating the existing preview", () => {
    const original = definition(), update = previewDefinitionUpdate(original, original, 2, 1);
    if (update.kind !== "delta") throw new Error("Expected delta");
    update.pages[0].sectionIds = ["missing"];
    expect(applyPreviewDefinitionUpdate(original, 1, update)).toBeNull();
    update.pages[0].sectionIds = [first, first];
    expect(applyPreviewDefinitionUpdate(original, 1, update)).toBeNull();
    expect(original.pages[0].sections).toHaveLength(2);
  });
});
