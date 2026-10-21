import type { BuilderDevice } from "./builder-device";
import type { BuilderElementSelection } from "./builder-selection";
import { builderLayerStorageKey } from "./builder-layer-model";
import type { DeviceBucket } from "./device-overrides";

const layerMaps = ["layerScales", "layerWidthScale", "layerHeightScale", "layerCrop", "layerZIndex", "layerOpacity", "layerRotation", "layerPositions"] as const;
const memberships = ["hiddenLayers", "lockedLayers"] as const;

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function list(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }
function equal(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((v, i) => equal(v, b[i]));
  if (a && b && typeof a === "object" && typeof b === "object" && !Array.isArray(a) && !Array.isArray(b)) {
    const left = object(a), right = object(b), keys = Object.keys(left);
    return keys.length === Object.keys(right).length && keys.every(key => Object.hasOwn(right, key) && equal(left[key], right[key]));
  }
  return false;
}

/** A single scope is shared by the inspector badge and its reset action. */
function scope(selection: BuilderElementSelection) {
  if (selection.elementId === "heroCanvas") return { scalars: ["sectionMinHeightPx"], layer: false };
  if (selection.elementId === "siteFooter") return { scalars: ["embeddedFooterPaddingTop", "embeddedFooterPaddingBottom"], layer: false };
  if (selection.kind === "background") return { scalars: ["backgroundLayer", "backgroundHidden"], layer: false };
  const layer = ["image", "cutout", "text"].includes(selection.kind);
  const scalars = selection.elementId === "titleLogo"
    ? ["title", "titleAsText", "titleTextFontFamily", "titleTextFontSize", "titleTextFontWeight", "titleTextLetterSpacing", "titleTextLineHeight", "titleTextColor"]
    : layer && !selection.elementId.startsWith("extra:") ? [selection.elementId] : [];
  return { scalars, layer };
}

export function hasBuilderElementDeviceOverride(props: Record<string, unknown>, device: BuilderDevice, selection: BuilderElementSelection): boolean {
  if (device === "desktop") return false;
  const current = (props.deviceOverrides as DeviceBucket | undefined)?.[device];
  if (!current) return false;
  const { scalars, layer } = scope(selection), key = builderLayerStorageKey(selection.elementId);
  if (scalars.some(field => Object.hasOwn(current, field) && !equal(current[field], props[field]))) return true;
  if (!layer) return false;
  if (layerMaps.some(field => Object.hasOwn(current, field) && !equal(object(current[field])[key], object(props[field])[key]))) return true;
  if (memberships.some(field => Object.hasOwn(current, field) && list(current[field]).includes(key) !== list(props[field]).includes(key))) return true;
  return selection.elementId.startsWith("extra:") && Object.hasOwn(current, "extraCutouts") && !equal(
    list(current.extraCutouts).find(item => object(item).id === key),
    list(props.extraCutouts).find(item => object(item).id === key),
  );
}

/** Restore one object's desktop presentation without resetting its neighbours.
 * Device maps replace base maps at render time, so retain the selected base entry
 * in any map which still contains other objects' responsive edits.
 */
export function resetBuilderElementDeviceOverride(props: Record<string, unknown>, device: BuilderDevice, selection: BuilderElementSelection): Record<string, unknown> {
  if (device === "desktop") return {};
  const bucket = { ...((props.deviceOverrides as DeviceBucket | undefined) ?? {}) };
  const current = { ...(bucket[device] ?? {}) };
  const { scalars, layer } = scope(selection), key = builderLayerStorageKey(selection.elementId);
  for (const field of scalars) delete current[field];
  const assign = (field: string, value: unknown, base: unknown) => {
    if (equal(value, base)) delete current[field];
    else current[field] = value;
  };
  if (layer) {
    for (const field of layerMaps) {
      if (!Object.hasOwn(current, field)) continue;
      const base = object(props[field]), next = { ...object(current[field]) };
      if (Object.hasOwn(base, key)) next[key] = base[key];
      else delete next[key];
      assign(field, next, base);
    }
    for (const field of memberships) {
      if (!Object.hasOwn(current, field)) continue;
      const base = list(props[field]), next = list(current[field]).filter(item => item !== key);
      if (base.includes(key)) next.push(key);
      // Membership order has no presentation meaning; preserve everyone else's order.
      if (next.length === base.length && next.every(item => base.includes(item))) delete current[field];
      else current[field] = next;
    }
    if (selection.elementId.startsWith("extra:") && Object.hasOwn(current, "extraCutouts")) {
      const base = list(props.extraCutouts), next = [...list(current.extraCutouts)];
      const index = next.findIndex(item => object(item).id === key), original = base.find(item => object(item).id === key);
      if (index >= 0) next.splice(index, 1, ...(original ? [original] : []));
      else if (original) next.splice(Math.min(base.indexOf(original), next.length), 0, original);
      assign("extraCutouts", next, base);
    }
  }
  if (Object.keys(current).length) bucket[device] = current;
  else delete bucket[device];
  return { deviceOverrides: bucket };
}
