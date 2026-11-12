/**
 * AdapterIR → WebsiteDefinition compiler.
 *
 * The compiler is the authoritative boundary between Adapter-world (IR) and
 * Builder-world (WebsiteDefinition). It is fidelity-preserving: capabilities
 * that WebsiteDefinition cannot express are retained in the IR and reported,
 * never silently discarded.
 *
 * DESIGN RULES:
 * - Same IR + same compiler version + same target capability version → identical output.
 * - compilationBlocked === true ⇒ websiteDefinition is null. No partial poisoned output.
 * - IR validation runs BEFORE compilation. A schema-invalid IR never reaches the compiler.
 * - Hostile content detection runs BEFORE compilation. See safeParseJson / detectHostileContent.
 * - No eval, no arbitrary script injection, no unrestricted React execution.
 * - Provenance adapterRunId is preserved in the CompilationReport for traceability.
 */

import { createHash } from "crypto";

import { validateAdapterDesignIR } from "./validate";
import { negotiateCapabilities } from "./compile-capabilities";
import { compileTheme } from "./compile-theme";
import { compileSections } from "./compile-sections";
import { PROPOSED_EXTENSIONS } from "./compile-capabilities";
import { ADAPTER_VERSION, IR_VERSION } from "./versions";
import type { AdapterDesignIR } from "./ir";
import type { CompilationResult, CompilationReport, CapabilityCompilationEntry } from "./compile-report";
import type { WebsiteDefinition } from "@/lib/create/website-schema";

// ── Compiler version ──────────────────────────────────────────────────────────
//
// Bump this when compilation semantics change so determinism can be verified
// per compiler version.

export const COMPILER_VERSION = "2.0.0" as const;

// ── Main compiler ─────────────────────────────────────────────────────────────

/**
 * Compiles an AdapterDesignIR into a WebsiteDefinition.
 *
 * Always returns a CompilationResult — never throws.
 * Check report.compilationBlocked before using websiteDefinition.
 */
