import { describe, expect, it } from "vitest";
import {
  STUDIO_TEMPLATES,
  filterStudioTemplates,
  findStudioTemplate,
  buildCanvasFromTemplate,
} from "@/lib/studio/templates";

describe("Studio template discovery", () => {
  it("filters by category", () => {
    const commerce = filterStudioTemplates(STUDIO_TEMPLATES, { category: "commerce" });
    expect(commerce.length).toBeGreaterThan(0);
    expect(commerce.every((t) => t.category === "commerce")).toBe(true);
  });

  it("filters by design type", () => {
    const stories = filterStudioTemplates(STUDIO_TEMPLATES, { designType: "instagram_story" });
    expect(stories.every((t) => t.designType === "instagram_story")).toBe(true);
  });

  it("searches by tag and label", () => {
    const whatsapp = filterStudioTemplates(STUDIO_TEMPLATES, { query: "whatsapp" });
    expect(whatsapp.length).toBeGreaterThan(0);
    expect(whatsapp.some((t) => t.id.includes("whatsapp"))).toBe(true);

    const sale = filterStudioTemplates(STUDIO_TEMPLATES, { query: "sale" });
    expect(sale.some((t) => t.tags.includes("sale") || t.label.toLowerCase().includes("sale"))).toBe(
      true,
    );
  });

  it("returns empty for nonsense query", () => {
    expect(filterStudioTemplates(STUDIO_TEMPLATES, { query: "zzzz-no-match" })).toHaveLength(0);
  });

  it("finds template by id and builds editable canvas", () => {
    const t = findStudioTemplate("poster-opening");
    expect(t).toBeTruthy();
    const doc = buildCanvasFromTemplate(t!, "Kebu Shop");
    expect(doc.version).toBe(2);
    expect(doc.layers.some((l) => l.text === "Kebu Shop")).toBe(true);
  });
});
