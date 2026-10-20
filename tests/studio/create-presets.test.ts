import { describe, expect, it } from "vitest";
import {
  STUDIO_CREATE_PRESETS,
  blankCanvasForPreset,
  blankDesignTitle,
  duplicateDesignTitle,
  getCreatePreset,
} from "@/lib/studio/create-presets";
import { STUDIO_DESIGN_TYPES, artboardSize } from "@/lib/studio/canvas-document";
import { studioTemplateAspect } from "@/lib/studio/templates";

describe("Studio S11 create presets", () => {
  it("exposes Canva-style size presets", () => {
    expect(STUDIO_CREATE_PRESETS.length).toBeGreaterThanOrEqual(5);
    expect(getCreatePreset("instagram_post")?.width).toBe(1080);
    expect(getCreatePreset("instagram_story")?.height).toBe(1920);
  });

  it("builds blank canvas matching preset type", () => {
    const p = getCreatePreset("flyer")!;
    const doc = blankCanvasForPreset(p);
    expect(doc.width).toBe(p.width);
    expect(doc.height).toBe(p.height);
    expect(doc.pages[0]?.layers.length).toBeGreaterThan(0);
  });

  it("titles blank and duplicate designs", () => {
    expect(blankDesignTitle(getCreatePreset("poster")!)).toMatch(/Poster/);
    expect(duplicateDesignTitle("Sale")).toBe("Sale copy");
    expect(duplicateDesignTitle("")).toBe("Untitled copy");
  });
});

describe("Studio real-world format expansion (S21)", () => {
  it("has a create preset for every design type, with no duplicate ids", () => {
    const presetTypes = new Set(STUDIO_CREATE_PRESETS.map((p) => p.designType));
    for (const designType of STUDIO_DESIGN_TYPES) {
      expect(presetTypes.has(designType), designType).toBe(true);
    }
    const ids = STUDIO_CREATE_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every preset a real, positive pixel size matching artboardSize()", () => {
    for (const preset of STUDIO_CREATE_PRESETS) {
      const size = artboardSize(preset.designType);
      expect(preset.width, preset.id).toBe(size.width);
      expect(preset.height, preset.id).toBe(size.height);
      expect(preset.width, preset.id).toBeGreaterThan(0);
      expect(preset.height, preset.id).toBeGreaterThan(0);
    }
  });

  it("matches real published platform dimensions for the new social/web formats", () => {
    expect(artboardSize("youtube_thumbnail")).toEqual({ width: 1280, height: 720 });
    expect(artboardSize("youtube_banner")).toEqual({ width: 2560, height: 1440 });
    expect(artboardSize("tiktok_video_cover")).toEqual({ width: 1080, height: 1920 });
    expect(artboardSize("linkedin_post")).toEqual({ width: 1080, height: 1080 });
    expect(artboardSize("linkedin_banner")).toEqual({ width: 1584, height: 396 });
    expect(artboardSize("pinterest_pin")).toEqual({ width: 1000, height: 1500 });
    expect(artboardSize("twitter_post")).toEqual({ width: 1200, height: 675 });
    expect(artboardSize("pitch_deck_slide")).toEqual({ width: 1920, height: 1080 });
    expect(artboardSize("spotify_banner")).toEqual({ width: 2660, height: 1140 });
  });

  it("groups every preset into a real UI section", () => {
    for (const preset of STUDIO_CREATE_PRESETS) {
      expect(["social", "print", "web", "document"]).toContain(preset.group);
    }
    expect(STUDIO_CREATE_PRESETS.some((p) => p.group === "document")).toBe(true);
  });

  it("classifies every design type into a real aspect bucket, not a silent square default", () => {
    for (const designType of STUDIO_DESIGN_TYPES) {
      const { width, height } = artboardSize(designType);
      const aspect = studioTemplateAspect(designType);
      const ratio = width / height;
      if (aspect === "story") expect(ratio, designType).toBeLessThan(0.8);
      if (aspect === "landscape") expect(ratio, designType).toBeGreaterThan(1.2);
      if (aspect === "portrait") expect(ratio, designType).toBeLessThan(1);
    }
  });

  it("builds a working blank canvas for every new document/business format", () => {
    for (const id of ["menu", "pitch_deck_slide", "proposal", "resume", "invoice", "digital_planner", "youtube_thumbnail", "youtube_banner", "linkedin_banner", "tiktok_video_cover", "linkedin_post", "pinterest_pin", "twitter_post", "spotify_banner", "book_cover", "invitation", "newsletter", "certificate_landscape", "email_header", "postcard", "lesson_plan"]) {
      const preset = getCreatePreset(id)!;
      expect(preset, id).toBeTruthy();
      const doc = blankCanvasForPreset(preset);
      expect(doc.width, id).toBe(preset.width);
      expect(doc.height, id).toBe(preset.height);
      expect(doc.pages[0]?.layers.length, id).toBeGreaterThan(0);
    }
  });
});
