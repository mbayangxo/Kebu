import { describe, expect, it } from "vitest";
import {
  defaultCanvasDocument,
  parseCanvasDocument,
  canvasDocumentSchema,
} from "@/lib/studio/canvas-document";
import { STUDIO_TEMPLATES, buildCanvasFromTemplate } from "@/lib/studio/templates";
import { brandKitToTheme } from "@/lib/studio/brand-kit";
import { validateFormPayload } from "@/lib/create/site-forms";
import { slugifyCollectionName } from "@/lib/shop/product-collections";

describe("S1 studio canvas", () => {
  it("creates layer document with text and shapes", () => {
    const doc = defaultCanvasDocument("instagram_post", { businessName: "Baobab" });
    expect(doc.version).toBe(2);
    expect(doc.pages.length).toBeGreaterThanOrEqual(1);
    expect(doc.layers.length).toBeGreaterThan(2);
    expect(canvasDocumentSchema.safeParse(doc).success).toBe(true);
  });

  it("migrates legacy flat canvas to layers", () => {
    const doc = parseCanvasDocument(
      {
        headline: "Sale",
        businessName: "Shop",
        backgroundColor: "#000",
        accentColor: "#f00",
        cta: "Buy",
      },
      "poster",
    );
    expect(doc.layers.some((l) => l.text?.includes("Sale"))).toBe(true);
  });
});

describe("S2 studio templates", () => {
  it("includes IG, story, flyer templates", () => {
    const types = STUDIO_TEMPLATES.map((t) => t.designType);
    expect(types).toContain("instagram_post");
    expect(types).toContain("instagram_story");
    expect(types).toContain("flyer");
    expect(STUDIO_TEMPLATES.length).toBeGreaterThanOrEqual(10);
  });

  it("builds canvas from template preset with pages synced", () => {
    const t = STUDIO_TEMPLATES[0]!;
    const doc = buildCanvasFromTemplate(t, "Ndeye Fashion");
    expect(doc.layers.some((l) => l.text?.includes("Ndeye") || l.text?.includes(t.preset?.headline ?? ""))).toBe(
      true,
    );
    expect(doc.pages[0]?.layers.length).toBe(doc.layers.length);
  });
});

describe("S3/S6 brand kit", () => {
  it("maps brand kit row to builder theme", () => {
    const theme = brandKitToTheme({
      id: "1",
      owner_id: "u",
      business_id: null,
      name: "Kit",
      logo_url: "/logo.png",
      primary_color: "#111",
      accent_color: "#E05A2B",
      background_color: "#fff",
      text_color: "#111",
      font_display: "Fraunces",
      font_body: "system-ui",
      created_at: "",
      updated_at: "",
    });
    expect(theme.primary).toBe("#111");
    expect(theme.fontDisplay).toBe("Fraunces");
  });
});

describe("C5 collections", () => {
  it("slugifies collection names", () => {
    expect(slugifyCollectionName("Summer Drop 2026")).toBe("summer-drop-2026");
  });
});

describe("W14 forms", () => {
  it("validates required form fields", () => {
    const fields = [
      { id: "name", label: "Name", type: "text" as const, required: true, placeholder: "", options: [] },
      { id: "message", label: "Message", type: "textarea" as const, required: true, placeholder: "", options: [] },
    ];
    expect(validateFormPayload(fields, { name: "", message: "Hi" }).ok).toBe(false);
    const ok = validateFormPayload(fields, { name: "Awa", message: "Hello" });
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.cleaned.name).toBe("Awa");
  });
});
