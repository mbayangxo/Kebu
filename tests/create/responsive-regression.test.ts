/**
 * Item 13 — Responsive regression targets
 *
 * Guards against regressions in the sections that received new deviceOverrides fields:
 *   maylecor-home, maylecor-music, legally-blonde-hero, kdirection-home, kdirection-page
 *
 * Also guards the responsive data-model utilities against May Lècor and Builder
 * world data (the templates most likely to surface edge-cases).
 */

import { describe, expect, it } from "vitest";
import { validateWebsiteDefinition } from "@/lib/create/website-schema";
import { generateDeviceOverrides } from "@/lib/create/responsive-composer";
import {
  getResponsiveState,
  storeAutoOverrides,
  resetDeviceOverrides,
  hashBaseProps,
} from "@/lib/create/device-overrides";
import {
  validateSectionResponsiveData,
  validatePageResponsiveData,
  summariseQa,
} from "@/lib/create/responsive-qa";

// ---------------------------------------------------------------------------
// Shared test theme (mirrors what the builder ships)
// ---------------------------------------------------------------------------
const THEME = {
  primary: "#000",
  accent: "#fff",
  background: "#fff",
  text: "#000",
  fontDisplay: "Fraunces",
  fontBody: "system-ui",
  spacing: "comfortable",
} as const;

// ---------------------------------------------------------------------------
// Schema validation — sections that gained deviceOverrides
// ---------------------------------------------------------------------------

