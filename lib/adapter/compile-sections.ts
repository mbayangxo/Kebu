/**
 * Section compilation — maps IRPage[] → WebsitePage[].
 *
 * DESIGN RULES:
 * - Owner-portfolio section types (maylecor-home, etc.) BLOCK compilation.
 *   They are never allowed in Adapter output per the architectural invariant.
 * - For native section types, props and delta deviceOverrides compile directly.
 * - motionSpecs, deviceCompositions, accessibilityMetadata, responsiveVisibility
 *   are EXTENSION_REQUIRED — they are preserved in AdapterDesignIR and reported,
 *   NOT compiled to WebsiteDefinition.
 * - customComponent: approved (approvedBy present) → CUSTOM_ESCAPE_HATCH section;
 *   unapproved/blocked material component → blocks that section's compilation.
 * - Section types not in SECTION_TYPES → UNSUPPORTED, not compiled.
 * - Sections sorted by sortOrder for deterministic output.
 */

import { SECTION_TYPES } from "@/lib/create/website-schema";
import { OWNER_PORTFOLIO_SECTION_TYPES, isOwnerPortfolioType } from "./ir";
import { isComponentBlocked, isMaterialAndBlocked } from "./components";
import type { IRPage, IRSection } from "./ir";
import type { CapabilityCompilationEntry } from "./compile-report";
import type { DiagnosticEntry } from "./diagnostics";
import { makeDiagnostic } from "./diagnostics";

// Native section types as a Set for O(1) lookup
const NATIVE_SECTION_TYPES = new Set<string>(SECTION_TYPES as unknown as string[]);
// Remove owner-portfolio types from the native set for clarity
for (const t of OWNER_PORTFOLIO_SECTION_TYPES) {
  NATIVE_SECTION_TYPES.delete(t);
}

// ── Output types ──────────────────────────────────────────────────────────────

export type CompiledSection = {
  id?: string;
  type: string;
  props: Record<string, unknown>;
};

export type CompiledPage = {
  slug: string;
  title: string;
  sections: CompiledSection[];
};

export type SectionCompilationResult = {
  pages: CompiledPage[];
  capabilityEntries: CapabilityCompilationEntry[];
  diagnostics: DiagnosticEntry[];
  sectionsCompiled: number;
  sectionsBlocked: string[];
  sectionsPreservedInIR: string[];
  compilationBlocked: boolean;
  blockingReasons: string[];
};

// ── Section compiler ──────────────────────────────────────────────────────────

