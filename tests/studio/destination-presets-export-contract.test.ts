import { describe, expect, it } from "vitest";
import { artboardSize, STUDIO_DESIGN_TYPES } from "@/lib/studio/canvas-document";
import { getCreatePreset } from "@/lib/studio/create-presets";

describe("Studio destination presets and export contract", () => {
  it("ships exact editable destination presets requested by the creative workflow", () => {
    expect(getCreatePreset("tiktok_vertical")).toMatchObject({ width: 1080, height: 1920 });
    expect(getCreatePreset("instagram_reel")).toMatchObject({ width: 1080, height: 1920 });
    expect(getCreatePreset("youtube_thumbnail")).toMatchObject({ width: 1280, height: 720 });
    expect(getCreatePreset("youtube_banner")).toMatchObject({ width: 2560, height: 1440 });
    expect(getCreatePreset("spotify_artist_header")).toMatchObject({ width: 2660, height: 1140 });
    for (const id of ["press_kit","media_kit","brand_deck","pitch_deck","lookbook","packaging","logo","email_graphic"]) {
      expect(getCreatePreset(id)).toBeDefined();
      expect(STUDIO_DESIGN_TYPES).toContain(id);
    }
  });

  it("keeps platform artboard sizes centralized in the document engine", () => {
    expect(artboardSize("youtube_banner")).toEqual({ width: 2560, height: 1440 });
    expect(artboardSize("spotify_artist_header")).toEqual({ width: 2660, height: 1140 });
  });
});
