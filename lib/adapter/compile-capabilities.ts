/**
 * Capability negotiation — evaluates every IR capability against the current
 * WebsiteDefinition target and classifies each as NATIVE, EXTENSION_REQUIRED,
 * CUSTOM_ESCAPE_HATCH, or UNSUPPORTED.
 *
 * This is the first stage of compilation. The result drives downstream
 * compilation decisions: NATIVE capabilities compile fully, the rest
 * are preserved in IR and recorded in the CompilationReport.
 */

import type { CapabilityName, CapabilityClassification, AdapterDesignIR } from "./ir";
import type { CapabilityCompilationEntry, ExtensionRequirement } from "./compile-report";

// ── Static target capability map ──────────────────────────────────────────────
//
// Reflects what WebsiteDefinition (website-v1) can express TODAY.
// Update this when the Builder schema is extended.

export const TARGET_CAPABILITY_MAP: Record<CapabilityName, CapabilityClassification> = {
  // Sections compile directly — type, props, delta deviceOverrides all natively supported.
  "sections": "NATIVE",

  // Text, heading, body copy, button labels all compile into section props.
  "editable-content": "NATIVE",

  // imageUrl / src fields on sections carry asset URLs natively.
  "assets": "NATIVE",

  // theme.fontDisplay + theme.fontBody — two slots, names only, no provenance.
  // Full FontContractV1 (license, provenance, loading strategy) cannot be expressed.
  "typography": "NATIVE",

  // products, events, testimonials, gallery sections all compile.
  "repeated-collections": "NATIVE",

  // form section compiles natively.
  "forms": "NATIVE",

  // navigation section compiles natively.
  "navigation": "NATIVE",

  // Custom components that have been approved compile as a section prop.
  // Unapproved custom components BLOCK compilation for that section.
  "custom-components": "CUSTOM_ESCAPE_HATCH",

  // Live product catalog bindings (productId → live lookup) are not expressible
  // in WebsiteDefinition. Products section uses static inline items only.
  "commerce-product-bindings": "EXTENSION_REQUIRED",

  // WebsiteDefinition only has theme.motion: "none" | "expressive" (binary).
  // Full MotionSpec (trigger, scroll-relationship, looping, reduced-motion, etc.)
  // cannot be expressed. The binary flag will NOT be set to "expressive" based on IR
  // motionSpecs alone — that would constitute silent flattening.
  "motion": "EXTENSION_REQUIRED",

  // Scripted scroll effects, custom event handlers, etc. not in WD schema.
  "custom-interactions": "EXTENSION_REQUIRED",

  // Per-device independent section lists (not delta overrides). WD only supports
  // delta deviceOverrides (tablet/mobile record of prop overrides), not full
  // independent layouts per device.
  "device-independent-compositions": "EXTENSION_REQUIRED",

  // hideOn/showOn per section are not in WD schema.
  "responsive-visibility": "EXTENSION_REQUIRED",

  // ariaLabel, ariaRole, focusable, altTexts, headingLevel, ariaHidden — none in WD.
  "accessibility-metadata": "EXTENSION_REQUIRED",

  // Live data bindings (CMS field refs, commerce catalog lookups) — no WD equivalent.
  "dynamic-data": "EXTENSION_REQUIRED",
};

// ── Proposed extensions ────────────────────────────────────────────────────────
//
// For each EXTENSION_REQUIRED capability, this records the exact minimal schema
// change that would enable faithful compilation. These are documentation — not
// implementation. They will be reviewed before any Builder schema changes.

