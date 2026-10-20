/**
 * Proposed Builder schema extensions for faithful IR compilation.
 *
 * These are DOCUMENTATION ONLY — not implementations.
 * Each extension is the smallest backward-compatible change that would allow
 * full faithful compilation for one capability gap.
 *
 * None of these touch any existing Builder schema. They are proposals for review.
 * See compile-capabilities.ts for the PROPOSED_EXTENSIONS constant used by the compiler.
 *
 * GAP REPORT FORMAT:
 *   Adapter IR capability → Current WD capability → Compilation behavior → Recommended extension
 */

import { PROPOSED_EXTENSIONS } from "./compile-capabilities";
import { TARGET_CAPABILITY_MAP } from "./compile-capabilities";
import type { CapabilityName } from "./ir";

export { PROPOSED_EXTENSIONS, TARGET_CAPABILITY_MAP };

// ── Gap report ────────────────────────────────────────────────────────────────

export type GapReportRow = {
  adapterCapability: CapabilityName;
  currentWdCapability: string;
  compilationBehavior: string;
  recommendedExtension: string;
  extensionId: string | null;
  priority: "high" | "medium" | "low" | "n/a";
};

/**
 * Produces the canonical gap report for Phase 2 review.
 *
 * Format:
 *   Adapter IR capability → Current WD capability → Compilation behavior → Recommended Builder extension
 */