export function compileSections(pages: IRPage[]): SectionCompilationResult {
  const compiledPages: CompiledPage[] = [];
  const capabilityEntries: CapabilityCompilationEntry[] = [];
  const diagnostics: DiagnosticEntry[] = [];

  let sectionsCompiled = 0;
  const sectionsBlocked: string[] = [];
  const sectionsPreservedInIR: string[] = [];
  const blockingReasons: string[] = [];
  let compilationBlocked = false;

  // Track which capabilities had overflows (for dedup)
  const deviceCompOverflowSections: string[] = [];
  const a11yOverflowSections: string[] = [];
  const unsupportedTypeSections: string[] = [];

  // Sort pages by slug for determinism
  const sortedPages = [...pages].sort((a, b) => a.slug.localeCompare(b.slug));

  for (const page of sortedPages) {
    const compiledSections: CompiledSection[] = [];

    // Sort sections by sortOrder for determinism
    const sortedSections = [...page.sections].sort((a, b) => a.sortOrder - b.sortOrder);

    for (const section of sortedSections) {
      const sectionId = section.id ?? `${page.slug}:${section.sortOrder}`;

      // ── Guard: owner-portfolio section types ──────────────────────────────
      if (isOwnerPortfolioType(section.sectionType)) {
        compilationBlocked = true;
        const reason = `Owner-portfolio section type "${section.sectionType}" (id: ${sectionId}) is prohibited in Adapter output.`;
        blockingReasons.push(reason);
        sectionsBlocked.push(sectionId);
        diagnostics.push(
          makeDiagnostic("SECTION_TYPE_OWNER_PORTFOLIO_LEAK", "error", reason, { sectionId }),
        );
        continue;
      }

      // ── Guard: custom component security boundary ─────────────────────────
      if (section.customComponent) {
        if (isMaterialAndBlocked(section.customComponent)) {
          compilationBlocked = true;
          const reason = `Material custom component "${section.customComponent.id}" in section "${sectionId}" is blocked/unapproved. Compilation blocked for this section.`;
          blockingReasons.push(reason);
          sectionsBlocked.push(sectionId);
          diagnostics.push(
            makeDiagnostic("CUSTOM_COMPONENT_BLOCKED", "blocked", reason, { sectionId }),
          );
          continue;
        }

        if (isComponentBlocked(section.customComponent)) {
          // Non-material blocked: skip this section (warn, don't block full compilation)
          sectionsBlocked.push(sectionId);
          diagnostics.push(
            makeDiagnostic(
              "CUSTOM_COMPONENT_BLOCKED",
              "warning",
              `Custom component "${section.customComponent.id}" in section "${sectionId}" is blocked/unapproved. Section skipped.`,
              { sectionId },
            ),
          );
          continue;
        }
      }

      // ── Guard: unknown/unsupported section type ───────────────────────────
      if (!NATIVE_SECTION_TYPES.has(section.sectionType)) {
        // Not a native type and not owner-portfolio → UNSUPPORTED
        unsupportedTypeSections.push(sectionId);
        sectionsBlocked.push(sectionId);
        diagnostics.push(
          makeDiagnostic(
            "SECTION_TYPE_UNKNOWN",
            "warning",
            `Section type "${section.sectionType}" (id: ${sectionId}) is not a native WebsiteDefinition type. Section skipped.`,
            { sectionId },
          ),
        );
        continue;
      }

      // ── Compile native section ────────────────────────────────────────────

      // Build base props — deep-clone to avoid mutation
      const compiledProps: Record<string, unknown> = JSON.parse(JSON.stringify(section.props));

      // Delta deviceOverrides (native) — passthrough
      if (section.deviceOverrides) {
        compiledProps.deviceOverrides = section.deviceOverrides;
      }

      // Phase 3B: motion specs compile natively as _motion in props
      if (section.motionSpecs && section.motionSpecs.length > 0) {
        compiledProps._motion = section.motionSpecs;
      }

      // Phase 3B: responsive visibility compiles natively as _visibility in props
      if (section.responsiveVisibility) {
        compiledProps._visibility = section.responsiveVisibility;
      }

      const compiledSection: CompiledSection = {
        type: section.sectionType,
        props: compiledProps,
      };
      if (section.id) compiledSection.id = section.id;

      compiledSections.push(compiledSection);
      sectionsCompiled++;

      // ── Record EXTENSION_REQUIRED overflows ───────────────────────────────
      // Phase 3B: motion and responsive-visibility are now NATIVE (compiled above).
      // Only track remaining EXTENSION_REQUIRED capabilities here.

      let sectionHasOverflow = false;

      if (section.deviceCompositions && section.deviceCompositions.length > 0) {
        deviceCompOverflowSections.push(sectionId);
        sectionHasOverflow = true;
      }
      if (section.accessibilityMetadata) {
        a11yOverflowSections.push(sectionId);
        sectionHasOverflow = true;
      }

      if (sectionHasOverflow) {
        sectionsPreservedInIR.push(sectionId);
      }
    }

    compiledPages.push({
      slug: page.slug,
      title: page.title ?? page.slug,
      sections: compiledSections,
    });
  }

  // ── Build capability entries from overflow tracking ────────────────────────

  if (deviceCompOverflowSections.length > 0) {
    capabilityEntries.push({
      capability: "device-independent-compositions",
      classification: "EXTENSION_REQUIRED",
      behavior: "preserved-in-ir",
      preservedIn: "ir-field",
      detail:
        `${deviceCompOverflowSections.length} section(s) have independent per-device layouts ` +
        "preserved in AdapterDesignIR. Not compiled to WebsiteDefinition — would require " +
        "EXT-WD-002 (deviceCompositions field on section/page).",
      affectedSectionIds: deviceCompOverflowSections,
    });
  }

  if (a11yOverflowSections.length > 0) {
    capabilityEntries.push({
      capability: "accessibility-metadata",
      classification: "EXTENSION_REQUIRED",
      behavior: "preserved-in-ir",
      preservedIn: "ir-field",
      detail:
        `${a11yOverflowSections.length} section(s) have accessibility metadata ` +
        "preserved in AdapterDesignIR. Not compiled to WebsiteDefinition — would require " +
        "EXT-WD-003 (a11y field on section).",
      affectedSectionIds: a11yOverflowSections,
    });
  }

  if (unsupportedTypeSections.length > 0) {
    capabilityEntries.push({
      capability: "sections",
      classification: "UNSUPPORTED",
      behavior: "unsupported",
      preservedIn: "diagnostics",
      detail:
        `${unsupportedTypeSections.length} section(s) with unknown section types could not be compiled. ` +
        "Section data preserved in diagnostics.",
      affectedSectionIds: unsupportedTypeSections,
    });
  }

  return {
    pages: compiledPages,
    capabilityEntries,
    diagnostics,
    sectionsCompiled,
    sectionsBlocked,
    sectionsPreservedInIR,
    compilationBlocked,
    blockingReasons,
  };
}
