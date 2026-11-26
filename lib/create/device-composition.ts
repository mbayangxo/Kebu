/**
 * Device composition — the single source of truth for how a page's sections are
 * presented on Desktop, Tablet and Phone.
 *
 * Three independent inputs combine:
 *   • order      — page.deviceLayouts[tablet|mobile].sectionOrder (Desktop = base order).
 *                  Applies to body sections only: the site-chrome header stays first and
 *                  the footer stays last on every device.
 *   • visibility — page.deviceLayouts[…].hiddenSections and section.visibility (hideOn/showOn)
 *   • content    — section.props.deviceOverrides[tablet|mobile] merged over base props
 *
 * One device is resolved at a time. The Builder canvas and preview know the device being
 * edited; a published page resolves the viewport's device on the client and re-composes the
 * single DOM representation, so visual, DOM, screen-reader and keyboard order agree.
 * `planResponsiveComposition` additionally carries every device's order and visibility, which
 * the published markup exposes to CSS so the server render is correct before hydration.
 */
import { BUILDER_DEVICES, type BuilderDevice } from "./builder-device";
import { CHROME_FOOTER_ID, CHROME_HEADER_ID } from "./site-chrome";
import type { PageDeviceLayouts } from "./website-extensions";

export type ComposableSection = {
  id?: string;
  props: Record<string, unknown>;
  visibility?: { hideOn?: readonly string[]; showOn?: readonly string[] };
};

/** Device selection on published pages — must match builderDeviceFromWidth(). */
export const DEVICE_MEDIA_QUERIES: Record<BuilderDevice, string> = {
  mobile: "(width <= 640px)",
  tablet: "(640px < width <= 1024px)",
  desktop: "(width > 1024px)",
};

/**
 * The same breakpoints for matchMedia() in scripts, in widely supported max-width syntax:
 * Phone when ≤ 640px, else Tablet when ≤ 1024px, else Desktop.
 */
export const DEVICE_MAX_WIDTH_QUERIES = { mobile: "(max-width: 640px)", tablet: "(max-width: 1024px)" } as const;

/** Device for the current viewport, from matchMedia results (mirrors builderDeviceFromWidth). */
export function deviceFromMediaMatches(matches: (query: string) => boolean): BuilderDevice {
  if (matches(DEVICE_MAX_WIDTH_QUERIES.mobile)) return "mobile";
  if (matches(DEVICE_MAX_WIDTH_QUERIES.tablet)) return "tablet";
  return "desktop";
}

function layoutFor(layouts: PageDeviceLayouts | undefined, device: BuilderDevice) {
  return device === "desktop" ? undefined : layouts?.[device];
}

/** Section IDs listed for a device — tolerant of malformed persisted layouts. */
function listedIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  for (const id of value) if (typeof id === "string" && id && !seen.has(id)) seen.add(id);
  return [...seen];
}

/**
 * Sections in the order used on `device`.
 *   • Site-chrome header first and footer last, whatever the device order says.
 *   • Listed body sections in sectionOrder order; unknown, duplicate or chrome IDs are ignored.
 *   • Unlisted body sections follow, in base order.
 */
export function orderSectionsForDevice<T extends { id?: string }>(
  sections: readonly T[],
  layouts: PageDeviceLayouts | undefined,
  device: BuilderDevice,
): T[] {
  const header = sections.filter((s) => s.id === CHROME_HEADER_ID);
  const footer = sections.filter((s) => s.id === CHROME_FOOTER_ID);
  const body = sections.filter((s) => s.id !== CHROME_HEADER_ID && s.id !== CHROME_FOOTER_ID);

  const order = listedIds(layoutFor(layouts, device)?.sectionOrder);
  if (order.length) {
    const rank = new Map(order.map((id, i) => [id, i]));
    const listed = body.filter((s) => s.id !== undefined && rank.has(s.id));
    listed.sort((a, b) => rank.get(a.id!)! - rank.get(b.id!)!);
    const unlisted = body.filter((s) => s.id === undefined || !rank.has(s.id));
    return [...header, ...listed, ...unlisted, ...footer];
  }
  return [...header, ...body, ...footer];
}

