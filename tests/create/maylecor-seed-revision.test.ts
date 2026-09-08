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
    expect(extras.some((e) => e.id === "may-logo-stacked")).toBe(true);
  });
});
