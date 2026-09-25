/**
 * AdapterDesignIR — the rich intermediate representation that is richer than
 * today's WebsiteDefinition.
 *
 * AestheticContractV1 — the versioned contract that a v0-React or manual source
 * must conform to. Compiled into AdapterDesignIR, then into WebsiteDefinition.
 *
 * DESIGN RULES:
 * - The IR must be capable of representing information that today's WebsiteDefinition
 *   cannot yet express. Do not discard information merely because the current
 *   compilation target lacks a native field.
 * - WebsiteDefinition is a compilation target. The IR is NOT dependent on every
 *   implementation detail of WebsiteDefinition.
 * - Owner-portfolio section types (maylecor-home, maylecor-music, legally-blonde-hero,
 *   kdirection-home, kdirection-page) MUST NEVER appear in Adapter output.
 * - The compile step from AdapterDesignIR → WebsiteDefinition is explicitly allowed
 *   to be lossy — but all losses must be documented in CapabilityOverflow and provenance.
 */

import { z } from "zod";
import { motionSpecSchema } from "./motion";
import { fontContractV1Schema } from "./fonts";
import { assetSpecSchema } from "./assets";
import { customComponentSpecSchema } from "./components";
import { diagnosticEntrySchema, diagnosticReportSchema } from "./diagnostics";
import { certificationStatusSchema } from "./certification";
import { designProvenanceSchema } from "./provenance";
import { ADAPTER_VERSION, IR_VERSION, AESTHETIC_CONTRACT_VERSION } from "./versions";

// ── Owner-portfolio section types — NEVER allowed in Adapter output ─────────

export const OWNER_PORTFOLIO_SECTION_TYPES = [
  "maylecor-home",
  "maylecor-music",
  "legally-blonde-hero",
  "kdirection-home",
  "kdirection-page",
] as const;

export type OwnerPortfolioSectionType = (typeof OWNER_PORTFOLIO_SECTION_TYPES)[number];

export function isOwnerPortfolioType(sectionType: string): boolean {
  return (OWNER_PORTFOLIO_SECTION_TYPES as readonly string[]).includes(sectionType);
}

// ── Capability classification ─────────────────────────────────────────────────

export const capabilityClassificationSchema = z.enum([
  "NATIVE",              // WebsiteDefinition can express this fully today
  "EXTENSION_REQUIRED",  // WebsiteDefinition schema extension needed
  "CUSTOM_ESCAPE_HATCH", // Represented via CustomComponentSpec (approved path)
  "UNSUPPORTED",         // Cannot be represented in current or planned schema
]);

export type CapabilityClassification = z.infer<typeof capabilityClassificationSchema>;

export const capabilityNameSchema = z.enum([
  "editable-content",
  "assets",
  "typography",
  "sections",
  "repeated-collections",
  "commerce-product-bindings",
  "forms",
  "navigation",
  "device-independent-compositions",
  "motion",
  "custom-interactions",
  "custom-components",
  "responsive-visibility",
  "accessibility-metadata",
  "dynamic-data",
]);

export type CapabilityName = z.infer<typeof capabilityNameSchema>;

export const capabilityDeclarationSchema = z.object({
  capability: capabilityNameSchema,
  classification: capabilityClassificationSchema,
  notes: z.string().trim().max(500).optional(),
});

export type CapabilityDeclaration = z.infer<typeof capabilityDeclarationSchema>;

// ── Capability overflow ───────────────────────────────────────────────────────
//
// When a capability cannot be fully compiled, this records what happened to it.
// NEVER silently discard — always record in CapabilityOverflow.

export const capabilityOverflowSchema = z.object({
  capability: capabilityNameSchema,
  classification: z.enum(["EXTENSION_REQUIRED", "CUSTOM_ESCAPE_HATCH", "UNSUPPORTED"]),
  detail: z.string().trim().max(500).optional(),
  /**
   * Where the overflow information was preserved (or "lost" if unavoidably discarded).
   * "lost" requires explicit documentation of why.
   */
  preservedIn: z.enum(["ir-field", "custom-component", "diagnostics", "lost"]),
  lostReason: z.string().trim().max(500).optional(),
});

export type CapabilityOverflow = z.infer<typeof capabilityOverflowSchema>;

// ── Accessibility metadata ────────────────────────────────────────────────────

export const accessibilityMetadataSchema = z.object({
  ariaLabel: z.string().trim().max(300).optional(),
  ariaRole: z.string().trim().max(80).optional(),
  focusable: z.boolean().optional(),
  /** Whether this section is safe for reduced-motion users without any changes. */
  reducedMotionSafe: z.boolean().optional(),
  /** Alt text overrides for specific assets within the section, keyed by asset ID. */
  altTexts: z.record(z.string().trim().max(200), z.string().trim().max(500)).optional(),
  /** Heading level for the section's primary heading (1–6). */
  headingLevel: z.number().int().min(1).max(6).optional(),
  /** Whether this section should be skipped by screen readers. */
  ariaHidden: z.boolean().optional(),
});

