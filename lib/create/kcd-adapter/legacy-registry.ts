/**
 * `legacy-section:*` node types — the 41 existing 3B section types as compatibility nodes
 * (3C freeze §2, approval confirmation 2).
 *
 * Props, overrides and extensions are exactly as stored today. Writes keep the 3B save boundary
 * (`sectionPropsForSave`): the definition validates the node as the Builder would save it.
 * Overridable keys are the 3B per-device keys (DEVICE_OVERRIDE_KEYS). Legacy sections render
 * every stored override key, as 3B does (responsive.ts).
 */
import {
  PILOT_DEFINITIONS,
  createRegistry,
  legacySectionType,
  legacySectionTypeOf,
  type Capability,
  type NodeTypeDefinition,
  type Registry,
} from "@/lib/creative-core";
import { DEVICE_OVERRIDE_KEYS } from "@/lib/create/device-overrides";
import { sectionPropsForSave } from "@/lib/create/section-props-boundary";
import { SECTION_TYPES, sectionPropsSchemas } from "@/lib/create/website-schema";
import type { z } from "zod";
import { repackStoredProps, sectionFieldsOf } from "./stored-props";

export type LegacySectionType = (typeof SECTION_TYPES)[number];

/**
 * What a legacy section can carry. Motion, interactions and data connections are stored and
 * preserved; whether a renderer realizes them is its manifest's decision (preflight surfaces it).
 */
const LEGACY_CAPABILITIES: readonly Capability[] = [
  "layout.flow", "responsive.overrides", "text.edit", "media", "a11y", "links", "motion", "interaction", "dataBinding",
];

export function legacyDefinition(sectionType: LegacySectionType): NodeTypeDefinition {
  return {
    type: legacySectionType(sectionType),
    version: 1,
    displayName: sectionType,
    capabilities: new Set(LEGACY_CAPABILITIES),
    propsSchema: sectionPropsSchemas[sectionType] as unknown as z.ZodType<Record<string, unknown>>,
    writePolicy: "legacy-3b-boundary",
    validateWrite: (node) =>
      sectionPropsForSave(legacySectionTypeOf(node.type) as LegacySectionType, repackStoredProps(sectionFieldsOf(node))),
    properties: (DEVICE_OVERRIDE_KEYS[sectionType] ?? []).map((key) => ({
      key,
      label: key,
      control: "text" as const,
      capability: "responsive.overrides" as const,
      overridable: true,
    })),
    children: "none",
    placement: "root",
    migrations: [],
  };
}

export const LEGACY_DEFINITIONS: readonly NodeTypeDefinition[] = SECTION_TYPES.map(legacyDefinition);

/** The Builder's registry: pilot primitives + every legacy section type. */
export const builderRegistry: Registry = createRegistry([...PILOT_DEFINITIONS, ...LEGACY_DEFINITIONS]);
