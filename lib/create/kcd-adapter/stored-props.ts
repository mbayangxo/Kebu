/**
 * The 3B stored section shape ⇄ KCD node fields.
 *
 * 3B keeps everything inside `project_sections.props`: base props plus the reserved keys
 * `deviceOverrides` ({ tablet, mobile, _state }), `_motion`, `_a11y`, `_visibility`,
 * `_interaction`, `_dataBinding` and (3C S4) `_locked`. The model lifts those into dedicated node fields
 * (as editor-definition.ts does for website-v1). `repackStoredProps` is the exact inverse
 * for every value the model can hold.
 *
 * Values the model cannot hold as they are (an invalid `_a11y`, `deviceOverrides: {}`,
 * `_motion: null`, a foreign key inside `deviceOverrides`) are not dropped. The lift reports
 * them, and the caller keeps the original stored form as the node's legacy source (see
 * `legacy.ts`), which is written back verbatim while the node's content is unchanged.
 */
import {
  FORBIDDEN_PATH_SEGMENTS,
  OVERRIDE_DEVICES,
  RESERVED_PROP_KEYS,
  nodeA11ySchema,
  nodeVisibilitySchema,
  responsiveStateSchema,
  type KcdNode,
} from "@/lib/creative-core";
import { responsiveVisibilitySchema, sectionA11ySchema } from "@/lib/create/website-extensions";
import { deviceOverridesSchema } from "@/lib/create/website-schema";
import type { ZodType } from "zod";
import { AdapterError } from "./errors";

/** Node fields that come from a stored section's props. */
export type SectionFields = Pick<KcdNode, "props" | "overrides"> &
  Partial<Pick<KcdNode, "responsiveState" | "visibility" | "a11y" | "motion" | "interaction" | "dataBinding" | "locked">>;

export const SECTION_FIELD_KEYS = [
  "props", "overrides", "responsiveState", "visibility", "a11y", "motion", "interaction", "dataBinding", "locked",
] as const;

export interface FieldIssue {
  field: string;
  message: string;
}

export function isPlainObject(v: unknown): v is Record<string, unknown> {
  if (typeof v !== "object" || v === null || Array.isArray(v)) return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
}

/** The section fields of a node (for content comparison). */
export function sectionFieldsOf(node: KcdNode): SectionFields {
  const out: SectionFields = { props: node.props, overrides: node.overrides };
  if (node.responsiveState !== undefined) out.responsiveState = node.responsiveState;
  if (node.visibility !== undefined) out.visibility = node.visibility;
  if (node.a11y !== undefined) out.a11y = node.a11y;
  if (node.motion !== undefined) out.motion = node.motion;
  if (node.interaction !== undefined) out.interaction = node.interaction;
  if (node.dataBinding !== undefined) out.dataBinding = node.dataBinding;
  if (node.locked !== undefined) out.locked = node.locked;
  return out;
}

/** 3B's schema for deviceOverrides._state. */
const threeBStateSchema = deviceOverridesSchema.unwrap().shape._state.unwrap();

/**
 * The model value for a stored extension: the model schema's parsed output for the stored value,
 * or — when 3B accepts the value only after normalizing it (3B strips unknown keys and trims) —
 * for 3B's normalized value, which is what 3B means by it. Null when neither accepts it.
 * The parsed output (not the raw value) is lifted so the document is already canonical; when it
 * differs from what was stored, the original survives as the node's legacy source.
 */
function modelValue(value: unknown, model: ZodType, threeB: ZodType): { value: unknown } | null {
  const direct = model.safeParse(value);
  if (direct.success) return { value: direct.data };
  const normalized = threeB.safeParse(value);
  if (!normalized.success) return null;
  const again = model.safeParse(normalized.data);
  return again.success ? { value: again.data } : null;
}

/** Override bucket keys the model can hold (no reserved storage keys, no prototype keys). */
function liftBucket(bucket: Record<string, unknown>, where: string, issues: FieldIssue[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(bucket)) {
    if (RESERVED_PROP_KEYS.has(k) || FORBIDDEN_PATH_SEGMENTS.has(k)) {
      issues.push({ field: `${where}.${k}`, message: `Storage key "${k}" cannot be a per-device value; kept as stored and rendered as before; not held by the model` });
      continue;
    }
    if (v !== undefined) out[k] = v;
  }
  return out;
}

