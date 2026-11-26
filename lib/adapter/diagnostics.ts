/**
 * Diagnostic model for the Aesthetic Adapter.
 *
 * DESIGN RULES:
 * - No silent degradation. Material information that cannot be compiled must
 *   produce a diagnostic entry — not disappear.
 * - Errors and BLOCKED entries prevent certification. Warnings do not.
 * - Every diagnostic has a stable code so tooling can key on it.
 */

import { z } from "zod";

// ── Severity ──────────────────────────────────────────────────────────────────

export const diagnosticSeveritySchema = z.enum([
  "error",    // Must be resolved before certification can pass
  "warning",  // Should be reviewed; does not block certification by itself
  "info",     // Informational; no action required
  "blocked",  // Explicitly blocked; treated as error for certification
]);

export type DiagnosticSeverity = z.infer<typeof diagnosticSeveritySchema>;

// ── Diagnostic codes ──────────────────────────────────────────────────────────
//
// Stable code strings for programmatic handling.
// Prefixed by domain: SECTION_, FONT_, MOTION_, CUSTOM_, CAPABILITY_, ASSET_,
// CERTIFICATION_, PROVENANCE_, VERSION_, INPUT_.

export const DIAGNOSTIC_CODES = [
  // ── Section errors ──────────────────────────────────────────────────────
  "SECTION_TYPE_UNKNOWN",               // error: section type is not in the known registry
  "SECTION_TYPE_OWNER_PORTFOLIO_LEAK",  // error: owner-portfolio section type in an Aesthetic
  "SECTION_PROPS_INVALID",              // error: section props fail schema validation

  // ── Font errors ──────────────────────────────────────────────────────────
  "FONT_LICENSE_BLOCKED",               // error: font license does not permit commercial web use
  "FONT_LICENSE_UNKNOWN",               // warning: font license is not documented
  "FONT_MISSING_FALLBACK",              // error: font has no fallback stack
  "FONT_SELF_HOSTED_NO_PROVENANCE",     // warning: self-hosted font lacks provenance record
  "FONT_GOOGLE_SPEC_MISSING",           // warning: google-fonts font missing googleFontsSpec
  "FONT_CDN_URL_MISSING",              // error: cdn-variable font missing cdnUrl

  // ── Motion errors / warnings ──────────────────────────────────────────────
  "MOTION_NO_REDUCED_FALLBACK",         // error: MotionSpec has no reducedMotionFallback
  "MOTION_DOWNGRADED",                  // warning: complex animation approximated to simpler one
  "MOTION_NATIVE_PRIMITIVE",            // info: motion compiled to a native Kebu primitive
  "MOTION_CUSTOM_COMPONENT",            // info: motion preserved in a CustomComponentSpec
  "MOTION_UNSUPPORTED",                 // error: motion cannot be compiled (non-material: warning)
  "MOTION_APPROXIMATED",                // warning: animation approximated — visual fidelity reduced

  // ── Custom component errors ────────────────────────────────────────────────
  "CUSTOM_COMPONENT_BLOCKED",           // blocked: component has JS/React that requires review
  "CUSTOM_COMPONENT_PENDING_REVIEW",    // warning: component awaits human security review
  "CUSTOM_COMPONENT_NO_FALLBACK",       // error: material component has no staticHtmlFallback
  "CUSTOM_COMPONENT_CSS_REJECTED",      // error: component CSS has forbidden constructs

  // ── Capability overflow ────────────────────────────────────────────────────
  "CAPABILITY_OVERFLOW_UNSUPPORTED",    // error (if material): UNSUPPORTED capability in design
  "CAPABILITY_OVERFLOW_EXTENSION",      // warning: capability needs an IR extension
  "CAPABILITY_OVERFLOW_CUSTOM_HATCH",   // info: capability uses the approved custom-escape path

  // ── Asset / provenance errors ──────────────────────────────────────────────
  "ASSET_MISSING_PROVENANCE",           // warning: asset has incomplete provenance
  "ASSET_LICENSE_UNKNOWN",              // warning: asset license is unknown
  "ASSET_LICENSE_COMMERCIAL_BLOCKED",   // error: asset license blocks commercial use

  // ── Certification failures ──────────────────────────────────────────────────
  "CERTIFICATION_F1_FAIL",              // error: structural fidelity check failed
  "CERTIFICATION_F2_FAIL",              // error: visual screenshot comparison failed
  "CERTIFICATION_F3_FAIL",              // error: responsive fidelity check failed
  "CERTIFICATION_F4_FAIL",              // error: motion/interaction fidelity check failed
  "CERTIFICATION_F5_FAIL",              // error: editable-binding verification failed
  "CERTIFICATION_F6_FAIL",              // error: source immutability check failed
  "CERTIFICATION_F7_FAIL",              // error: accessibility/reduced-motion check failed

  // ── Provenance ────────────────────────────────────────────────────────────
  "PROVENANCE_SOURCE_UNKNOWN",          // warning: source type is unknown
  "PROVENANCE_HASH_MISMATCH",           // error: source hash does not match recorded value

  // ── Version handling ──────────────────────────────────────────────────────
  "VERSION_UNKNOWN_CONTRACT",           // error: contract version is unrecognized
  "VERSION_DEPRECATED",                 // warning: contract version is deprecated

  // ── Input validation ──────────────────────────────────────────────────────
  "INPUT_MALFORMED",                    // error: input does not parse as valid JSON
  "INPUT_SCHEMA_INVALID",               // error: input fails schema validation
  "INPUT_HOSTILE_CONTENT",              // blocked: input contains suspicious/hostile patterns
] as const;

