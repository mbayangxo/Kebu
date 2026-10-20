import type { BuilderDevice } from "./builder-device";
import { sectionPropsSchemas } from "./website-schema";

/** Metadata stored inside deviceOverrides to track responsive state. */
export type ResponsiveStateMeta = {
  mode: "auto" | "custom" | "needs-review";
  baseHash?: string;
};

/**
 * The persisted shape for section.props.deviceOverrides.
 * Device slots (tablet/mobile) hold per-device prop overrides; _state is
 * non-device metadata used by the responsive state machine.
 */
export type DeviceBucket = {
  tablet?: Record<string, unknown>;
  mobile?: Record<string, unknown>;
  _state?: ResponsiveStateMeta;
};

/** Read device-specific prop overrides from section props (W9). */
export function readDeviceOverride(
  props: Record<string, unknown>,
  device: BuilderDevice,
  key: string,
): unknown {
  if (device === "desktop") return props[key];
  const slot = device as "tablet" | "mobile";
  const bucket = props.deviceOverrides as DeviceBucket | undefined;
  const override = bucket?.[slot]?.[key];
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
  const slot = device as "tablet" | "mobile";
  const bucket: DeviceBucket = { ...((props.deviceOverrides as DeviceBucket) ?? {}) };
  bucket[slot] = { ...(bucket[slot] ?? {}), ...patch };
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
  const slot = device as "tablet" | "mobile";
  const bucket = props.deviceOverrides as DeviceBucket | undefined;
  const override = bucket?.[slot];
  if (!override || typeof override !== "object") return props;
  return { ...props, ...override };
}

/** Whether per-device overrides exist for a given device. */
export function hasDeviceOverrides(
  props: Record<string, unknown>,
  device: BuilderDevice,
): boolean {
  if (device === "desktop") return false;
  const slot = device as "tablet" | "mobile";
  const bucket = props.deviceOverrides as DeviceBucket | undefined;
  const overrideKeys = bucket?.[slot] ? Object.keys(bucket[slot]!) : [];
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

export function getResponsiveState(props: Record<string, unknown>, sectionType?: string): ResponsiveState {
  const state = (props.deviceOverrides as DeviceBucket | null | undefined)?._state;
  if (!state) {
    return hasDeviceOverrides(props, "tablet") || hasDeviceOverrides(props, "mobile") ? "custom" : "auto";
  }
  if (state.mode === "needs-review") return "needs-review";
  // Base props changed since the overrides were generated or last reviewed.
  if (state.baseHash && hashBaseProps(props, sectionType) !== state.baseHash) return "needs-review";
  return state.mode === "custom" ? "custom" : "auto";
}

/** Mark the section's device presentation as user-customised (recorded against the current base). */
export function markResponsiveCustom(
  props: Record<string, unknown>,
  sectionType?: string,
): Record<string, unknown> {
  const bucket: DeviceBucket = { ...((props.deviceOverrides as DeviceBucket | null) ?? {}) };
  bucket._state = { mode: "custom", baseHash: hashBaseProps(props, sectionType) };
  return { ...props, deviceOverrides: bucket };
}

/** Store auto-generated overrides and record base-props hash so stale detection works. */
export function storeAutoOverrides(
  props: Record<string, unknown>,
  overrides: Partial<Record<Exclude<BuilderDevice, "desktop">, Record<string, unknown>>>,
  sectionType?: string,
): Record<string, unknown> {
  const bucket: DeviceBucket = {
    ...((props.deviceOverrides as DeviceBucket | null) ?? {}),
    ...overrides,
  };
  bucket._state = { mode: "auto", baseHash: hashBaseProps(props, sectionType) };
  return { ...props, deviceOverrides: bucket };
}

/**
 * Route a section-props edit made while `device` is being edited.
 * Keys that support per-device editing (DEVICE_OVERRIDE_KEYS) land in
 * deviceOverrides[device] and mark the presentation customised; every other key is
 * shared base content. Desktop edits are base edits.
 */
export function deviceScopedPatch(
  sectionType: string,
  props: Record<string, unknown>,
  device: BuilderDevice,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  if (device === "desktop") return patch;
  const deviceKeys = DEVICE_OVERRIDE_KEYS[sectionType] ?? [];
  const devicePart: Record<string, unknown> = {};
  const basePart: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (deviceKeys.includes(key)) devicePart[key] = value;
    else basePart[key] = value;
  }
  if (Object.keys(devicePart).length === 0) return basePart;
  const withOverride = markResponsiveCustom(patchDeviceProp({ ...props, ...basePart }, device, devicePart), sectionType);
  return { ...basePart, deviceOverrides: withOverride.deviceOverrides };
}