export const PROPOSED_EXTENSIONS: ExtensionRequirement[] = [
  {
    id: "EXT-WD-001",
    capability: "motion",
    description:
      "Add structured MotionSpec array to section and page schemas, replacing the binary " +
      "theme.motion flag for richer motion representation.",
    proposedExtension:
      "In websiteSectionSchema: add `motionSpecs?: MotionSpec[]` optional field. " +
      "In websitePageSchema: add `motionSpecs?: MotionSpec[]` optional field. " +
      "In themeSchema: add `motionSpecs?: MotionSpec[]` optional field for IR-level specs. " +
      "Keep `motion: 'none' | 'expressive'` as a coarse fallback.",
    affectedSchemas: ["websiteSectionSchema", "websitePageSchema", "themeSchema"],
    backwardCompatible: true,
    priority: "high",
  },
  {
    id: "EXT-WD-002",
    capability: "device-independent-compositions",
    description:
      "Add full per-device section lists to section and page schemas. " +
      "Current deviceOverrides only supports delta prop overrides, not independent layouts.",
    proposedExtension:
      "In websiteSectionSchema: add `deviceCompositions?: Array<{ device: 'desktop' | 'tablet' | 'mobile'; sections: WebsiteSection[] }>` optional field. " +
      "In websitePageSchema: add `deviceCompositions?: Array<{ device: 'desktop' | 'tablet' | 'mobile'; sections: WebsiteSection[] }>` optional field.",
    affectedSchemas: ["websiteSectionSchema", "websitePageSchema"],
    backwardCompatible: true,
    priority: "high",
  },
  {
    id: "EXT-WD-003",
    capability: "accessibility-metadata",
    description:
      "Add accessibility metadata to section schema for screen-reader and ARIA support.",
    proposedExtension:
      "In websiteSectionSchema: add `a11y?: { ariaLabel?: string; ariaRole?: string; focusable?: boolean; reducedMotionSafe?: boolean; altTexts?: Record<string,string>; headingLevel?: number; ariaHidden?: boolean }` optional field.",
    affectedSchemas: ["websiteSectionSchema"],
    backwardCompatible: true,
    priority: "medium",
  },
  {
    id: "EXT-WD-004",
    capability: "responsive-visibility",
    description:
      "Add per-section show/hide rules by device breakpoint.",
    proposedExtension:
      "In websiteSectionSchema: add `responsiveVisibility?: { hideOn?: Array<'desktop' | 'tablet' | 'mobile'>; showOn?: Array<'desktop' | 'tablet' | 'mobile'> }` optional field.",
    affectedSchemas: ["websiteSectionSchema"],
    backwardCompatible: true,
    priority: "medium",
  },
  {
    id: "EXT-WD-005",
    capability: "dynamic-data",
    description:
      "Add live data binding references so sections can pull from catalog/CMS instead of static inline items.",
    proposedExtension:
      "In websiteSectionSchema: add `dataBinding?: { source: 'kebu-catalog' | 'kebu-blog' | 'external-url'; collectionId?: string; filter?: Record<string,unknown>; limit?: number }` optional field. " +
      "In products sectionPropsSchema: add `catalogSource?: 'kebu-catalog' | 'static'` field (default: 'static' keeps backward compat). " +
      "This is a larger change than EXT-WD-001–004 and requires server-side rendering support.",
    affectedSchemas: ["websiteSectionSchema", "sectionPropsSchemas.products"],
    backwardCompatible: true,
    priority: "low",
  },
  {
    id: "EXT-WD-006",
    capability: "commerce-product-bindings",
    description:
      "Products section currently uses static inline items. Live catalog product bindings " +
      "(productId lookup, inventory, pricing from Kebu catalog) require schema + server-side support.",
    proposedExtension:
      "In sectionPropsSchemas.products: add `liveProductIds?: string[]` (UUIDs of catalog products to include). " +
      "Renderer checks liveProductIds first, falls back to inline items. " +
      "Requires server-side product lookup at render time.",
    affectedSchemas: ["sectionPropsSchemas.products"],
    backwardCompatible: true,
    priority: "medium",
  },
];

// ── Negotiation result ────────────────────────────────────────────────────────

export type CapabilityNegotiationResult = {
  entries: CapabilityCompilationEntry[];
  extensionsRequired: ExtensionRequirement[];
  nativeCount: number;
  extensionRequiredCount: number;
  customEscapeHatchCount: number;
  unsupportedCount: number;
};