/** Whether a section renders on `device` (hidden flag, page hiddenSections, section visibility). */
export function isSectionVisibleOnDevice(
  section: ComposableSection,
  layouts: PageDeviceLayouts | undefined,
  device: BuilderDevice,
): boolean {
  if (section.props?.hidden === true) return false;
  if (section.id && listedIds(layoutFor(layouts, device)?.hiddenSections).includes(section.id)) return false;
  const vis = section.visibility;
  if (Array.isArray(vis?.hideOn) && vis.hideOn.includes(device)) return false;
  if (Array.isArray(vis?.showOn) && !vis.showOn.includes(device)) return false;
  return true;
}

/** Ordered, visible sections for one known device (Builder canvas / preview). */
export function composeSectionsForDevice<T extends ComposableSection>(
  sections: readonly T[],
  layouts: PageDeviceLayouts | undefined,
  device: BuilderDevice,
): T[] {
  return orderSectionsForDevice(sections, layouts, device).filter((s) => isSectionVisibleOnDevice(s, layouts, device));
}

export type ResponsiveRenderItem<T> = {
  section: T;
  /** Index of the section in `sections` (stable identity). */
  index: number;
  /** Devices on which the section is shown; hidden (CSS) on the rest. */
  showOn: BuilderDevice[];
  /** Position of the section in each device's order. */
  order: Record<BuilderDevice, number>;
};

export type ResponsiveCompositionPlan<T> = {
  /** One item per section shown on at least one device, in Desktop order. */
  items: ResponsiveRenderItem<T>[];
  /** True when Tablet or Phone order differs from Desktop. */
  reorders: boolean;
  /** True when order or visibility differs by device (per-item CSS hooks are needed). */
  varies: boolean;
};

/**
 * Resolve order and visibility for every device, for a page served to every viewport.
 * Content overrides are not duplicated here: the page renders one copy of each section
 * with the active device's merged props.
 */
export function planResponsiveComposition<T extends ComposableSection>(
  sections: readonly T[],
  layouts: PageDeviceLayouts | undefined,
): ResponsiveCompositionPlan<T> {
  const ranks = Object.fromEntries(
    BUILDER_DEVICES.map((d) => [d, new Map(orderSectionsForDevice(sections, layouts, d).map((s, i) => [s, i]))]),
  ) as Record<BuilderDevice, Map<T, number>>;
  const desktopOrder = orderSectionsForDevice(sections, layouts, "desktop");
  const reorders = BUILDER_DEVICES.some((d) => desktopOrder.some((s, i) => ranks[d].get(s) !== i));

  const items: ResponsiveRenderItem<T>[] = [];
  let varies = reorders;
  for (const section of desktopOrder) {
    const showOn = BUILDER_DEVICES.filter((d) => isSectionVisibleOnDevice(section, layouts, d));
    if (showOn.length === 0) continue;
    if (showOn.length < BUILDER_DEVICES.length) varies = true;
    items.push({
      section,
      index: sections.indexOf(section),
      showOn,
      order: { desktop: ranks.desktop.get(section)!, tablet: ranks.tablet.get(section)!, mobile: ranks.mobile.get(section)! },
    });
  }
  return { items, reorders, varies };
}

/** Plan items in `device`'s order — the DOM order of a published page on that device. */
export function orderPlanForDevice<T>(items: readonly ResponsiveRenderItem<T>[], device: BuilderDevice): ResponsiveRenderItem<T>[] {
  return [...items].sort((a, b) => a.order[device] - b.order[device]);
}

/** Class list for a published render item: hidden on every device it is not shown on. */
export function responsiveItemClassName(showOn: readonly BuilderDevice[]): string {
  return ["kebu-device-item", ...BUILDER_DEVICES.filter((d) => !showOn.includes(d)).map((d) => `kebu-device-hide-${d}`)].join(" ");
}

/** Per-device order, consumed by `.kebu-device-flow` (app/globals.css). */
export function responsiveItemStyle(order: Record<BuilderDevice, number>): Record<`--kd-order-${BuilderDevice}`, string> {
  return {
    "--kd-order-desktop": String(order.desktop),
    "--kd-order-tablet": String(order.tablet),
    "--kd-order-mobile": String(order.mobile),
  };
}