/** Reset device overrides, returning props to "auto" state. */
export function resetDeviceOverrides(
  props: Record<string, unknown>,
): Record<string, unknown> {
  const { deviceOverrides: _removed, ...rest } = props;
  void _removed;
  return rest;
}

/** JSON with sorted keys; null and undefined object members are treated as absent. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((v) => (v === undefined ? "null" : canonicalJson(v))).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined && v !== null)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

/**
 * Fast FNV-1a 32-bit hash of the base section props (excluding deviceOverrides).
 * Not cryptographic — used for stale-detection only.
 *
 * Saving normalises props through the section schema (defaults added, unknown keys
 * dropped, keys reordered). With `sectionType`, the hash is taken over that same normal
 * form, canonically serialised, so it is identical before and after a save round-trip.
 */
export function hashBaseProps(props: Record<string, unknown>, sectionType?: string): string {
  const { deviceOverrides: _skip, ...base } = props;
  void _skip;
  const schema = sectionType ? (sectionPropsSchemas as Record<string, { safeParse: (v: unknown) => { success: boolean; data?: unknown } }>)[sectionType] : undefined;
  const parsed = schema?.safeParse(base);
  const normalised = parsed?.success ? (parsed.data as Record<string, unknown>) : base;
  const { deviceOverrides: _parsedSkip, ...content } = normalised;
  void _parsedSkip;
  const text = canonicalJson(content);
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
  hero: ["heading", "subheading", "buttonLabel", "secondaryButtonLabel", "align"],
  "editorial-hero": ["eyebrow", "heading", "subheading", "buttonLabel", "secondaryButtonLabel", "align", "heightVh", "overlayOpacity"],
  "announcement-bar": ["text", "href"],
  marquee: ["items", "speed"],
  split: ["heading", "body", "imagePosition"],
  "category-tiles": ["heading", "columns"],
  text: ["heading", "body"],
  image: ["src", "alt", "caption"],
  gallery: ["heading", "layout", "columns", "creativeWorld"],
  video: ["heading", "layout", "columns"],
  audio: ["heading"],
  features: ["heading", "subheading", "layout"],
  testimonials: ["heading"],
  faq: ["heading", "items"],
  products: ["heading", "layout", "columns"],
  stats: ["heading", "layout"],
  contact: ["heading"],
  newsletter: ["heading", "subheading"],
  form: ["heading", "subheading", "buttonLabel", "successMessage"],
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
    "layerWidthScale",
    "layerHeightScale",
    "layerCrop",
    "layerZIndex",
    "layerOpacity",
    "layerRotation",
    "layerPositions",
    "layerScroll",
    "sceneVideos",
    "showNavigation",
    "lockedLayers",
    "hiddenLayers",
    "title",
    "subtitle",
    "titleAsText",
    "titleTextFontFamily",
    "titleTextFontSize",
    "titleTextFontWeight",
    "titleTextLetterSpacing",
    "titleTextLineHeight",
    "titleTextColor",
    "sectionMinHeightPx",
    "embeddedFooterPaddingTop",
    "embeddedFooterPaddingBottom",
    "navDisplay",
  ],
  "kdirection-home": ["collagePhotos", "mission", "brandLine1", "brandLine2"],
  "maylecor-home": ["artistName"],
  "maylecor-music": ["artistName"],
  "kdirection-page": ["title", "subtitle", "body"],
  /** Utility / overlay sections — basic show/hide per device only. */
  map: ["heading", "address"],
  events: ["heading", "items"],
  quiz: ["heading", "subheading", "ctaLabel"],
  "email-popup": ["heading", "body", "buttonLabel", "enabled"],
  whatsapp: ["label", "phone"],
  joko: ["label", "phone", "jokoPayLink"],
};


export function hasDeviceOverrideKeys(
  props: Record<string, unknown>,
  device: BuilderDevice,
  keys: readonly string[],
): boolean {
  if (device === "desktop") return false;
  const bucket = props.deviceOverrides as DeviceBucket | undefined;
  const active = bucket?.[device];
  if (!active) return false;
  return keys.some((key) => Object.prototype.hasOwnProperty.call(active, key));
}

/** Remove selected responsive overrides so tablet/mobile inherits desktop again. */
export function clearDeviceOverrideKeys(
  props: Record<string, unknown>,
  device: BuilderDevice,
  keys: readonly string[],
): Record<string, unknown> {
  if (device === "desktop") return {};
  const bucket = { ...((props.deviceOverrides as DeviceBucket | undefined) ?? {}) };
  const current = { ...(bucket[device] ?? {}) };
  for (const key of keys) delete current[key];
  if (Object.keys(current).length === 0) delete bucket[device];
  else bucket[device] = current;
  return { deviceOverrides: bucket };
}
