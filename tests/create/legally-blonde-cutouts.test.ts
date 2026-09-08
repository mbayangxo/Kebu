import { describe, expect, it } from "vitest";
import { sectionPropsSchemas } from "@/lib/create/website-schema";
import { defaultMaylecorKsendrProps } from "@/lib/create/maylecor-ksendr-defaults";
import { MAYLECOR_FIGURE_ASSETS } from "@/lib/create/maylecor-defaults";

describe("legally-blonde cutout edit path", () => {
  it("keeps May Lecor portrait defaults and accepts swapped upload URLs", () => {
    const base = defaultMaylecorKsendrProps();
    expect(base.cutoutLeft).toBe(MAYLECOR_FIGURE_ASSETS.cutoutLeft);
    expect(base.cutoutAccent).toBe(MAYLECOR_FIGURE_ASSETS.cutoutAccent);

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

  it("accepts per-cutout click links on built-in slots and extras", () => {
    const base = defaultMaylecorKsendrProps();
    const parsed = sectionPropsSchemas["legally-blonde-hero"].parse({
      ...base,
      layerLinks: {
        cutoutLeft: "mays-world",
        cutoutAccent: "/about",
        titleLogo: "https://open.spotify.com/artist/demo",
      },
      extraCutouts: [
        {
          id: "logo-banner",
          src: "/templates/maylecor/logo-banner.png",
          href: "press",
          topPct: 8,
          leftPct: 10,
          widthPct: 20,
        },
      ],
    });
    expect(parsed.layerLinks?.cutoutLeft).toBe("mays-world");
    expect(parsed.extraCutouts[0]?.href).toBe("press");
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
