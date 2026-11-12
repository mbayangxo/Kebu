import { describe, expect, it } from "vitest";
import { addAssetToComposition, addClipFromAsset, emptyStudioComposition } from "@/lib/studio/composition";

describe("Studio design-to-video provenance", () => {
  it("preserves the editable source design page on imported timeline clips", () => {
    let comp = emptyStudioComposition({ width: 1080, height: 1920 });
    comp = addAssetToComposition(comp, {
      id: "asset_page_one", kind: "image", url: "https://example.com/page.png",
      fileName: "Page 1", durationMs: 3000, width: 1080, height: 1920,
    });
    const next = addClipFromAsset(comp, "asset_page_one", { atMs: 0, sourceDesignPageId: "pg_original" });
    expect("error" in next).toBe(false);
    if (!("error" in next)) expect(next.clips[0]!.sourceDesignPageId).toBe("pg_original");
  });
});
