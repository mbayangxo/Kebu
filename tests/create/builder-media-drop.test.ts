import { describe, expect, it } from "vitest";
import {
  collagePhotoFromAsset,
  parseKebuDragAsset,
  planMediaAssetApply,
} from "@/lib/create/builder-media-drop";

describe("builder-media-drop", () => {
  it("parses drag payload", () => {
    expect(parseKebuDragAsset('{"url":"https://x/a.jpg","kind":"image"}')).toEqual({
      url: "https://x/a.jpg",
      kind: "image",
    });
    expect(parseKebuDragAsset("not-json")).toBeNull();
  });

  it("builds collage photo with tablet/mobile overrides", () => {
    const photo = collagePhotoFromAsset("https://x/cutout.png", 2, { leftPct: 40, topPct: 30 });
    expect(photo.src).toBe("https://x/cutout.png");
    expect(photo.leftPct).toBe(40);
    expect(photo.topPct).toBe(30);
    expect(photo.tablet?.hidden).toBe(false);
    expect(photo.mobile?.widthPct).toBe(40);
  });

  it("plans image drop onto kdirection collage", () => {
    const plan = planMediaAssetApply(
      { url: "https://x/new.png", kind: "image" },
      {
        pageId: "page-1",
        selectedSectionId: "s1",
        sections: [
          {
            id: "s1",
            page_id: "page-1",
            section_type: "kdirection-home",
            props: { collagePhotos: [] },
          },
        ],
        drop: { leftPct: 12, topPct: 18 },
      },
    );
    expect(plan.action).toBe("collage");
    if (plan.action === "collage") {
      expect(plan.photos).toHaveLength(1);
      expect(plan.photos[0]?.src).toBe("https://x/new.png");
      expect(plan.photos[0]?.leftPct).toBe(12);
    }
  });

  it("plans video as new section when none exists", () => {
    const plan = planMediaAssetApply(
      { url: "https://x/v.mp4", kind: "video" },
      {
        pageId: "page-1",
        selectedSectionId: null,
        sections: [
          {
            id: "s1",
            page_id: "page-1",
            section_type: "kdirection-home",
            props: {},
          },
        ],
      },
    );
    expect(plan).toEqual({
      action: "add-section",
      type: "video",
      props: { src: "https://x/v.mp4", heading: "" },
    });
  });
});
