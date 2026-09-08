import { describe, expect, it } from "vitest";
import {
  STUDIO_CREATE_PRESETS,
  blankCanvasForPreset,
  blankDesignTitle,
  duplicateDesignTitle,
  getCreatePreset,
} from "@/lib/studio/create-presets";

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
