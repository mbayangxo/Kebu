import { describe, expect, it } from "vitest";
import {
  STUDIO_FONTS_CATALOG,
  googleFontsHrefForStudioCatalog,
  studioFontByFamily,
  studioFontFamilies,
} from "@/lib/studio/fonts-catalog";
import {
  applyAestheticToCanvas,
  applyBrandKitToCanvas,
  brandKitToStudioTokens,
} from "@/lib/studio/brand-apply";
import { defaultCanvasDocument } from "@/lib/studio/canvas-document";
import type { BrandKitRow } from "@/lib/studio/brand-kit";
import { getCreatePreset, blankCanvasForPreset } from "@/lib/studio/create-presets";
import { STUDIO_TEMPLATES } from "@/lib/studio/templates";

describe("Studio fonts catalog", () => {
  it("exposes curated families with stacks", () => {
    expect(STUDIO_FONTS_CATALOG.length).toBeGreaterThanOrEqual(8);
    expect(studioFontFamilies()).toContain("Fraunces");
    expect(studioFontByFamily("Syne")?.role).toBe("display");
    expect(googleFontsHrefForStudioCatalog()).toMatch(/fonts\.googleapis\.com/);
  });
});

describe("Studio brand aesthetic apply", () => {
  const kit: BrandKitRow = {
    id: "00000000-0000-4000-8000-000000000001",
    owner_id: "u1",
    business_id: null,
    name: "Test kit",
    logo_url: "",
    primary_color: "#111111",
    accent_color: "#00C851",
    background_color: "#0A0A0A",
    text_color: "#FAFAF8",
    font_display: "Oswald",
    font_body: "Inter",
    created_at: "",
    updated_at: "",
  };

  it("maps kit to tokens", () => {
    expect(brandKitToStudioTokens(kit).accent).toBe("#00C851");
  });

  it("applies brand kit to canvas layers", () => {
    const doc = defaultCanvasDocument("poster");
    const next = applyBrandKitToCanvas(doc, kit);
    expect(next.backgroundColor).toBe("#0A0A0A");
    const headline = next.layers.find((l) => l.name === "Headline");
    expect(headline?.fontFamily).toBe("Oswald");
    expect(headline?.color).toBe("#FAFAF8");
    const cta = next.layers.find((l) => l.name === "CTA");
    expect(cta?.fill).toBe("#00C851");
  });

  it("applies named aesthetic look", () => {
    const doc = defaultCanvasDocument("instagram_post");
    const next = applyAestheticToCanvas(doc, "dakar-night");
    expect(next.backgroundColor).toBe("#111111");
    const cta = next.layers.find((l) => l.name === "CTA");
    expect(cta?.fill).toBe("#00C851");
  });
});

describe("Studio posters banners cards", () => {
  it("exposes banner and business card presets", () => {
    expect(getCreatePreset("banner")?.width).toBe(1500);
    expect(getCreatePreset("business_card")?.height).toBe(600);
    const banner = blankCanvasForPreset(getCreatePreset("banner")!);
    expect(banner.width).toBe(1500);
    expect(banner.layers.some((l) => l.name === "Headline")).toBe(true);
    const card = blankCanvasForPreset(getCreatePreset("business_card")!);
    expect(card.width).toBe(1050);
  });

  it("lists banner and card templates", () => {
    expect(STUDIO_TEMPLATES.some((t) => t.designType === "banner")).toBe(true);
    expect(STUDIO_TEMPLATES.some((t) => t.designType === "business_card")).toBe(true);
  });
});
