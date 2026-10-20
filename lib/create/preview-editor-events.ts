import type { BuilderElementSelection } from "./builder-selection";

/** Same-origin frame messages are still runtime data; accept only bounded editor commands. */
export type PreviewEditorEvent =
  | { type: "kebu:element:select"; selection: BuilderElementSelection }
  | { type: "kebu:section:patch"; sectionId: string; patch: Record<string, unknown> }
  | { type: "kebu:page:navigate"; slug: string }
  | { type: "kebu:navigation:edit" };

const record = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));
const text = (value: unknown, max: number): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= max;

export function parsePreviewEditorEvent(value: unknown): PreviewEditorEvent | null {
  if (!record(value)) return null;
  if (value.type === "kebu:element:select") {
    const s = value.selection;
    if (!record(s) || !text(s.sectionId, 100) || !text(s.elementId, 100) || !text(s.label, 300)
      || typeof s.kind !== "string" || !["text", "image", "cutout", "background", "control"].includes(s.kind)) return null;
    return { type: value.type, selection: { sectionId: s.sectionId, elementId: s.elementId, label: s.label, kind: s.kind as BuilderElementSelection["kind"] } };
  }
  if (value.type === "kebu:section:patch" && text(value.sectionId, 100) && record(value.patch)
    && Object.keys(value.patch).length <= 128
    && !Object.keys(value.patch).some(key => ["__proto__", "constructor", "prototype"].includes(key))) {
    return { type: value.type, sectionId: value.sectionId, patch: value.patch };
  }
  if (value.type === "kebu:page:navigate" && text(value.slug, 160)) return { type: value.type, slug: value.slug };
  if (value.type === "kebu:navigation:edit") return { type: value.type };
  return null;
}
