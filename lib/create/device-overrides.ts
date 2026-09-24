import type { BuilderDevice } from "./builder-device";

type DeviceBucket = Partial<Record<BuilderDevice, Record<string, unknown>>>;

/** Read device-specific prop overrides from section props (W9). */
export function readDeviceOverride(
  props: Record<string, unknown>,
  device: BuilderDevice,
  key: string,
): unknown {
  if (device === "desktop") return props[key];
  const bucket = props.deviceOverrides as DeviceBucket | undefined;
  const override = bucket?.[device]?.[key];
  return override !== undefined ? override : props[key];
}

/** Merge a patch into the correct device bucket. */
export function patchDeviceProp(
  props: Record<string, unknown>,
  device: BuilderDevice,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  if (device === "desktop") {
    return { ...props, ...patch };
  }
  const bucket = { ...((props.deviceOverrides as DeviceBucket) ?? {}) };
  bucket[device] = { ...(bucket[device] ?? {}), ...patch };
  return { ...props, deviceOverrides: bucket };
}

/**
 * Apply a section patch for the active preview device.
 * Desktop writes base props; tablet/mobile write `deviceOverrides` only.
 */
export function applyDeviceAwarePatch(
  onPatchSection: ((sectionId: string, patch: Record<string, unknown>) => void) | undefined,
  sectionId: string | undefined,
  props: Record<string, unknown>,
  device: BuilderDevice,
  patch: Record<string, unknown>,
): void {
  if (!onPatchSection || !sectionId) return;
  if (device === "desktop") onPatchSection(sectionId, patch);
  else onPatchSection(sectionId, patchDeviceProp(props, device, patch));
}

/** Merge tablet/mobile override bag onto base props for rendering (freeform mobile layout). */
export function mergeDeviceAwareSectionProps(
  props: Record<string, unknown>,
  device: BuilderDevice,
): Record<string, unknown> {
  if (device === "desktop") return props;
  const bucket = props.deviceOverrides as DeviceBucket | undefined;
  const override = bucket?.[device];
  if (!override || typeof override !== "object") return props;
  return { ...props, ...override };
}

/** Whether per-device overrides exist for a given device. */
export function hasDeviceOverrides(
  props: Record<string, unknown>,
  device: BuilderDevice,
): boolean {
  if (device === "desktop") return false;
  const bucket = props.deviceOverrides as DeviceBucket | undefined;
  const overrideKeys = bucket?.[device] ? Object.keys(bucket[device]!) : [];
  return overrideKeys.some((k) => !k.startsWith("_"));
}

/**
 * Responsive state persisted inside deviceOverrides._state.
 *
 * - "auto":        no user edits; renderer uses generated overrides from responsive-composer.
 * - "custom":      user explicitly edited at least one device override.
 * - "needs-review": base props changed since overrides were last generated/edited.
 *
 * The `_baseHash` records a FNV-1a hash of the desktop base props (excluding deviceOverrides)
 * at the time overrides were last written.  On each render, the current base hash is compared;
 * a mismatch surfaces as "needs-review" in the builder chrome.
 */
export type ResponsiveState = "auto" | "custom" | "needs-review";

export function getResponsiveState(props: Record<string, unknown>): ResponsiveState {
  if (!hasDeviceOverrides(props, "tablet") && !hasDeviceOverrides(props, "mobile")) {
    return "auto";
  }
  const state = (props.deviceOverrides as DeviceBucket | undefined)?._state as
    | { mode?: string; baseHash?: string }
    | undefined;
  if (!state) return "custom";
  if (state.mode === "needs-review") return "needs-review";
  // Check whether base props changed since overrides were applied.
  if (state.baseHash) {
    const currentHash = hashBaseProps(props);
    if (currentHash !== state.baseHash) return "needs-review";
  }
  return state.mode === "auto" ? "auto" : "custom";
}

/** Mark overrides as user-customised for the given device. */
export function markResponsiveCustom(
  props: Record<string, unknown>,
): Record<string, unknown> {
  const bucket = { ...((props.deviceOverrides as DeviceBucket) ?? {}) };
  (bucket as Record<string, unknown>)._state = {
    mode: "custom",
    baseHash: hashBaseProps(props),
  };
  return { ...props, deviceOverrides: bucket };
}

/** Store auto-generated overrides and record base-props hash so stale detection works. */
export function storeAutoOverrides(
  props: Record<string, unknown>,
  overrides: Partial<Record<Exclude<BuilderDevice, "desktop">, Record<string, unknown>>>,
): Record<string, unknown> {
  const bucket: DeviceBucket = {
    ...((props.deviceOverrides as DeviceBucket) ?? {}),
    ...overrides,
  };
  (bucket as Record<string, unknown>)._state = {
    mode: "auto",
    baseHash: hashBaseProps(props),
  };
  return { ...props, deviceOverrides: bucket };
}

/** Reset device overrides, returning props to "auto" state. */
export function resetDeviceOverrides(
  props: Record<string, unknown>,
): Record<string, unknown> {
  const { deviceOverrides: _removed, ...rest } = props;
  void _removed;
  return rest;
}

/**
 * Fast FNV-1a 32-bit hash of the base section props (excluding deviceOverrides).
 * Not cryptographic — used for stale-detection only.
 */
export function hashBaseProps(props: Record<string, unknown>): string {
  const { deviceOverrides: _skip, ...base } = props;
  void _skip;
  const text = JSON.stringify(base);
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h.toString(16);
}

/** Keys that support per-device editing (W9 + freeform mobile layout). */
export const DEVICE_OVERRIDE_KEYS: Partial<Record<string, readonly string[]>> = {
  navigation: ["brand", "navSize", "navLayout", "navScale", "logoAlign", "navSticky"],
  hero: ["heading", "subheading", "buttonLabel", "align"],
  "editorial-hero": ["heading", "subheading", "buttonLabel", "align", "heightVh", "overlayOpacity"],
  "announcement-bar": ["text", "href"],
  marquee: ["items", "speed"],
  split: ["heading", "body", "imagePosition"],
  "category-tiles": ["heading", "columns"],
  text: ["heading", "body"],
  image: ["src", "alt", "caption"],
  gallery: ["heading", "layout", "columns"],
  video: ["heading", "layout", "columns"],
  audio: ["heading"],
  features: ["heading", "subheading", "layout"],
  testimonials: ["heading"],
  faq: ["heading", "items"],
  products: ["heading", "layout", "columns"],
  stats: ["heading", "layout"],
  contact: ["heading"],
  newsletter: ["heading", "subheading"],
  form: ["heading", "subheading"],
  "blog-list": ["heading"],
  countdown: ["heading", "subheading"],
  "trust-badges": ["items", "layout"],
  "social-proof": ["items", "position"],
  "floating-cta": ["label", "position"],
  "before-after": ["heading"],
  "hotspot-image": ["heading"],
  reviews: ["heading"],
  "free-text": ["blocks", "minHeight"],
  footer: ["text", "links"],
  /** Freeform May / cutout heroes — phone can rearrange layers independently. */
  "legally-blonde-hero": [
    "extraCutouts",
    "layerScales",
    "hiddenLayers",
    "title",
    "subtitle",
    "navDisplay",
  ],
  "kdirection-home": ["collagePhotos", "mission", "brandLine1", "brandLine2"],
  "maylecor-home": ["artistName"],
  "maylecor-music": ["artistName"],
  "kdirection-page": ["title", "subtitle", "body"],
};
