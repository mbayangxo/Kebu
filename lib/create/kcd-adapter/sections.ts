/**
 * One legacy section ⇄ one `legacy-section:*` node, for both stored forms:
 *
 *   rows   project_sections.props (reserved keys inside props)
 *   v1     website-v1 section { type, props, motion?, a11y?, visibility?, interaction?, dataBinding? }
 *
 * The canonical v1 form of a node is exactly what 3B's buildDefinitionFromProjectParts builds
 * from a stored row: props with the reserved keys still inside, plus the extensions lifted beside
 * them. Section-level extensions win over props-level ones (they are what 3B renders).
 */
import { legacySectionType, legacySectionTypeOf, isNodeTypeId, type KcdNode } from "@/lib/creative-core";
import { AdapterError } from "./errors";
import { legacyOfNode, sameJson, type LegacyNodeData } from "./legacy";
import {
  V1_SECTION_EXTENSIONS,
  isPlainObject,
  liftA11y,
  liftStoredProps,
  liftVisibility,
  repackStoredProps,
  sectionFieldsOf,
  type FieldIssue,
  type SectionFields,
} from "./stored-props";

export interface LiftedSection {
  type: string;
  fields: SectionFields;
  issues: FieldIssue[];
  /** Present when the canonical form does not reproduce the original exactly. */
  source?: NonNullable<LegacyNodeData["source"]>;
}

export function nodeTypeForSection(sectionType: unknown, where: string): string {
  const type = typeof sectionType === "string" ? legacySectionType(sectionType) : "";
  if (!isNodeTypeId(type)) throw new AdapterError("invalid-input", `${where}: invalid section type ${JSON.stringify(sectionType)}`);
  return type;
}

// ── rows ──────────────────────────────────────────────────────────────────────

/**
 * Stored section_type of a node type (3C S4): legacy sections keep their 3B type; the pilot
 * primitives store their own name. Inverse: `kcdNodeType` (same rule as SQL kcd_node_type).
 */
export function storageSectionType(type: string): string {
  return legacySectionTypeOf(type) ?? type;
}

/** KCD node type of a stored row — 'text' / 'image' are primitives only when nested. */
export function kcdNodeType(sectionType: string, parentId: string | null): string {
  if (sectionType === "section" || sectionType === "group") return sectionType;
  if ((sectionType === "text" || sectionType === "image" || sectionType === "video") && parentId !== null) return sectionType;
  return legacySectionType(sectionType);
}

export function liftRowSection(sectionType: unknown, props: unknown, where: string, nodeType?: string): LiftedSection {
  const type = nodeType ?? nodeTypeForSection(sectionType, where);
  if (!isPlainObject(props)) throw new AdapterError("invalid-input", `${where}: props must be an object`);
  const { fields, issues } = liftStoredProps(props);
  const exact = sameJson(repackStoredProps(fields), props);
  return { type, fields, issues, ...(exact ? {} : { source: { form: "rows" as const, raw: props } }) };
}

/** Stored props for a node: its preserved original while unchanged, else the canonical repack. */
export function writeRowProps(node: KcdNode): Record<string, unknown> {
  const source = legacyOfNode(node).source;
  if (source && "raw" in source && unchanged(node, source)) {
    if (source.form === "rows") return source.raw as Record<string, unknown>;
  }
  return repackStoredProps(sectionFieldsOf(node));
}

// ── website-v1 ────────────────────────────────────────────────────────────────

function liftV1Fields(section: Record<string, unknown>, where: string): { fields: SectionFields; issues: FieldIssue[] } {
  if (!isPlainObject(section.props)) throw new AdapterError("invalid-input", `${where}: props must be an object`);
  const { fields, issues } = liftStoredProps(section.props);
  for (const key of V1_SECTION_EXTENSIONS) {
    const value = section[key];
    if (value == null) continue;
    if (key === "a11y" || key === "visibility") {
      const lifted = key === "a11y" ? liftA11y(value) : liftVisibility(value);
      if (lifted) (fields as Record<string, unknown>)[key] = lifted.value;
      else issues.push({ field: key, message: `Invalid ${key === "a11y" ? "accessibility settings" : "device visibility"}; kept as stored and rendered as before; not held by the model` });
      continue;
    }
    (fields as Record<string, unknown>)[key] = value;
  }
  return { fields, issues };
}

/** The canonical website-v1 section (without id) for node fields. */
export function repackV1Section(sectionType: string, fields: SectionFields): Record<string, unknown> {
  const out: Record<string, unknown> = { type: sectionType, props: repackStoredProps(fields) };
  for (const key of V1_SECTION_EXTENSIONS) if (fields[key] !== undefined) out[key] = fields[key];
  return out;
}

/** `section` is the website-v1 section without its id. */
export function liftV1Section(section: Record<string, unknown>, where: string): LiftedSection {
  const type = nodeTypeForSection(section.type, where);
  const { fields, issues } = liftV1Fields(section, where);
  const exact = sameJson(repackV1Section(section.type as string, fields), section);
  return { type, fields, issues, ...(exact ? {} : { source: { form: "v1" as const, raw: section } }) };
}

/** The website-v1 section (without id) for a node. */
export function writeV1Section(node: KcdNode): Record<string, unknown> {
  const sectionType = legacySectionTypeOf(node.type)!;
  const source = legacyOfNode(node).source;
  if (source && "raw" in source && unchanged(node, source)) {
    if (source.form === "v1") return source.raw as Record<string, unknown>;
    // A stored row seen as website-v1 — exactly buildDefinitionFromProjectParts' shape.
    const props = source.raw as Record<string, unknown>;
    const out: Record<string, unknown> = { type: sectionType, props };
    for (const key of V1_SECTION_EXTENSIONS) {
      const stored = props[`_${key}`];
      if (stored != null) out[key] = stored;
    }
    return out;
  }
  return repackV1Section(sectionType, sectionFieldsOf(node));
}

// ── Shadow check ──────────────────────────────────────────────────────────────

/** Whether the node's content is still exactly what its preserved source lifts to. */
function unchanged(node: KcdNode, source: NonNullable<LegacyNodeData["source"]>): boolean {
  try {
    const raw = source.raw;
    const relifted =
      source.form === "rows"
        ? liftRowSection(storageSectionType(node.type), raw, "shadow", node.type)
        : liftV1Section(raw as Record<string, unknown>, "shadow");
    return relifted.type === node.type && sameJson(relifted.fields, sectionFieldsOf(node));
  } catch {
    return false;
  }
}