export function buildGapReport(): GapReportRow[] {
  return [
    {
      adapterCapability: "sections",
      currentWdCapability:
        "websiteSectionSchema — 35+ section types (hero, navigation, products, etc.)",
      compilationBehavior:
        "NATIVE. All non-owner-portfolio section types compile directly.",
      recommendedExtension: "None required.",
      extensionId: null,
      priority: "n/a",
    },
    {
      adapterCapability: "editable-content",
      currentWdCapability: "All section props schemas carry text/content fields.",
      compilationBehavior: "NATIVE. Content props compile as-is.",
      recommendedExtension: "None required.",
      extensionId: null,
      priority: "n/a",
    },
    {
      adapterCapability: "assets",
      currentWdCapability:
        "imageUrl / src fields on sections carry asset URLs.",
      compilationBehavior:
        "NATIVE. Asset URL strings compile. " +
        "Full AssetSpec (license, provenance, MIME type, dimensions) preserved in IR only.",
      recommendedExtension: "None required for URL compilation. Asset provenance is IR-only data.",
      extensionId: null,
      priority: "n/a",
    },
    {
      adapterCapability: "typography",
      currentWdCapability:
        "theme.fontDisplay (string) + theme.fontBody (string) — two name slots, no provenance.",
      compilationBehavior:
        "NATIVE for the two primary font slots. " +
        "Additional fonts and all FontContractV1 licensing/provenance preserved in IR only.",
      recommendedExtension:
        "EXT-WD-007 (not yet in PROPOSED_EXTENSIONS): " +
        "Add theme.fontRegistry?: FontRef[] for additional font family registrations. " +
        "Font licensing/provenance remains IR-only (it's an import-time concern, not a render concern).",
      extensionId: "EXT-WD-007",
      priority: "low",
    },
    {
      adapterCapability: "repeated-collections",
      currentWdCapability:
        "products, gallery, events, testimonials sections all support item arrays.",
      compilationBehavior: "NATIVE. Item arrays compile directly.",
      recommendedExtension: "None required.",
      extensionId: null,
      priority: "n/a",
    },
    {
      adapterCapability: "commerce-product-bindings",
      currentWdCapability:
        "products section uses static inline items[] — no live catalog lookup.",
      compilationBehavior:
        "EXTENSION_REQUIRED. Static product items compile. " +
        "Live catalog productId bindings preserved in IR only.",
      recommendedExtension:
        "EXT-WD-006: Add liveProductIds?: string[] to products section. " +
        "Renderer checks liveProductIds first, falls back to inline items. " +
        "Requires server-side product lookup at render time.",
      extensionId: "EXT-WD-006",
      priority: "medium",
    },
    {
      adapterCapability: "forms",
      currentWdCapability: "form section with fields[], formStyle, notifyEmail.",
      compilationBehavior: "NATIVE. Form sections compile directly.",
      recommendedExtension: "None required.",
      extensionId: null,
      priority: "n/a",
    },
    {
      adapterCapability: "navigation",
      currentWdCapability:
        "navigation section with brand, links[], navStyle, navSize, navLayout, etc.",
      compilationBehavior: "NATIVE. Navigation sections compile directly.",
      recommendedExtension: "None required.",
      extensionId: null,
      priority: "n/a",
    },
    {
      adapterCapability: "device-independent-compositions",
      currentWdCapability:
        "page.deviceLayouts: { tablet?: DeviceLayout, mobile?: DeviceLayout } — " +
        "per-device section ordering (sectionOrder) and visibility (hiddenSections). " +
        "Stored in project_pages.device_layouts JSONB column (Phase 3B).",
      compilationBehavior:
        "NATIVE (Phase 3B). page.deviceLayouts persists through build and publish path. " +
        "SiteRenderer applies sectionOrder + hiddenSections for non-desktop devices. " +
        "Desktop is always canonical; tablet/mobile override it non-destructively.",
      recommendedExtension: "None required — fully implemented in Phase 3B.",
      extensionId: null,
      priority: "n/a",
    },
    {
      adapterCapability: "motion",
      currentWdCapability:
        "section.motion (SectionMotionSchema) — per-section declarative specs with trigger, " +
        "transform, durationMs, easing, scrollThreshold, staggerMs, reducedMotionFallback. " +
        "Stored as props._motion in section JSONB, lifted to section.motion at compile time (Phase 3B).",
      compilationBehavior:
        "NATIVE (Phase 3B). section.motion specs stored, built, published, and rendered. " +
        "initScrollEntrances applies CSS custom-property-driven entrance animations. " +
        "prefers-reduced-motion respected via spec.reducedMotionFallback field.",
      recommendedExtension: "None required — fully implemented in Phase 3B.",
      extensionId: null,
      priority: "n/a",
    },
    {
      adapterCapability: "custom-interactions",
      currentWdCapability:
        "No scripted interaction model in WebsiteDefinition. " +
        "Some interactions are implicit in section types (quiz, floating-cta).",
      compilationBehavior:
        "EXTENSION_REQUIRED. Implicit section-type interactions compile. " +
        "Explicit custom interaction specs preserved in IR only.",
      recommendedExtension:
        "EXT-WD-005 (partial): data binding references can model some dynamic behaviors. " +
        "Full custom interaction scripting would require a separate interaction model — " +
        "out of scope until after other extensions land.",
      extensionId: "EXT-WD-005",
      priority: "low",
    },
    {
      adapterCapability: "custom-components",
      currentWdCapability:
        "No native custom component slot in WebsiteDefinition. " +
        "Only approved components may become an escape hatch.",
      compilationBehavior:
        "CUSTOM_ESCAPE_HATCH. Approved (approvedBy present) custom components compile. " +
        "Unapproved/blocked material components BLOCK compilation for that section. " +
        "Unapproved non-material components skip the section with a warning.",
      recommendedExtension:
        "Security boundary must remain. No extension recommended — " +
        "custom components require human approval before compilation.",
      extensionId: null,
      priority: "n/a",
    },
    {
      adapterCapability: "responsive-visibility",
      currentWdCapability:
        "section.visibility: { hideOn?: Device[], showOn?: Device[] } — " +
        "per-section device-level show/hide rules stored in websiteSectionSchema (Phase 3B).",
      compilationBehavior:
        "NATIVE (Phase 3B). section.visibility applied in SiteRenderer before the section " +
        "render loop, filtering sections by the active device. " +
        "Stored as props._visibility in section JSONB, lifted to section.visibility at compile time.",
      recommendedExtension: "None required — fully implemented in Phase 3B.",
      extensionId: null,
      priority: "n/a",
    },
    {
      adapterCapability: "accessibility-metadata",
      currentWdCapability:
        "No ariaLabel, ariaRole, focusable, altTexts, headingLevel, or ariaHidden " +
        "fields in WebsiteDefinition section schema.",
      compilationBehavior:
        "EXTENSION_REQUIRED. Accessibility metadata preserved in IR only. " +
        "Loss of reducedMotionSafe is an accessibility concern.",
      recommendedExtension:
        "EXT-WD-003: Add a11y?: AccessibilityMetadata to websiteSectionSchema. " +
        "Medium priority — required before accessibility certification (F7_ACCESSIBILITY).",
      extensionId: "EXT-WD-003",
      priority: "medium",
    },
    {
      adapterCapability: "dynamic-data",
      currentWdCapability:
        "No live data binding references in WebsiteDefinition. " +
        "All section content is static inline data.",
      compilationBehavior:
        "EXTENSION_REQUIRED. Static content compiles. Live data binding references preserved in IR only.",
      recommendedExtension:
        "EXT-WD-005: Add dataBinding?: { source; collectionId?; filter?; limit? } " +
        "to websiteSectionSchema. Requires server-side rendering support — " +
        "larger scope than EXT-WD-001 through EXT-WD-004.",
      extensionId: "EXT-WD-005",
      priority: "low",
    },
  ] as const;
}

/**
 * Formats the gap report as a human-readable table string.
 * Useful for reporting at Phase 2 completion.
 */
export function formatGapReport(): string {
  const rows = buildGapReport();
  const lines: string[] = [
    "Adapter IR Capability Gap Report",
    "=".repeat(80),
    "",
  ];

  for (const row of rows) {
    lines.push(`Capability:           ${row.adapterCapability}`);
    lines.push(`Current WD support:   ${row.currentWdCapability}`);
    lines.push(`Compilation behavior: ${row.compilationBehavior}`);
    lines.push(`Recommended ext:      ${row.recommendedExtension}`);
    lines.push(`Extension ID:         ${row.extensionId ?? "—"}`);
    lines.push(`Priority:             ${row.priority}`);
    lines.push("-".repeat(80));
    lines.push("");
  }

  return lines.join("\n");
}