export type DiagnosticCode = (typeof DIAGNOSTIC_CODES)[number];

export const diagnosticCodeSchema = z.enum(DIAGNOSTIC_CODES);

// ── Diagnostic location ───────────────────────────────────────────────────────

export const diagnosticLocationSchema = z.object({
  /** ID of the section this diagnostic refers to, if any. */
  sectionId: z.string().trim().max(200).optional(),
  /** Page slug, if applicable. */
  pageSlug: z.string().trim().max(200).optional(),
  /** Custom component ID, if applicable. */
  componentId: z.string().trim().max(200).optional(),
  /** Asset ID, if applicable. */
  assetId: z.string().trim().max(200).optional(),
  /** Font family name, if applicable. */
  fontFamily: z.string().trim().max(100).optional(),
  /** Motion spec ID, if applicable. */
  motionSpecId: z.string().trim().max(80).optional(),
  /** Specific field within the identified entity. */
  field: z.string().trim().max(200).optional(),
});

export type DiagnosticLocation = z.infer<typeof diagnosticLocationSchema>;

// ── DiagnosticEntry ───────────────────────────────────────────────────────────

export const diagnosticEntrySchema = z.object({
  code: diagnosticCodeSchema,
  severity: diagnosticSeveritySchema,
  message: z.string().trim().min(1).max(2000),
  location: diagnosticLocationSchema.optional(),
  /** Extra structured data useful for tooling (lossless — not displayed to end users). */
  detail: z.unknown().optional(),
});

export type DiagnosticEntry = z.infer<typeof diagnosticEntrySchema>;

// ── DiagnosticReport ──────────────────────────────────────────────────────────

export const diagnosticReportSchema = z.object({
  entries: z.array(diagnosticEntrySchema),
  errorCount: z.number().int().min(0),
  warningCount: z.number().int().min(0),
  infoCount: z.number().int().min(0),
  blockedCount: z.number().int().min(0),
  /**
   * True when errorCount > 0 or blockedCount > 0.
   * A report with hasBlockers cannot receive a PASS certification.
   */
  hasBlockers: z.boolean(),
});

export type DiagnosticReport = z.infer<typeof diagnosticReportSchema>;

// ── Builder helpers ───────────────────────────────────────────────────────────

export function buildDiagnosticReport(entries: DiagnosticEntry[]): DiagnosticReport {
  const errorCount = entries.filter((e) => e.severity === "error").length;
  const warningCount = entries.filter((e) => e.severity === "warning").length;
  const infoCount = entries.filter((e) => e.severity === "info").length;
  const blockedCount = entries.filter((e) => e.severity === "blocked").length;
  return {
    entries,
    errorCount,
    warningCount,
    infoCount,
    blockedCount,
    hasBlockers: errorCount > 0 || blockedCount > 0,
  };
}

export function emptyDiagnosticReport(): DiagnosticReport {
  return buildDiagnosticReport([]);
}

export function makeDiagnostic(
  code: DiagnosticCode,
  severity: DiagnosticSeverity,
  message: string,
  location?: DiagnosticLocation,
  detail?: unknown,
): DiagnosticEntry {
  return { code, severity, message, ...(location ? { location } : {}), ...(detail !== undefined ? { detail } : {}) };
}
