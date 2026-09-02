/** Builder + public site breakpoints (Wix-style device editing). */
export type BuilderDevice = "desktop" | "tablet" | "mobile";

export const BUILDER_DEVICES: BuilderDevice[] = ["desktop", "tablet", "mobile"];

/** Preview frame max widths in the editor (px). */
export const BUILDER_DEVICE_FRAME: Record<BuilderDevice, number> = {
  desktop: 1280,
  tablet: 768,
  mobile: 390,
};

/** Realistic viewport height for the device chrome (px at 1×). */
export const BUILDER_DEVICE_HEIGHT: Record<BuilderDevice, number> = {
  desktop: 800,
  tablet: 1024,
  mobile: 844,
};

export function labelBuilderDevice(device: BuilderDevice): string {
  switch (device) {
    case "desktop":
      return "Desktop";
    case "tablet":
      return "Tablet";
    case "mobile":
      return "Phone";
  }
}

/** Live site: pick layout from viewport width. */
export function builderDeviceFromWidth(widthPx: number): BuilderDevice {
  if (widthPx <= 640) return "mobile";
  if (widthPx <= 1024) return "tablet";
  return "desktop";
}

export type CollageLayoutFields = {
  rotate: number;
  topPct: number;
  leftPct: number;
  widthPct: number;
  zIndex?: number;
  hidden?: boolean;
};

export type CollagePhotoWithDevices = CollageLayoutFields & {
  src: string;
  alt?: string;
  tablet?: Partial<CollageLayoutFields>;
  mobile?: Partial<CollageLayoutFields>;
};

/** Resolve desktop base + optional tablet/mobile overrides for the active device. */
export function resolveCollagePhotoForDevice(
  photo: CollagePhotoWithDevices,
  device: BuilderDevice,
): CollageLayoutFields & { src: string; alt?: string; hidden: boolean } {
  const overlay =
    device === "mobile" ? photo.mobile : device === "tablet" ? photo.tablet : undefined;
  return {
    src: photo.src,
    alt: photo.alt,
    rotate: overlay?.rotate ?? photo.rotate,
    topPct: overlay?.topPct ?? photo.topPct,
    leftPct: overlay?.leftPct ?? photo.leftPct,
    widthPct: overlay?.widthPct ?? photo.widthPct,
    zIndex: overlay?.zIndex ?? photo.zIndex,
    hidden: overlay?.hidden === true,
  };
}

/** Patch layout onto the correct device bucket (desktop = root fields). */
export function applyCollageLayoutPatch(
  photo: CollagePhotoWithDevices,
  device: BuilderDevice,
  patch: Partial<CollageLayoutFields>,
): CollagePhotoWithDevices {
  if (device === "desktop") {
    return { ...photo, ...patch };
  }
  if (device === "tablet") {
    return { ...photo, tablet: { ...(photo.tablet ?? {}), ...patch } };
  }
  return { ...photo, mobile: { ...(photo.mobile ?? {}), ...patch } };
}

/** Sensible tablet/mobile defaults derived from a desktop collage photo. */
export function defaultDeviceLayoutsForCollage(
  photo: Omit<CollagePhotoWithDevices, "tablet" | "mobile">,
  index: number,
): Pick<CollagePhotoWithDevices, "tablet" | "mobile"> {
  return {
    tablet: {
      rotate: photo.rotate * 0.85,
      topPct: Math.min(85, Math.max(4, photo.topPct * 0.92 + 2)),
      leftPct: Math.min(72, Math.max(4, photo.leftPct * 0.88)),
      widthPct: Math.min(30, Math.max(14, photo.widthPct * 1.2)),
      zIndex: photo.zIndex,
      hidden: false,
    },
    mobile: {
      rotate: Math.max(-18, Math.min(18, photo.rotate * 0.5)),
      topPct: 8 + (index % 3) * 28,
      leftPct: index % 2 === 0 ? 8 : 52,
      widthPct: 40,
      zIndex: photo.zIndex,
      /** Keep the first four photos on phone; hide extras to avoid clutter. */
      hidden: index >= 4,
    },
  };
}
