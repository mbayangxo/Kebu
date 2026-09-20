export type BuilderLayerPresentation = {
  scale: number;
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
  key: "layerScales" | "layerZIndex" | "layerOpacity" | "layerRotation",
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
  const zIndexes = numberMap(props, "layerZIndex");
  const opacities = numberMap(props, "layerOpacity");
  const rotations = numberMap(props, "layerRotation");
  const locked = stringList(props, "lockedLayers");
  const hidden = stringList(props, "hiddenLayers");

  return {
    scale: typeof scales[storageKey] === "number" ? scales[storageKey]! : 1,
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
      [storageKey]: Math.min(180, Math.max(-180, patch.rotation)),
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
