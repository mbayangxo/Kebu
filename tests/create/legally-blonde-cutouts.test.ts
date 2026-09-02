import { describe, expect, it } from "vitest";
import { sectionPropsSchemas } from "@/lib/create/website-schema";
import { defaultMaylecorKsendrProps } from "@/lib/create/maylecor-ksendr-defaults";
import { LEGALLY_BLONDE_ASSETS } from "@/lib/create/legally-blonde-defaults";

describe("legally-blonde cutout edit path", () => {
  it("keeps Russian Elle defaults and accepts swapped upload URLs", () => {
    const base = defaultMaylecorKsendrProps();
    expect(base.cutoutLeft).toBe(LEGALLY_BLONDE_ASSETS.cutoutLeft);
    expect(base.cutoutAccent).toBe(LEGALLY_BLONDE_ASSETS.cutoutAccent);

    const longUpload =
      "https://abcdxyz.supabase.co/storage/v1/object/public/site-assets/" +
      "11111111-1111-1111-1111-111111111111/22222222-2222-2222-2222-222222222222/" +
      "section-1710000000000.png";

    const parsed = sectionPropsSchemas["legally-blonde-hero"].parse({
      ...base,
      cutoutLeft: longUpload,
      cutoutRight: "",
      extraCutouts: [
        {
          id: "cut-1",
          src: longUpload,
          topPct: 20,
          leftPct: 30,
          widthPct: 16,
          rotate: -4,
        },
      ],
      layerMoves: { "1702905074754": { dx: 12, dy: -8 } },
    });

    expect(parsed.cutoutLeft).toBe(longUpload);
    expect(parsed.cutoutRight).toBe("");
    expect(parsed.extraCutouts).toHaveLength(1);
    expect(parsed.layerMoves?.["1702905074754"]?.dx).toBe(12);
  });

  it("accepts removing a cutout with empty string (no fallback required by schema)", () => {
    const base = defaultMaylecorKsendrProps();
    const parsed = sectionPropsSchemas["legally-blonde-hero"].parse({
      ...base,
      cutoutAccent: "",
    });
    expect(parsed.cutoutAccent).toBe("");
  });
});
