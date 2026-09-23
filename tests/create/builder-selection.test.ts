import { describe, expect, it } from "vitest";
import {
  builderElementSelection,
  selectionBelongsToSection,
} from "@/lib/create/builder-selection";

describe("builder element selection", () => {
  it("normalizes blank labels and preserves element identity", () => {
    expect(builderElementSelection("section-1", "titleLogo", "text", "  ")).toEqual({
      sectionId: "section-1",
      elementId: "titleLogo",
      kind: "text",
      label: "Element",
    });
  });

  it("scopes an element selection to its owning section", () => {
    const selection = builderElementSelection(
      "section-1",
      "cutoutLeft",
      "image",
      "Left cutout",
    );

    expect(selectionBelongsToSection(selection, "section-1")).toBe(true);
    expect(selectionBelongsToSection(selection, "section-2")).toBe(false);
    expect(selectionBelongsToSection(null, "section-1")).toBe(false);
  });
});