export type AccessibilityMetadata = z.infer<typeof accessibilityMetadataSchema>;

// ── Responsive visibility ─────────────────────────────────────────────────────

export const responsiveVisibilitySchema = z.object({
  /** Devices on which this section/element should be hidden. */
  hideOn: z.array(z.enum(["desktop", "tablet", "mobile"])).optional(),
  /** Devices on which this section/element should be shown (if not hidden). */
  showOn: z.array(z.enum(["desktop", "tablet", "mobile"])).optional(),
});

export type ResponsiveVisibility = z.infer<typeof responsiveVisibilitySchema>;

// ── IRSection ─────────────────────────────────────────────────────────────────
//
// Sections can contain per-device compositions. To avoid a circular Zod schema
// reference (irSectionSchema references itself), device-composition sections use
// a "flat" base schema that does not recurse further. In practice device
// compositions are one level deep — sections inside them don't need their own
// device compositions.

const irSectionBaseFields = {
  id: z.string().trim().min(1).max(200),
  sectionType: z.string().trim().min(1).max(80),
  sortOrder: z.number().int().min(0),
  props: z.record(z.string(), z.unknown()),
  deviceOverrides: z
    .object({
      tablet: z.record(z.string(), z.unknown()).optional(),
      mobile: z.record(z.string(), z.unknown()).optional(),
    })
    .optional(),
  motionSpecs: z.array(motionSpecSchema).optional(),
  responsiveVisibility: responsiveVisibilitySchema.optional(),
  accessibilityMetadata: accessibilityMetadataSchema.optional(),
  customComponent: customComponentSpecSchema.optional(),
  capabilityOverflows: z.array(capabilityOverflowSchema).optional(),
  diagnostics: z.array(diagnosticEntrySchema).optional(),
};

/** A section inside a deviceComposition (no further device decomposition). */
export const irFlatSectionSchema = z.object(irSectionBaseFields);
export type IRFlatSection = z.infer<typeof irFlatSectionSchema>;

export const irDeviceCompositionSchema = z.object({
  device: z.enum(["desktop", "tablet", "mobile"]),
  /** Independent section list for this device — not deltas from desktop. */
  sections: z.array(irFlatSectionSchema),
});
export type IRDeviceComposition = z.infer<typeof irDeviceCompositionSchema>;

export const irSectionSchema = z.object({
  ...irSectionBaseFields,
  /**
   * Full per-device compositions when the mobile/tablet layout is NOT a delta
   * from desktop but an entirely different arrangement.
   * These cannot be expressed as deviceOverrides (which are deltas).
   * This is an EXTENSION_REQUIRED capability for WebsiteDefinition.
   */
  deviceCompositions: z.array(irDeviceCompositionSchema).optional(),
});

export type IRSection = z.infer<typeof irSectionSchema>;

// ── IRPage ─────────────────────────────────────────────────────────────────────

export const irPageSchema = z.object({
  /** Stable page ID within the IR. */
  id: z.string().trim().min(1).max(200),
  /** URL slug for this page (e.g. "home", "about", "music"). */
  slug: z.string().trim().min(1).max(100),
  /** Page display title. */
  title: z.string().trim().max(200).optional(),
  /** Sections on this page. */
  sections: z.array(irSectionSchema),
  /**
   * Full per-device page-level recompositions.
   * Use when the entire page layout is radically different per device.
   */
  deviceCompositions: z.array(irDeviceCompositionSchema).optional(),
});

export type IRPage = z.infer<typeof irPageSchema>;

// ── Color system ──────────────────────────────────────────────────────────────

export const colorSystemSchema = z.object({
  primary: z.string().trim().min(1).max(40),
  accent: z.string().trim().min(1).max(40),
  background: z.string().trim().min(1).max(40),
  text: z.string().trim().min(1).max(40),
  surface: z.string().trim().min(1).max(40).optional(),
  link: z.string().trim().min(1).max(40).optional(),
});

export type ColorSystem = z.infer<typeof colorSystemSchema>;

// ── AdapterDesignIR ───────────────────────────────────────────────────────────