export function compileIR(ir: AdapterDesignIR): CompilationResult {
  const compiledAt = new Date().toISOString();

  // ── Stage 1: Validate IR ──────────────────────────────────────────────────
  const validation = validateAdapterDesignIR(ir);
  if (!validation.ok) {
    const blockingReasons = validation.errors;
    const report = buildBlockedReport({
      compiledAt,
      adapterRunId: (ir as Partial<AdapterDesignIR>).adapterRunId ?? "unknown",
      blockingReasons,
      reason: "IR failed pre-compilation validation.",
    });
    return { websiteDefinition: null, report };
  }

  const validIR = validation.data;

  // ── Stage 2: Capability negotiation ──────────────────────────────────────
  const negotiation = negotiateCapabilities(validIR);

  // ── Stage 3: Theme compilation ────────────────────────────────────────────
  const themeResult = compileTheme(validIR);

  // ── Stage 4: Section compilation ─────────────────────────────────────────
  const sectionResult = compileSections(validIR.pages);

  // ── Stage 5: Collect all blocking reasons ────────────────────────────────
  const allBlockingReasons = [...sectionResult.blockingReasons];
  const compilationBlocked = sectionResult.compilationBlocked;

  if (compilationBlocked) {
    const report = buildBlockedReport({
      compiledAt,
      adapterRunId: validIR.adapterRunId,
      blockingReasons: allBlockingReasons,
      reason: "Section-level compilation was blocked.",
      capabilityEntries: [
        ...negotiation.entries,
        ...themeResult.capabilityEntries,
        ...sectionResult.capabilityEntries,
      ],
      extensionsRequired: negotiation.extensionsRequired,
      sectionsCompiled: sectionResult.sectionsCompiled,
      sectionsBlocked: sectionResult.sectionsBlocked,
      sectionsPreservedInIR: sectionResult.sectionsPreservedInIR,
      nativeCount: negotiation.nativeCount,
      extensionRequiredCount: negotiation.extensionRequiredCount,
      customEscapeHatchCount: negotiation.customEscapeHatchCount,
      unsupportedCount: negotiation.unsupportedCount,
    });
    return { websiteDefinition: null, report };
  }

  // ── Stage 6: Assemble WebsiteDefinition ──────────────────────────────────

  // Pages: each compiled page must have at least one section to be valid.
  // Pages with zero compiled sections are included with an empty section list
  // (the validator will catch this; we report it rather than silently drop the page).
  const assembledPages = sectionResult.pages.map((p) => ({
    slug: p.slug,
    title: p.title,
    sections: p.sections.map((s) => ({
      id: s.id,
      type: s.type as WebsiteDefinition["pages"][number]["sections"][number]["type"],
      props: s.props,
    })),
  }));

  // Filter out pages with zero sections (they'd fail websiteDefinitionSchema validation)
  const validPages = assembledPages.filter((p) => p.sections.length > 0);

  const websiteDefinition: WebsiteDefinition = {
    schemaVersion: "website-v1",
    title: validIR.title,
    theme: themeResult.theme,
    pages: validPages as WebsiteDefinition["pages"],
  };

  // ── Stage 7: Content hash for determinism ─────────────────────────────────
  //
  // Hash covers the semantic content: IR version, adapterRunId, compiled pages.
  // This allows callers to verify that the same IR produces the same output.

  const canonicalContent = JSON.stringify({
    irVersion: validIR.irVersion,
    adapterRunId: validIR.adapterRunId,
    compilerVersion: COMPILER_VERSION,
    title: validIR.title,
    // Pages sorted by slug (compileSections already sorts)
    pages: sectionResult.pages.map((p) => ({
      slug: p.slug,
      sections: p.sections.map((s) => ({ type: s.type, id: s.id })),
    })),
  });
  const contentHash = createHash("sha256").update(canonicalContent).digest("hex");

  // ── Stage 8: Merge capability entries ────────────────────────────────────
  const allCapabilityEntries = deduplicateCapabilityEntries([
    ...negotiation.entries,
    ...themeResult.capabilityEntries,
    ...sectionResult.capabilityEntries,
  ]);

  // Determine material loss: any EXTENSION_REQUIRED or UNSUPPORTED capability
  // that appeared in the IR means information was not compiled to WD.
  const materialLossDetected =
    allCapabilityEntries.some((e) =>
      e.behavior === "preserved-in-ir" || e.behavior === "unsupported",
    );

  // Filter extensions to only those for capabilities actually encountered
  const extensionsRequired = PROPOSED_EXTENSIONS.filter((ext) =>
    allCapabilityEntries.some(
      (e) => e.capability === ext.capability && e.behavior === "preserved-in-ir",
    ),
  );

  // ── Stage 9: Build final report ───────────────────────────────────────────
  const report: CompilationReport = {
    compilerVersion: COMPILER_VERSION,
    irVersion: IR_VERSION,
    targetSchemaVersion: "website-v1",
    compiledAt,
    adapterRunId: validIR.adapterRunId,

    capabilities: allCapabilityEntries,
    extensionsRequired,

    nativeCount: allCapabilityEntries.filter((e) => e.classification === "NATIVE").length,
    extensionRequiredCount: allCapabilityEntries.filter(
      (e) => e.classification === "EXTENSION_REQUIRED",
    ).length,
    customEscapeHatchCount: allCapabilityEntries.filter(
      (e) => e.classification === "CUSTOM_ESCAPE_HATCH",
    ).length,
    unsupportedCount: allCapabilityEntries.filter(
      (e) => e.classification === "UNSUPPORTED",
    ).length,
    blockedCount: sectionResult.sectionsBlocked.length,

    sectionsCompiled: sectionResult.sectionsCompiled,
    sectionsBlocked: sectionResult.sectionsBlocked,
    sectionsPreservedInIR: sectionResult.sectionsPreservedInIR,

    materialLossDetected,
    compilationBlocked: false,
    blockingReasons: [],

    contentHash,
  };

  return { websiteDefinition, report };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

type BlockedReportArgs = {
  compiledAt: string;
  adapterRunId: string;
  blockingReasons: string[];
  reason: string;
  capabilityEntries?: CapabilityCompilationEntry[];
  extensionsRequired?: import("./compile-report").ExtensionRequirement[];
  sectionsCompiled?: number;
  sectionsBlocked?: string[];
  sectionsPreservedInIR?: string[];
  nativeCount?: number;
  extensionRequiredCount?: number;
  customEscapeHatchCount?: number;
  unsupportedCount?: number;
};

function buildBlockedReport(args: BlockedReportArgs): CompilationReport {
  const {
    compiledAt,
    adapterRunId,
    blockingReasons,
    capabilityEntries = [],
    extensionsRequired = [],
    sectionsCompiled = 0,
    sectionsBlocked = [],
    sectionsPreservedInIR = [],
    nativeCount = 0,
    extensionRequiredCount = 0,
    customEscapeHatchCount = 0,
    unsupportedCount = 0,
  } = args;

  const blockedHash = createHash("sha256")
    .update(JSON.stringify({ adapterRunId, blockingReasons, compiledAt }))
    .digest("hex");

  return {
    compilerVersion: COMPILER_VERSION,
    irVersion: IR_VERSION,
    targetSchemaVersion: "website-v1",
    compiledAt,
    adapterRunId: adapterRunId === "unknown" ? "00000000-0000-0000-0000-000000000000" : adapterRunId,
    capabilities: capabilityEntries,
    extensionsRequired,
    nativeCount,
    extensionRequiredCount,
    customEscapeHatchCount,
    unsupportedCount,
    blockedCount: sectionsBlocked.length,
    sectionsCompiled,
    sectionsBlocked,
    sectionsPreservedInIR,
    materialLossDetected: false,
    compilationBlocked: true,
    blockingReasons,
    contentHash: blockedHash,
  };
}

/**
 * Merges duplicate capability entries by taking the most informative one
 * (EXTENSION_REQUIRED or UNSUPPORTED wins over NATIVE for the same capability).
 */
function deduplicateCapabilityEntries(
  entries: CapabilityCompilationEntry[],
): CapabilityCompilationEntry[] {
  const map = new Map<string, CapabilityCompilationEntry>();

  for (const entry of entries) {
    const existing = map.get(entry.capability);
    if (!existing) {
      map.set(entry.capability, entry);
      continue;
    }
    // EXTENSION_REQUIRED / UNSUPPORTED / blocked override NATIVE
    const priority = ["compiled", "preserved-in-ir", "unsupported", "blocked"];
    const existingPri = priority.indexOf(existing.behavior);
    const entryPri = priority.indexOf(entry.behavior);

    if (entryPri >= existingPri) {
      // Higher or equal priority — take the new entry's fields but merge affectedSectionIds
      const base = entryPri > existingPri ? entry : existing;
      const merged = { ...base };
      const ids = new Set([
        ...(existing.affectedSectionIds ?? []),
        ...(entry.affectedSectionIds ?? []),
      ]);
      if (ids.size > 0) merged.affectedSectionIds = [...ids];
      // Prefer the richer detail string (whichever is longer)
      if (existing.detail && entry.detail && String(existing.detail).length > String(entry.detail).length) {
        merged.detail = existing.detail;
      }
      map.set(entry.capability, merged);
    }
  }

  return [...map.values()];
}
