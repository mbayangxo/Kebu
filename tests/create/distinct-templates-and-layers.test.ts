import { describe, expect, it } from "vitest";
import { sectionPropsSchemas, websiteDefinitionSchema } from "@/lib/create/website-schema";
import {
  agencyCreativeDistinctDefinition,
  artistGalleryDistinctDefinition,
  beautyStudioDistinctDefinition,
  eventNightDistinctDefinition,
  hairSalonDistinctDefinition,
  scentBoutiqueDistinctDefinition,
} from "@/lib/create/distinct-template-seeds";
import { TEMPLATE_SEEDS } from "@/lib/create/templates-seed";

function sectionFingerprint(def: ReturnType<typeof beautyStudioDistinctDefinition>): string {
  return def.pages
    .map((p) => `${p.slug}:${p.sections.map((s) => s.type).join("+")}`)
    .join("|");
}

describe("distinct template uniqueness", () => {
  const defs = [
    ["beauty-studio", beautyStudioDistinctDefinition()],
    ["artist-gallery", artistGalleryDistinctDefinition()],
    ["event-night", eventNightDistinctDefinition()],
    ["hair-salon", hairSalonDistinctDefinition()],
    ["scent-boutique", scentBoutiqueDistinctDefinition()],
    ["agency-creative", agencyCreativeDistinctDefinition()],
  ] as const;

  it("each distinct seed validates against website schema", () => {
    for (const [slug, def] of defs) {
      const parsed = websiteDefinitionSchema.safeParse(def);
      expect(parsed.success, `${slug}: ${parsed.success ? "" : JSON.stringify(parsed.error?.flatten())}`).toBe(
        true,
      );
    }
  });

  it("gallery clones no longer share the same section fingerprint", () => {
    const prints = defs.map(([, d]) => sectionFingerprint(d));
    expect(new Set(prints).size).toBe(prints.length);
  });

  it("TEMPLATE_SEEDS points those slugs at distinct definitions", () => {
    for (const [slug] of defs) {
      const seed = TEMPLATE_SEEDS.find((t) => t.slug === slug);
      expect(seed, slug).toBeTruthy();
      const print = sectionFingerprint(seed!.definition);
      const expected = sectionFingerprint(defs.find(([s]) => s === slug)![1]);
      expect(print).toBe(expected);
    }
  });
});

describe("layerZIndex schema persistence", () => {
  it("keeps layerZIndex on legally-blonde-hero props", () => {
    const parsed = sectionPropsSchemas["legally-blonde-hero"].safeParse({
      title: "MAY",
      subtitle: "x",
      backgroundLayer: "",
      titleLogo: "",
      cutoutLeft: "",
      cutoutRight: "",
      cutoutAccent: "",
      macbook: "",
      heroPhoto: "",
      layerZIndex: { cutoutLeft: 40, titleLogo: 20 },
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.layerZIndex?.cutoutLeft).toBe(40);
      expect(parsed.data.layerZIndex?.titleLogo).toBe(20);
    }
  });
});

describe("social links empty state", () => {
  it("schema accepts empty socialLinks array (cleared in left nav)", () => {
    const parsed = sectionPropsSchemas["legally-blonde-hero"].safeParse({
      title: "MAY",
      subtitle: "x",
      backgroundLayer: "",
      titleLogo: "",
      cutoutLeft: "",
      cutoutRight: "",
      cutoutAccent: "",
      macbook: "",
      heroPhoto: "",
      socialLinks: [],
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.socialLinks).toEqual([]);
    }
  });
});
