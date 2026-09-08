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

/** Keys that support per-device editing (W9 + freeform mobile layout). */
export const DEVICE_OVERRIDE_KEYS = {
  hero: ["heading", "subheading", "buttonLabel"] as const,
  navigation: ["brand"] as const,
  text: ["heading", "body"] as const,
  features: ["heading", "items"] as const,
  faq: ["heading", "items"] as const,
  products: ["heading"] as const,
  /** Freeform May / cutout heroes — phone can rearrange layers independently. */
  "legally-blonde-hero": [
    "extraCutouts",
    "layerScales",
    "hiddenLayers",
    "title",
    "subtitle",
    "navDisplay",
  ] as const,
  "kdirection-home": ["collagePhotos", "mission", "brandLine1", "brandLine2"] as const,
};