export const adapterDesignIRSchema = z.object({
  /** IR schema version — bump when IR structure changes. */
  irVersion: z.literal(IR_VERSION),

  /** Adapter version that produced this IR. */
  adapterVersion: z.string().trim().min(1).max(40).default(ADAPTER_VERSION),

  /** Unique run ID (UUID v4). Correlates this IR with logs and diagnostics. */
  adapterRunId: z.string().trim().uuid(),

  /** Source type (what was imported). */
  sourceType: z.string().trim().min(1).max(40),

  /** Reference to the source (URL, path, commit). */
  sourceRef: z.string().trim().max(500).optional(),

  /** Site title. */
  title: z.string().trim().min(1).max(200),

  /** Core color palette. */
  colorSystem: colorSystemSchema,

  /** Layout spacing feel. */
  spacing: z.enum(["compact", "comfortable", "airy"]).optional(),

  /** Corner radius feel. */
  radius: z.enum(["sharp", "soft", "round"]).optional(),

  /**
   * Theme-level motion flag (mirrors WebsiteDefinition.theme.motion).
   * For richer motion, use motionSpecs.
   */
  motion: z.enum(["none", "expressive"]).optional(),

  /** All motion specs (global — sections also carry per-section specs). */
  motionSpecs: z.array(motionSpecSchema).optional(),

  /** All fonts used in this IR. */
  fonts: z.array(fontContractV1Schema),

  /** Pages. */
  pages: z.array(irPageSchema),

  /** Custom components referenced in sections. */
  customComponents: z.array(customComponentSpecSchema).optional(),

  /** All assets referenced in this IR. */
  assets: z.array(assetSpecSchema).optional(),

  /** Capabilities that overflow WebsiteDefinition's current expressiveness. */
  capabilityOverflows: z.array(capabilityOverflowSchema).optional(),

  /** Diagnostic report for this IR. */
  diagnostics: diagnosticReportSchema,

  /** Full provenance chain. */
  provenance: designProvenanceSchema,

  /** Certification status. */
  certificationStatus: certificationStatusSchema,

  /** If this IR is tied to a known Kebu aesthetic, its ID. */
  aestheticId: z.string().trim().max(40).optional(),
});

export type AdapterDesignIR = z.infer<typeof adapterDesignIRSchema>;

// ── AestheticContractSection ──────────────────────────────────────────────────

export const aestheticContractSectionSchema = z.object({
  sectionType: z.string().trim().min(1).max(80),
  sortOrder: z.number().int().min(0),
  props: z.record(z.string(), z.unknown()),
  motionSpecs: z.array(motionSpecSchema).optional(),
  deviceOverrides: z
    .object({
      tablet: z.record(z.string(), z.unknown()).optional(),
      mobile: z.record(z.string(), z.unknown()).optional(),
    })
    .optional(),
  responsiveVisibility: responsiveVisibilitySchema.optional(),
  accessibilityMetadata: accessibilityMetadataSchema.optional(),
  customComponent: customComponentSpecSchema.optional(),
  capabilityDeclarations: z.array(capabilityDeclarationSchema).optional(),
});

export type AestheticContractSection = z.infer<typeof aestheticContractSectionSchema>;

// ── AestheticContractPage ─────────────────────────────────────────────────────

export const aestheticContractPageSchema = z.object({
  slug: z.string().trim().min(1).max(100),
  title: z.string().trim().max(200).optional(),
  sections: z.array(aestheticContractSectionSchema),
});

export type AestheticContractPage = z.infer<typeof aestheticContractPageSchema>;

// ── AestheticContractV1 ───────────────────────────────────────────────────────

export const aestheticContractV1Schema = z.object({
  /** Contract schema version. */
  contractVersion: z.literal(AESTHETIC_CONTRACT_VERSION),

  /** Adapter version that generated or validated this contract. */
  adapterVersion: z.string().trim().min(1).max(40).default(ADAPTER_VERSION),

  /** Site title. */
  title: z.string().trim().min(1).max(200),

  /** Kebu aesthetic ID if this maps to a known aesthetic. */
  aestheticId: z.string().trim().max(40).optional(),

  /** Core color palette. */
  colorSystem: colorSystemSchema,

  /** Layout spacing feel. */
  spacing: z.enum(["compact", "comfortable", "airy"]).optional(),

  /** Corner radius feel. */
  radius: z.enum(["sharp", "soft", "round"]).optional(),

  /** Theme-level motion flag. */
  motionLevel: z.enum(["none", "expressive"]).optional(),

  /** All fonts required by this Aesthetic. */
  fonts: z.array(fontContractV1Schema),

  /** Pages with section definitions. */
  pages: z.array(aestheticContractPageSchema),

  /** Custom components used by sections in this contract. */
  customComponents: z.array(customComponentSpecSchema).optional(),

  /** All assets referenced by this contract. */
  assets: z.array(assetSpecSchema).optional(),

  /** Capabilities declared by this contract. */
  capabilityDeclarations: z.array(capabilityDeclarationSchema).optional(),

  /** Provenance of this contract. */
  provenance: designProvenanceSchema,

  /** Certification status, if this contract has been certified. */
  certificationStatus: certificationStatusSchema.optional(),

  /** Diagnostics from validation/conversion. */
  diagnostics: diagnosticReportSchema.optional(),
});

export type AestheticContractV1 = z.infer<typeof aestheticContractV1Schema>;
