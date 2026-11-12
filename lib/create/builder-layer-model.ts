export type BuilderLayerPresentation = {
  scale: number;
  widthScale: number;
  heightScale: number;
  crop: number;
  zIndex: number;
  opacity: number;
  rotation: number;
  locked: boolean;
  hidden: boolean;
};

export function builderLayerStorageKey(elementId: string): string {
  return elementId.startsWith("extra:") ? elementId.slice("extra:".length) : elementId;
}

function numberMap(
  props: Record<string, unknown>,
  key: "layerScales" | "layerWidthScale" | "layerHeightScale" | "layerCrop" | "layerZIndex" | "layerOpacity" | "layerRotation",
): Record<string, number> {
  const raw = props[key];
  return raw && typeof raw === "object" && !Array.isArray(raw)
    ? (raw as Record<string, number>)
    : {};
}

function stringList(props: Record<string, unknown>, key: "lockedLayers" | "hiddenLayers"): string[] {
  return Array.isArray(props[key]) ? (props[key] as string[]) : [];
}

export function readBuilderLayerPresentation(
  props: Record<string, unknown>,
  storageKey: string,
): BuilderLayerPresentation {
  const scales = numberMap(props, "layerScales");
  const widths = numberMap(props, "layerWidthScale");
  const heights = numberMap(props, "layerHeightScale");
  const crops = numberMap(props, "layerCrop");
  const zIndexes = numberMap(props, "layerZIndex");
  const opacities = numberMap(props, "layerOpacity");
  const rotations = numberMap(props, "layerRotation");
  const locked = stringList(props, "lockedLayers");
  const hidden = stringList(props, "hiddenLayers");

  return {
    scale: typeof scales[storageKey] === "number" ? scales[storageKey]! : 1,
    widthScale: typeof widths[storageKey] === "number" ? widths[storageKey]! : 1,
    heightScale: typeof heights[storageKey] === "number" ? heights[storageKey]! : 1,
    crop: typeof crops[storageKey] === "number" ? crops[storageKey]! : 0,
    zIndex: typeof zIndexes[storageKey] === "number" ? zIndexes[storageKey]! : 10,
    opacity: typeof opacities[storageKey] === "number" ? opacities[storageKey]! : 1,
    rotation: typeof rotations[storageKey] === "number" ? rotations[storageKey]! : 0,
    locked: locked.includes(storageKey),
    hidden: hidden.includes(storageKey),
  };
}

export function patchBuilderLayerPresentation(
  props: Record<string, unknown>,
  storageKey: string,
  patch: Partial<BuilderLayerPresentation>,
): Record<string, unknown> {
  const next: Record<string, unknown> = {};

  if (patch.scale !== undefined) {
    next.layerScales = {
      ...numberMap(props, "layerScales"),
      [storageKey]: Math.min(3, Math.max(0.15, patch.scale)),
    };
  }
  if (patch.widthScale !== undefined) {
    next.layerWidthScale = {
      ...numberMap(props, "layerWidthScale"),
      [storageKey]: Math.min(3, Math.max(0.15, patch.widthScale)),
    };
  }
  if (patch.heightScale !== undefined) {
    next.layerHeightScale = {
      ...numberMap(props, "layerHeightScale"),
      [storageKey]: Math.min(3, Math.max(0.15, patch.heightScale)),
    };
  }
  if (patch.crop !== undefined) {
    next.layerCrop = {
      ...numberMap(props, "layerCrop"),
      [storageKey]: Math.min(45, Math.max(0, patch.crop)),
    };
  }
  if (patch.zIndex !== undefined) {
    next.layerZIndex = {
      ...numberMap(props, "layerZIndex"),
      [storageKey]: Math.min(80, Math.max(1, Math.round(patch.zIndex))),
    };
  }
  if (patch.opacity !== undefined) {
    next.layerOpacity = {
      ...numberMap(props, "layerOpacity"),
      [storageKey]: Math.min(1, Math.max(0, patch.opacity)),
    };
  }
  if (patch.rotation !== undefined) {
    next.layerRotation = {
      ...numberMap(props, "layerRotation"),
      [storageKey]: ((patch.rotation % 360) + 360) % 360,
    };
  }
  if (patch.locked !== undefined) {
    const values = stringList(props, "lockedLayers");
    next.lockedLayers = patch.locked
      ? [...new Set([...values, storageKey])]
      : values.filter((value) => value !== storageKey);
  }
  if (patch.hidden !== undefined) {
    const values = stringList(props, "hiddenLayers");
    next.hiddenLayers = patch.hidden
      ? [...new Set([...values, storageKey])]
      : values.filter((value) => value !== storageKey);
  }

  return next;
}


/** Relative stacking actions used by the canvas context menu and Layers panel. */
export type BuilderLayerStackAction = "front" | "forward" | "backward" | "back";

export function patchBuilderLayerStack(
  props: Record<string, unknown>,
  storageKey: string,
  action: BuilderLayerStackAction,
): Record<string, unknown> {
  const zIndexes = numberMap(props, "layerZIndex");
  const current = typeof zIndexes[storageKey] === "number" ? zIndexes[storageKey]! : 10;
  const values = Object.values(zIndexes).filter((value): value is number => Number.isFinite(value));
  const min = values.length ? Math.min(...values, 1) : 1;
  const max = values.length ? Math.max(...values, 10) : 10;
  const next =
    action === "front" ? Math.min(80, max + 1) :
    action === "forward" ? Math.min(80, current + 1) :
    action === "backward" ? Math.max(1, current - 1) :
    Math.max(1, min - 1);
  return patchBuilderLayerPresentation(props, storageKey, { zIndex: next });
}