function liftDeviceOverrides(raw: unknown, fields: SectionFields, issues: FieldIssue[]): void {
  if (raw === undefined || raw === null) return;
  if (!isPlainObject(raw)) {
    issues.push({ field: "deviceOverrides", message: "deviceOverrides is not an object; kept as stored and rendered as before; not held by the model" });
    return;
  }
  for (const [k, v] of Object.entries(raw)) {
    if (OVERRIDE_DEVICES.includes(k as "tablet" | "mobile")) {
      if (v === undefined || v === null) continue;
      if (!isPlainObject(v)) {
        issues.push({ field: `deviceOverrides.${k}`, message: "Device bucket is not an object; kept as stored and rendered as before; not held by the model" });
        continue;
      }
      fields.overrides[k as "tablet" | "mobile"] = liftBucket(v, `deviceOverrides.${k}`, issues);
    } else if (k === "_state") {
      if (v === undefined || v === null) continue;
      const state = modelValue(v, responsiveStateSchema, threeBStateSchema);
      if (state) fields.responsiveState = state.value as SectionFields["responsiveState"];
      else issues.push({ field: "deviceOverrides._state", message: "Invalid responsive state; kept as stored and rendered as before; not held by the model" });
    } else {
      issues.push({ field: `deviceOverrides.${k}`, message: `Unknown device slot "${k}"; kept as stored` });
    }
  }
}

/**
 * Lift a stored props object into node fields. Throws `AdapterError` only for keys no JSON
 * model can carry safely (prototype keys). Whether the lift is exact is decided by the caller
 * (`repackStoredProps(fields)` canonically equal to `stored`).
 */
export function liftStoredProps(stored: Record<string, unknown>): { fields: SectionFields; issues: FieldIssue[] } {
  const issues: FieldIssue[] = [];
  const base: [string, unknown][] = [];
  for (const [k, v] of Object.entries(stored)) {
    if (FORBIDDEN_PATH_SEGMENTS.has(k)) throw new AdapterError("forbidden-key", `Section props contain the forbidden key "${k}"`);
    if (!RESERVED_PROP_KEYS.has(k) && v !== undefined) base.push([k, v]);
  }
  const fields: SectionFields = { props: Object.fromEntries(base), overrides: {} };
  liftDeviceOverrides(stored.deviceOverrides, fields, issues);

  // Opaque extensions: lifted when set (3B ignores null — editor-definition.ts uses `!= null`).
  if (stored._motion != null) fields.motion = stored._motion;
  if (stored._interaction != null) fields.interaction = stored._interaction;
  if (stored._dataBinding != null) fields.dataBinding = stored._dataBinding;
  // Validated extensions: the model only holds valid values.
  if (stored._a11y != null) {
    const a11y = liftA11y(stored._a11y);
    if (a11y) fields.a11y = a11y.value as SectionFields["a11y"];
    else issues.push({ field: "_a11y", message: "Invalid accessibility settings; kept as stored and rendered as before; not held by the model" });
  }
  if (stored._locked != null) {
    if (typeof stored._locked === "boolean") fields.locked = stored._locked;
    else issues.push({ field: "_locked", message: "Invalid lock flag; kept as stored and rendered as before; not held by the model" });
  }
  if (stored._visibility != null) {
    const visibility = liftVisibility(stored._visibility);
    if (visibility) fields.visibility = visibility.value as SectionFields["visibility"];
    else issues.push({ field: "_visibility", message: "Invalid device visibility; kept as stored and rendered as before; not held by the model" });
  }
  return { fields, issues };
}

export const liftA11y = (value: unknown) => modelValue(value, nodeA11ySchema, sectionA11ySchema);
export const liftVisibility = (value: unknown) => modelValue(value, nodeVisibilitySchema, responsiveVisibilitySchema);

/** Node fields → the exact 3B stored props shape. */
export function repackStoredProps(fields: SectionFields): Record<string, unknown> {
  const out: Record<string, unknown> = { ...fields.props };
  const bucket: Record<string, unknown> = {};
  if (fields.overrides.tablet) bucket.tablet = fields.overrides.tablet;
  if (fields.overrides.mobile) bucket.mobile = fields.overrides.mobile;
  if (fields.responsiveState) bucket._state = fields.responsiveState;
  if (Object.keys(bucket).length) out.deviceOverrides = bucket;
  if (fields.motion !== undefined) out._motion = fields.motion;
  if (fields.a11y !== undefined) out._a11y = fields.a11y;
  if (fields.visibility !== undefined) out._visibility = fields.visibility;
  if (fields.interaction !== undefined) out._interaction = fields.interaction;
  if (fields.dataBinding !== undefined) out._dataBinding = fields.dataBinding;
  if (fields.locked !== undefined) out._locked = fields.locked;
  return out;
}

/** Section-level extension fields of a website-v1 section and their node field. */
export const V1_SECTION_EXTENSIONS = ["motion", "a11y", "visibility", "interaction", "dataBinding"] as const;
