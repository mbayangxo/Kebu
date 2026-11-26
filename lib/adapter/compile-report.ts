/**
 * Compilation report — produced alongside every WebsiteDefinition output.
 *
 * The report is the authoritative record of:
 *   - what compiled natively
 *   - what was preserved in IR only (not compiled to WD)
 *   - what was blocked
 *   - what extensions are required for faithful compilation
 *
 * DESIGN RULES:
 * - No capability may silently disappear. Every overflow is recorded here.
 * - compilationBlocked === true means websiteDefinition is null — safe rejection.
 * - contentHash enables determinism verification.
 */

import { z } from "zod";
import { capabilityNameSchema, capabilityClassificationSchema } from "./ir";
import { IR_VERSION } from "./versions";

// ── Compilation behavior ──────────────────────────────────────────────────────

export const compilationBehaviorSchema = z.enum([
  "compiled",         // Fully expressed in WebsiteDefinition output
  "preserved-in-ir",  // Too rich for WD — retained in IR, absent from output
  "blocked",          // Compilation rejected (hostile content, policy, unapproved)
  "unsupported",      // Cannot be represented anywhere in current or planned schema
]);

export type CompilationBehavior = z.infer<typeof compilationBehaviorSchema>;

// ── Capability compilation entry ──────────────────────────────────────────────

export const capabilityCompilationEntrySchema = z.object({
  capability: capabilityNameSchema,
  classification: capabilityClassificationSchema,
  behavior: compilationBehaviorSchema,
  detail: z.string().trim().max(500).optional(),
  preservedIn: z.enum(["ir-field", "custom-component", "diagnostics"]).optional(),
  /** Section IDs where this capability appears (empty = IR-level or global). */
  affectedSectionIds: z.array(z.string()).optional(),
});

export type CapabilityCompilationEntry = z.infer<typeof capabilityCompilationEntrySchema>;

// ── Proposed Builder extensions ────────────────────────────────────────────────

export const extensionRequirementSchema = z.object({
  /**
   * Short identifier (e.g. "EXT-WD-001") for cross-referencing.
   * WD = WebsiteDefinition target.
   */
  id: z.string().trim().min(1).max(20),
  capability: capabilityNameSchema,
  description: z.string().trim().max(500),
  /**
   * The minimal schema change that would enable faithful compilation.
   * Must be concrete enough to review — exact field names and types.
   */
  proposedExtension: z.string().trim().max(2000),
  affectedSchemas: z.array(z.string().trim().max(80)),
  backwardCompatible: z.boolean(),
  priority: z.enum(["high", "medium", "low"]),
});

export type ExtensionRequirement = z.infer<typeof extensionRequirementSchema>;

// ── Compilation report ────────────────────────────────────────────────────────

export const compilationReportSchema = z.object({
  compilerVersion: z.string().trim().min(1).max(40),
  irVersion: z.literal(IR_VERSION),
  targetSchemaVersion: z.literal("website-v1"),
  compiledAt: z.string().trim().datetime({ offset: true }),
  adapterRunId: z.string().trim().uuid(),

  /** Per-capability compilation decisions. */
  capabilities: z.array(capabilityCompilationEntrySchema),
  /** Extensions needed for fully faithful compilation. */
  extensionsRequired: z.array(extensionRequirementSchema),

  // ── Counts ──
  nativeCount: z.number().int().min(0),
  extensionRequiredCount: z.number().int().min(0),
  customEscapeHatchCount: z.number().int().min(0),
  unsupportedCount: z.number().int().min(0),
  blockedCount: z.number().int().min(0),

  // ── Section-level outcomes ──
  sectionsCompiled: z.number().int().min(0),
  /** IDs of sections that could not be compiled (blocked). */
  sectionsBlocked: z.array(z.string()),
  /** IDs of sections with richer data preserved in IR only. */
  sectionsPreservedInIR: z.array(z.string()),

  materialLossDetected: z.boolean(),
  compilationBlocked: z.boolean(),
  blockingReasons: z.array(z.string()),

  /** SHA-256 of the canonical JSON representation of (irVersion + adapterRunId + pages). */
  contentHash: z.string().trim().regex(/^[a-f0-9]{64}$/),
});

export type CompilationReport = z.infer<typeof compilationReportSchema>;

// ── Compilation result ────────────────────────────────────────────────────────

/**
 * The full output of compileIR().
 *
 * websiteDefinition is null when compilationBlocked === true.
 * The report is always present and always explains the outcome.
 */
export type CompilationResult = {
  websiteDefinition: import("@/lib/create/website-schema").WebsiteDefinition | null;
  report: CompilationReport;
};