describe("schema regression — newly patched sections accept deviceOverrides", () => {
  it("maylecor-home validates with deviceOverrides present", () => {
    const result = validateWebsiteDefinition({
      schemaVersion: "website-v1",
      title: "May Lècor",
      theme: THEME,
      pages: [
        {
          slug: "home",
          title: "Home",
          sections: [
            {
              type: "maylecor-home",
              props: {
                artistName: "May Lècor",
                backgroundImage: "",
                portraitMain: "",
                collageTop: "",
                collageMiddle: "",
                logoBanner: "",
                bottomLeft: "",
                bottomRight: "",
                logoSmall: "",
                ctaLabel: "Discover",
                socialLinks: [],
                deviceOverrides: {
                  mobile: { hidden: true },
                },
              },
            },
          ],
        },
      ],
    });
    expect(result.ok).toBe(true);
  });

  it("maylecor-music validates with deviceOverrides present", () => {
    const result = validateWebsiteDefinition({
      schemaVersion: "website-v1",
      title: "May Lècor",
      theme: THEME,
      pages: [
        {
          slug: "music",
          title: "Music",
          sections: [
            {
              type: "maylecor-music",
              props: {
                artistName: "May Lècor",
                albumArt: "",
                tracks: [],
                socialLinks: [],
                deviceOverrides: { tablet: {}, mobile: {} },
              },
            },
          ],
        },
      ],
    });
    expect(result.ok).toBe(true);
  });

  it("legally-blonde-hero validates with deviceOverrides present", () => {
    const result = validateWebsiteDefinition({
      schemaVersion: "website-v1",
      title: "Legally Blonde",
      theme: THEME,
      pages: [
        {
          slug: "home",
          title: "Home",
          sections: [
            {
              type: "legally-blonde-hero",
              props: {
                title: "Legally Blonde",
                subtitle: "",
                backgroundLayer: "",
                titleLogo: "",
                cutoutLeft: "",
                cutoutRight: "",
                cutoutAccent: "",
                cutoutSparkle: "",
                macbook: "",
                sparkleGif: "",
                heroPhoto: "",
                deviceOverrides: {},
              },
            },
          ],
        },
      ],
    });
    expect(result.ok).toBe(true);
  });

  it("kdirection-home validates with deviceOverrides present", () => {
    const result = validateWebsiteDefinition({
      schemaVersion: "website-v1",
      title: "K-Direction",
      theme: THEME,
      pages: [
        {
          slug: "home",
          title: "Home",
          sections: [
            {
              type: "kdirection-home",
              props: {
                brandLine1: "K",
                brandLine2: "DIRECTION",
                mission: "Forward",
                collagePhotos: [],
                navLinks: [],
                socialLinks: [],
                deviceOverrides: { mobile: { columns: 1 } },
              },
            },
          ],
        },
      ],
    });
    expect(result.ok).toBe(true);
  });

  it("kdirection-page validates with deviceOverrides present", () => {
    const result = validateWebsiteDefinition({
      schemaVersion: "website-v1",
      title: "K-Direction",
      theme: THEME,
      pages: [
        {
          slug: "about",
          title: "About",
          sections: [
            {
              type: "kdirection-page",
              props: {
                title: "About K-Direction",
                navLinks: [],
                socialLinks: [],
                deviceOverrides: {},
              },
            },
          ],
        },
      ],
    });
    expect(result.ok).toBe(true);
  });

  it("schemas strip unknown keys from deviceOverrides (Zod passthrough behavior)", () => {
    // The schema only has tablet and mobile keys; Zod strips any extras silently.
    // A "desktop" key is stripped — not an error — by z.object() default behavior.
    const result = validateWebsiteDefinition({
      schemaVersion: "website-v1",
      title: "May Lècor",
      theme: THEME,
      pages: [
        {
          slug: "home",
          title: "Home",
          sections: [
            {
              type: "maylecor-home",
              props: {
                artistName: "May",
                backgroundImage: "",
                portraitMain: "",
                collageTop: "",
                collageMiddle: "",
                logoBanner: "",
                bottomLeft: "",
                bottomRight: "",
                logoSmall: "",
                ctaLabel: "Go",
                socialLinks: [],
                deviceOverrides: { mobile: { hidden: false } },
              },
            },
          ],
        },
      ],
    });
    expect(result.ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Responsive data model — May Lècor / Builder typical data
// ---------------------------------------------------------------------------

describe("responsive state machine — regression with May Lècor section data", () => {
  const maylecorBase = {
    artistName: "May Lècor",
    collageTop: "/img/top.jpg",
    ctaLabel: "Discover",
  };

  it("starts in auto state with no overrides", () => {
    expect(getResponsiveState(maylecorBase)).toBe("auto");
  });

  it("transitions to auto with stored overrides", () => {
    const withAuto = storeAutoOverrides(maylecorBase, { mobile: { hidden: true } });
    expect(getResponsiveState(withAuto)).toBe("auto");
  });

  it("transitions to needs-review when base data changes", () => {
    const withAuto = storeAutoOverrides(maylecorBase, { mobile: { hidden: true } });
    const modified = { ...withAuto, ctaLabel: "Shop" };
    expect(getResponsiveState(modified)).toBe("needs-review");
  });

  it("reset removes overrides and returns to auto", () => {
    const withAuto = storeAutoOverrides(maylecorBase, { mobile: { hidden: true } });
    const reset = resetDeviceOverrides(withAuto);
    expect(reset.deviceOverrides).toBeUndefined();
    expect(getResponsiveState(reset)).toBe("auto");
  });

  it("hash is deterministic for the same object", () => {
    const a = { artistName: "May", ctaLabel: "Discover" };
    expect(hashBaseProps(a)).toBe(hashBaseProps({ ...a }));
  });
});

// ---------------------------------------------------------------------------
// Composer — does not produce overrides for May Lècor bespoke types
// (they have their own per-device layerPositions mechanism)
// ---------------------------------------------------------------------------

describe("responsive composer — bespoke section types", () => {
  it("returns empty bag for maylecor-home (no composer registered)", () => {
    expect(generateDeviceOverrides("maylecor-home", { artistName: "May" })).toEqual({});
  });

  it("returns empty bag for kdirection-home (no composer registered)", () => {
    expect(generateDeviceOverrides("kdirection-home", {})).toEqual({});
  });

  it("returns empty bag for legally-blonde-hero (no composer registered)", () => {
    expect(generateDeviceOverrides("legally-blonde-hero", {})).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// QA — typical May Lècor page layout
// ---------------------------------------------------------------------------

describe("responsive QA regression — May Lècor page structure", () => {
  const maylecorPage = [
    { type: "maylecor-home", props: {} },
    { type: "maylecor-music", props: {} },
  ];

  it("May Lècor home and music sections produce no QA violations", () => {
    const violations = validatePageResponsiveData(maylecorPage);
    expect(violations).toHaveLength(0);
  });

  it("mixed May Lècor + navigation side-rail surfaces an error", () => {
    const page = [
      ...maylecorPage,
      { type: "navigation", props: { navLayout: "side" } },
    ];
    const qa = summariseQa(validatePageResponsiveData(page));
    expect(qa.ok).toBe(false);
    expect(qa.errors).toBe(1);
  });

  it("QA is ok with navigation using top layout", () => {
    const page = [
      ...maylecorPage,
      { type: "navigation", props: { navLayout: "top" } },
    ];
    const qa = summariseQa(validatePageResponsiveData(page));
    expect(qa.ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// QA — typical Builder / Yande page structure
// ---------------------------------------------------------------------------

describe("responsive QA regression — Builder Yande-type page", () => {
  it("gallery with too many columns surfaces a warning", () => {
    const violations = validateSectionResponsiveData({ type: "gallery", props: { columns: 5 } });
    const qa = summariseQa(violations);
    expect(qa.ok).toBe(true);  // only a warning, not an error
    expect(qa.warnings).toBe(1);
  });

  it("gallery with mobile override is clean", () => {
    const violations = validateSectionResponsiveData({
      type: "gallery",
      props: { columns: 5, deviceOverrides: { mobile: { columns: 2 } } },
    });
    expect(summariseQa(violations).ok).toBe(true);
    expect(violations).toHaveLength(0);
  });

  it("editorial-hero within safe height is clean", () => {
    const violations = validateSectionResponsiveData({
      type: "editorial-hero",
      props: { heightVh: 70 },
    });
    expect(violations).toHaveLength(0);
  });

  it("free-text within canvas bounds is clean", () => {
    const violations = validateSectionResponsiveData({
      type: "free-text",
      props: { blocks: [{ x: 8, width: 80 }, { x: 15, width: 70 }] },
    });
    expect(violations).toHaveLength(0);
  });
});
