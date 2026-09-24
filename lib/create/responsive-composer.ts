/**
 * Smart responsive composer — generates deterministic device overrides from desktop section props.
 *
 * Rules are semantic transforms, not pixel nudges:
 * - Content (text, images, links) is never duplicated or truncated.
 * - Layout values (columns, heightVh, align) are adjusted for the target viewport.
 * - Override bags are minimal — only fields that actually differ from the desktop baseline are included.
 *
 * Usage:
 *   const overrides = generateDeviceOverrides("gallery", props);
 *   // { tablet: { columns: 2 }, mobile: { columns: 1 } }
 */

import type { BuilderDevice } from "./builder-device";

export type DeviceOverrideBag = Partial<
  Record<Exclude<BuilderDevice, "desktop">, Record<string, unknown>>
>;

type SectionType = string;
type BaseProps = Record<string, unknown>;

/**
 * Generate sensible tablet + mobile overrides for a section from its desktop props.
 * Returns only the keys that differ from the desktop baseline; empty objects mean "no change".
 */
export function generateDeviceOverrides(
  sectionType: SectionType,
  props: BaseProps,
): DeviceOverrideBag {
  const composer = COMPOSERS[sectionType];
  if (!composer) return {};
  return composer(props);
}

type Composer = (props: BaseProps) => DeviceOverrideBag;

// ---------------------------------------------------------------------------
// Section composers
// ---------------------------------------------------------------------------

function navComposer(props: BaseProps): DeviceOverrideBag {
  return {
    tablet: {
      navSize: props.navSize === "fullscreen" ? "large" : props.navSize,
    },
    mobile: {
      navSize: "compact",
      navLayout: "top",
    },
  };
}

function heroComposer(props: BaseProps): DeviceOverrideBag {
  const result: DeviceOverrideBag = {};
  if (props.align !== "center") {
    result.tablet = { align: "center" };
    result.mobile = { align: "center" };
  } else {
    result.tablet = {};
    result.mobile = {};
  }
  return result;
}

function editorialHeroComposer(props: BaseProps): DeviceOverrideBag {
  const tabletH = Math.min(Number(props.heightVh ?? 80), 70);
  const mobileH = Math.min(Number(props.heightVh ?? 80), 60);
  return {
    tablet: {
      ...(tabletH !== props.heightVh ? { heightVh: tabletH } : {}),
      align: "center",
    },
    mobile: {
      ...(mobileH !== props.heightVh ? { heightVh: mobileH } : {}),
      align: "center",
    },
  };
}

function galleryComposer(props: BaseProps): DeviceOverrideBag {
  const desktopCols = Number(props.columns ?? 3);
  const tabletCols = Math.min(desktopCols, 2);
  const mobileCols = 1;
  return {
    tablet: desktopCols !== tabletCols ? { columns: tabletCols } : {},
    mobile: { columns: mobileCols },
  };
}

function productsComposer(props: BaseProps): DeviceOverrideBag {
  const desktopCols = Number(props.columns ?? 3);
  const tabletCols = Math.min(desktopCols, 2);
  return {
    tablet: desktopCols !== tabletCols ? { columns: tabletCols } : {},
    mobile: { columns: 2, layout: props.layout === "carousel" ? "carousel" : "grid" },
  };
}

function categoryTilesComposer(props: BaseProps): DeviceOverrideBag {
  const desktopCols = Number(props.columns ?? 4);
  return {
    tablet: desktopCols > 3 ? { columns: 3 } : {},
    mobile: { columns: 2 },
  };
}

function videoComposer(props: BaseProps): DeviceOverrideBag {
  const desktopCols = Number(props.columns ?? 2);
  return {
    tablet: desktopCols > 1 ? { columns: 1 } : {},
    mobile: { columns: 1, layout: "single" },
  };
}

function splitComposer(_props: BaseProps): DeviceOverrideBag {
  // On mobile, split sections stack to a column; the imagePosition choice doesn't affect stacking
  // but we keep it on tablet, and collapse to top-image on mobile for natural reading order.
  return {
    tablet: {},
    mobile: { imagePosition: "right" },
  };
}

function statsComposer(props: BaseProps): DeviceOverrideBag {
  if (props.layout !== "row") return {};
  return {
    tablet: {},
    mobile: { layout: "grid" },
  };
}

function featuresComposer(props: BaseProps): DeviceOverrideBag {
  if (props.layout === "moodboard") {
    return {
      tablet: {},
      mobile: { layout: "grid" },
    };
  }
  return {};
}

function countdownComposer(props: BaseProps): DeviceOverrideBag {
  if (props.layout === "hero") {
    return {
      tablet: {},
      mobile: { layout: "strip" },
    };
  }
  return {};
}

function testimonialsComposer(props: BaseProps): DeviceOverrideBag {
  const desktopCols = Number(props.columns ?? 3);
  const tabletCols = Math.min(desktopCols, 2);
  return {
    tablet: desktopCols !== tabletCols ? { columns: tabletCols } : {},
    mobile: { columns: 1 },
  };
}

function blogListComposer(props: BaseProps): DeviceOverrideBag {
  const pp = Number(props.postsPerPage ?? 6);
  return {
    tablet: pp > 4 ? { postsPerPage: 4 } : {},
    mobile: { postsPerPage: Math.min(pp, 3) },
  };
}

function faqComposer(_props: BaseProps): DeviceOverrideBag {
  // FAQ accordion stacks naturally; no layout transform needed.
  return { tablet: {}, mobile: {} };
}

function announcementBarComposer(_props: BaseProps): DeviceOverrideBag {
  // Bar is full-width at all widths; no column/layout transform needed.
  return { tablet: {}, mobile: {} };
}

function marqueeComposer(props: BaseProps): DeviceOverrideBag {
  // Slow the marquee slightly on mobile to keep it readable on narrow screens.
  const speed = Number(props.speed ?? 40);
  return {
    tablet: {},
    mobile: speed > 30 ? { speed: Math.round(speed * 0.75) } : {},
  };
}

// ---------------------------------------------------------------------------
// Composer registry
// ---------------------------------------------------------------------------

const COMPOSERS: Record<string, Composer> = {
  navigation: navComposer,
  hero: heroComposer,
  "editorial-hero": editorialHeroComposer,
  gallery: galleryComposer,
  products: productsComposer,
  "category-tiles": categoryTilesComposer,
  video: videoComposer,
  split: splitComposer,
  stats: statsComposer,
  features: featuresComposer,
  countdown: countdownComposer,
  testimonials: testimonialsComposer,
  "blog-list": blogListComposer,
  faq: faqComposer,
  "announcement-bar": announcementBarComposer,
  marquee: marqueeComposer,
};

/**
 * All section types that have a smart composer.
 * Use this to show the "Auto" badge in the builder for supported types.
 */
export const COMPOSABLE_SECTION_TYPES = new Set(Object.keys(COMPOSERS));

/**
 * Merge auto-generated overrides with existing ones, preserving any user customisations.
 * Fields explicitly set by the user (in "custom" mode) are never overwritten.
 */
export function mergeAutoOverrides(
  existingOverrides: DeviceOverrideBag,
  generated: DeviceOverrideBag,
): DeviceOverrideBag {
  const result: DeviceOverrideBag = { ...existingOverrides };
  for (const device of ["tablet", "mobile"] as const) {
    if (!generated[device]) continue;
    result[device] = { ...generated[device], ...(existingOverrides[device] ?? {}) };
  }
  return result;
}
