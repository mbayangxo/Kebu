/**
 * Certification status model for Aesthetic Adapter output.
 *
 * DESIGN RULES:
 * - An Aesthetic that compiles but materially differs from its approved golden
 *   reference does NOT pass. Compilability alone is not certification.
 * - Gallery eligibility requires PASS status. NEEDS_REVIEW and BLOCKED are not
 *   eligible for gallery listing.
 * - Each fidelity dimension (F1–F7) must be explicitly checked or explicitly
 *   marked SKIP with a reason. Pending is not a passing state.
 * - A material unsupported component CANNOT receive PASS certification.
 *   The test suite must verify this invariant.
 */

import { z } from "zod";
import { diagnosticReportSchema, emptyDiagnosticReport } from "./diagnostics";

// ── Fidelity dimensions ───────────────────────────────────────────────────────

export const fidelityDimensionSchema = z.enum([
  "F1_STRUCTURAL",          // Section types, counts, order match the approved design
  "F2_VISUAL",              // Screenshot comparison ≤5% pixel diff from golden reference
  "F3_RESPONSIVE",          // Layout integrity at 375px, 768px, 1280px viewports
  "F4_MOTION",              // Motion/interaction present and compilable; no silent flattening
  "F5_EDITABLE_BINDING",    // Editable content slots bound to real content (no placeholders)
  "F6_SOURCE_IMMUTABILITY", // World/contract file hash matches recorded golden hash
  "F7_ACCESSIBILITY",       // ARIA, reduced-motion, alt text requirements met
]);

export type FidelityDimension = z.infer<typeof fidelityDimensionSchema>;

// ── Fidelity result ───────────────────────────────────────────────────────────

export const fidelityResultSchema = z.enum([
  "PASS",
  "FAIL",
  "SKIP",    // Intentionally skipped with documented reason
  "PENDING", // Not yet run — blocks certification
]);

export type FidelityResult = z.infer<typeof fidelityResultSchema>;

// ── Fidelity entry ────────────────────────────────────────────────────────────

export const fidelityEntrySchema = z.object({
  dimension: fidelityDimensionSchema,
  result: fidelityResultSchema,
  /** Description of how this check was performed. */
  method: z.string().trim().min(1).max(500),
  /** Human-readable notes, especially required for FAIL and SKIP. */
  notes: z.string().trim().max(2000).optional(),
  /**
   * SHA-256 hash of the golden reference used for this check.
   * Required for F2 (screenshot) and F6 (source immutability).
   */
  goldenHash: z
    .string()
    .trim()
    .regex(/^[a-f0-9]{64}$/, "Must be a 64-character hex SHA-256 digest")
    .optional(),
  /**
   * Pixel diff percentage (0–100).
   * Populated for F2_VISUAL. Pass threshold is ≤5%.
   */
  pixelDiffPct: z.number().min(0).max(100).optional(),
  /** Viewport widths tested (for F3_RESPONSIVE). */
  viewportWidths: z.array(z.number().int().min(320).max(3840)).optional(),
});

export type FidelityEntry = z.infer<typeof fidelityEntrySchema>;

// ── Certification status ──────────────────────────────────────────────────────

export const certificationStatusLabelSchema = z.enum([
  "PASS",          // All fidelity checks pass; no blocking diagnostics
  "NEEDS_REVIEW",  // Custom components or approximated motion require human review
  "BLOCKED",       // Material unsupported behavior, license violations, or hostile content
  "PENDING",       // Checks not yet complete
]);

export type CertificationStatusLabel = z.infer<typeof certificationStatusLabelSchema>;

export const certificationStatusSchema = z.object({
  status: certificationStatusLabelSchema,

  /** Adapter version that produced this certification. */
  adapterVersion: z.string().trim().min(1).max(40),

  /** Contract version being certified against. */
  contractVersion: z.string().trim().min(1).max(20),

  /** ISO 8601 timestamp when certification was performed. */
  certifiedAt: z.string().trim().datetime({ offset: true }).optional(),

  /** Identity of the automated system or human who ran certification. */
  certifiedBy: z.string().trim().max(200).optional(),

  /** Per-dimension fidelity results (all 7 dimensions should be present). */
  fidelity: z.array(fidelityEntrySchema),

  /** Diagnostics snapshot at certification time. */
  diagnostics: diagnosticReportSchema,

  /**
   * True only when status === "PASS".
   * Explicitly computed and stored so downstream code can read it without
   * re-deriving from the full fidelity array.
   */
  galleryEligible: z.boolean(),

  /**
   * Human-readable list of blocking issues (populated when status !== "PASS").
   * Shown in review UI and admin dashboards.
   */
  blockers: z.array(z.string().trim().max(500)),
});

export type CertificationStatus = z.infer<typeof certificationStatusSchema>;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns true when all fidelity dimensions pass (or are intentionally skipped). */
export function allFidelityPass(fidelity: FidelityEntry[]): boolean {
  return fidelity.every((f) => f.result === "PASS" || f.result === "SKIP");
}

/** Returns the subset of fidelity entries that failed. */
export function failedFidelity(fidelity: FidelityEntry[]): FidelityEntry[] {
  return fidelity.filter((f) => f.result === "FAIL" || f.result === "PENDING");
}

/** Builds a minimal PENDING certification (used before checks have run). */
export function pendingCertification(adapterVersion: string): CertificationStatus {
  return {
    status: "PENDING",
    adapterVersion,
    contractVersion: "1",
    fidelity: [],
    diagnostics: emptyDiagnosticReport(),
    galleryEligible: false,
    blockers: ["Certification has not been run."],
  };
}
