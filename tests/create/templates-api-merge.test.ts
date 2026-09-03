import { describe, expect, it } from "vitest";
import { FLAGSHIP_TEMPLATE_SLUGS } from "@/lib/create/template-visuals";
import { isPublicTemplateSlug, publicTemplateSeeds } from "@/lib/create/templates-seed";

describe("templates API merge contract", () => {
  it("always has May Lecor + K-Direction in the public seed list used by /api/templates", () => {
    const slugs = publicTemplateSeeds().map((t) => t.slug);
    expect(slugs[0] === "musician-maylecor-ksendr" || slugs.includes("musician-maylecor-ksendr")).toBe(true);
    expect(slugs.includes("agency-kdirection")).toBe(true);
    expect(isPublicTemplateSlug("musician-maylecor-ksendr")).toBe(true);
    expect(isPublicTemplateSlug("agency-kdirection")).toBe(true);
  });

  it("orders flagship ahead of generic templates", () => {
    expect(FLAGSHIP_TEMPLATE_SLUGS[0]).toBe("musician-maylecor-ksendr");
    expect(FLAGSHIP_TEMPLATE_SLUGS[1]).toBe("agency-kdirection");
  });
});
