import { describe, expect, it } from "vitest";
import { MAYLECOR_SEED_REVISION } from "@/lib/create/maylecor-defaults";
import { normalizeMaylecorRussianHeroProps } from "@/lib/create/maylecor-russian-hero";

describe("May Lecor draft seed sync", () => {
  it("bumps seedRevision and refreshes stock cutouts when revision is stale", () => {
    const next = normalizeMaylecorRussianHeroProps(
      {
        seedRevision: "old",
        cutoutLeft: "/templates/maylecor/may-figure.png",
        titleAsText: true,
      },
      "MAY LECOR",
    );
    expect(next.seedRevision).toBe(MAYLECOR_SEED_REVISION);
    expect(String(next.cutoutLeft)).toContain("/templates/maylecor/");
    expect(String(next.chromeLogo)).toContain("logo-stacked");
    const extras = next.extraCutouts as { id: string; src: string }[];
    expect(extras.some((e) => e.id === "may-city-skyline")).toBe(true);
    expect(extras.some((e) => e.id === "may-logo-stacked")).toBe(false);
  });

  it("keeps custom collage layers and layer scales when a seed revision changes", () => {
    const layer = {
      id: "artist-photo",
      src: "/api/projects/project-id/assets/photo.png",
      topPct: 32,
      leftPct: 17,
      widthPct: 24,
      parallaxRole: "figure",
    };
    const next = normalizeMaylecorRussianHeroProps({
      seedRevision: "old",
      extraCutouts: [layer],
      layerScales: { cutoutLeft: 0.72 },
    });

    expect(next.extraCutouts).toContainEqual(layer);
    expect(next.layerScales).toMatchObject({ cutoutLeft: 0.72 });
    expect(next.extraCutouts).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "may-city-skyline" }),
    ]));
  });
});