// ── Main negotiation function ─────────────────────────────────────────────────

/**
 * Evaluates IR capabilities against the current WebsiteDefinition target.
 *
 * Uses the static capability map plus per-section analysis to determine
 * what was declared in the IR and how it will be handled.
 */
export function negotiateCapabilities(ir: AdapterDesignIR): CapabilityNegotiationResult {
  const entries: CapabilityCompilationEntry[] = [];

  // Collect declared capabilities from the IR
  const declaredCapabilities = new Set<CapabilityName>();

  // Collect from page-level section capability declarations (AestheticContractV1 path)
  // and from IR-level capability overflows
  if (ir.capabilityOverflows) {
    for (const overflow of ir.capabilityOverflows) {
      declaredCapabilities.add(overflow.capability);
    }
  }

  // Scan sections for implicit capability usage
  for (const page of ir.pages) {
    for (const section of page.sections) {
      // Motion declared if any section has motionSpecs
      if (section.motionSpecs && section.motionSpecs.length > 0) {
        declaredCapabilities.add("motion");
      }
      // Device-independent compositions
      if (section.deviceCompositions && section.deviceCompositions.length > 0) {
        declaredCapabilities.add("device-independent-compositions");
      }
      // Accessibility metadata
      if (section.accessibilityMetadata) {
        declaredCapabilities.add("accessibility-metadata");
      }
      // Responsive visibility
      if (section.responsiveVisibility) {
        declaredCapabilities.add("responsive-visibility");
      }
      // Custom components
      if (section.customComponent) {
        declaredCapabilities.add("custom-components");
      }
    }
  }

  // IR-level motionSpecs
  if (ir.motionSpecs && ir.motionSpecs.length > 0) {
    declaredCapabilities.add("motion");
  }

  // Always include structural capabilities that are always present
  declaredCapabilities.add("sections");
  declaredCapabilities.add("editable-content");
  declaredCapabilities.add("assets");
  declaredCapabilities.add("typography");
  declaredCapabilities.add("navigation");

  // Build compilation entries for each declared capability
  for (const cap of declaredCapabilities) {
    const classification = TARGET_CAPABILITY_MAP[cap];

    let behavior: CapabilityCompilationEntry["behavior"];
    let preservedIn: CapabilityCompilationEntry["preservedIn"] | undefined;

    switch (classification) {
      case "NATIVE":
        behavior = "compiled";
        break;
      case "EXTENSION_REQUIRED":
        behavior = "preserved-in-ir";
        preservedIn = "ir-field";
        break;
      case "CUSTOM_ESCAPE_HATCH":
        behavior = "compiled"; // approved ones compile; unapproved are blocked at section level
        break;
      case "UNSUPPORTED":
        behavior = "unsupported";
        preservedIn = "diagnostics";
        break;
    }

    const entry: CapabilityCompilationEntry = {
      capability: cap,
      classification,
      behavior,
    };
    if (preservedIn) entry.preservedIn = preservedIn;

    entries.push(entry);
  }

  // Find extensions required for EXTENSION_REQUIRED capabilities that were used
  const extensionsRequired = PROPOSED_EXTENSIONS.filter((ext) =>
    declaredCapabilities.has(ext.capability),
  );

  const nativeCount = entries.filter((e) => e.classification === "NATIVE").length;
  const extensionRequiredCount = entries.filter((e) => e.classification === "EXTENSION_REQUIRED").length;
  const customEscapeHatchCount = entries.filter((e) => e.classification === "CUSTOM_ESCAPE_HATCH").length;
  const unsupportedCount = entries.filter((e) => e.classification === "UNSUPPORTED").length;

  return {
    entries,
    extensionsRequired,
    nativeCount,
    extensionRequiredCount,
    customEscapeHatchCount,
    unsupportedCount,
  };
}
