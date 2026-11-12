/**
 * Validators for all Aesthetic Adapter contract types.
 *
 * DESIGN RULES:
 * - Validators enforce business rules that go beyond JSON schema validation.
 * - Every validator returns a typed result object — never throws on invalid input.
 * - Validators are composable and deterministic.
 * - Input is never trusted. All fields are validated before use.
 */

import { z } from "zod";
import {
  motionSpecSchema,
  motionContractV1Schema,
  type MotionSpec,
  type MotionContractV1,
} from "./motion";
import {
  fontContractV1Schema,
  isKebuBundledFont,
  type FontContractV1,
} from "./fonts";
import {
  assetSpecSchema,
  assetProvenanceSchema,
  type AssetSpec,
  type AssetProvenance,
} from "./assets";
import {
  customComponentSpecSchema,
  isMaterialAndBlocked,
  isComponentBlocked,
  type CustomComponentSpec,
} from "./components";
import {
  diagnosticReportSchema,
  buildDiagnosticReport,
  emptyDiagnosticReport,
  makeDiagnostic,
  type DiagnosticEntry,
  type DiagnosticReport,
} from "./diagnostics";
import {
  certificationStatusSchema,
  type CertificationStatus,
} from "./certification";
import { designProvenanceSchema, type DesignProvenance } from "./provenance";
import {
  adapterDesignIRSchema,
  aestheticContractV1Schema,
  isOwnerPortfolioType,
  type AdapterDesignIR,
  type AestheticContractV1,
  type IRSection,
} from "./ir";

// ── Result type ───────────────────────────────────────────────────────────────

export type ValidationResult<T> =
  | { ok: true; data: T; warnings: DiagnosticEntry[] }
  | { ok: false; errors: string[]; detail?: unknown };

// ── Zod parse helper ──────────────────────────────────────────────────────────

function parseWithZod<T>(
  schema: z.ZodType<T>,
  input: unknown,
): ValidationResult<T> {
  const result = schema.safeParse(input);
  if (result.success) {
    return { ok: true, data: result.data, warnings: [] };
  }
  const errors = result.error.issues.map(
    (issue) => `${issue.path.join(".")}: ${issue.message}`,
  );
  return { ok: false, errors, detail: result.error.issues };
}

// ── MotionSpec validator ──────────────────────────────────────────────────────

export function validateMotionSpec(input: unknown): ValidationResult<MotionSpec> {
  const base = parseWithZod(motionSpecSchema, input);
  if (!base.ok) return base;
  const spec = base.data;
  const warnings: DiagnosticEntry[] = [];
  const errors: string[] = [];

  // reducedMotionFallback is required (schema enforces presence, but check semantics)
  // Already enforced by Zod schema — discriminatedUnion requires type field

  // compilationPath must be consistent with nativePrimitive
  if (spec.compilationPath === "native" && !spec.nativePrimitive) {
    errors.push(
      "compilationPath is 'native' but nativePrimitive is not set. Specify which Kebu primitive.",
    );
  }

  // fidelityNote required for approximated/unsupported
  if (
    (spec.compilationPath === "approximated" || spec.compilationPath === "unsupported") &&
    !spec.fidelityNote
  ) {
    warnings.push(
      makeDiagnostic(
        "MOTION_APPROXIMATED",
        "warning",
        `MotionSpec "${spec.id}" has compilationPath "${spec.compilationPath}" but no fidelityNote. Add a note explaining what is lost.`,
        { motionSpecId: spec.id },
      ),
    );
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, data: spec, warnings };
}

export function validateMotionContractV1(
  input: unknown,
): ValidationResult<MotionContractV1> {
  const base = parseWithZod(motionContractV1Schema, input);
  if (!base.ok) return base;
  const contract = base.data;
  const allWarnings: DiagnosticEntry[] = [];
  const allErrors: string[] = [];

  for (const spec of contract.specs) {
    const result = validateMotionSpec(spec);
    if (!result.ok) {
      allErrors.push(...result.errors.map((e) => `spec[${spec.id}]: ${e}`));
    } else {
      allWarnings.push(...result.warnings);
    }
  }

  if (allErrors.length > 0) return { ok: false, errors: allErrors };
  return { ok: true, data: contract, warnings: allWarnings };
}

// ── FontContractV1 validator ──────────────────────────────────────────────────

export function validateFontContractV1(
  input: unknown,
): ValidationResult<FontContractV1> {
  const base = parseWithZod(fontContractV1Schema, input);
  if (!base.ok) return base;
  const font = base.data;
  const warnings: DiagnosticEntry[] = [];
  const errors: string[] = [];

  // License checks
  if (!font.license.commercialUse) {
    errors.push(
      `Font "${font.family}": license.commercialUse is false. Only commercially usable fonts are permitted in published Aesthetics.`,
    );
  }
  if (!font.license.webEmbedAllowed) {
    errors.push(
      `Font "${font.family}": license.webEmbedAllowed is false. Font cannot be embedded in web pages.`,
    );
  }

  // Source-specific requirements
  if (font.source === "google-fonts" && !font.googleFontsSpec) {
    warnings.push(
      makeDiagnostic(
        "FONT_GOOGLE_SPEC_MISSING",
        "warning",
        `Font "${font.family}" has source "google-fonts" but googleFontsSpec is missing. Add the Google Fonts API spec string.`,
        { fontFamily: font.family },
      ),
    );
  }
  if (font.source === "cdn-variable" && !font.cdnUrl) {
    errors.push(
      `Font "${font.family}" has source "cdn-variable" but cdnUrl is missing.`,
    );
  }
  if (
    (font.source === "self-hosted" || font.source === "kebu-bundled") &&
    !font.selfHostedPath &&
    !isKebuBundledFont(font.family)
  ) {
    errors.push(
      `Font "${font.family}" has source "${font.source}" but selfHostedPath is missing.`,
    );
  }

  // Self-hosted fonts must have provenance
  if (font.source === "self-hosted" && !font.provenance?.sha256) {
    warnings.push(
      makeDiagnostic(
        "FONT_SELF_HOSTED_NO_PROVENANCE",
        "warning",
        `Self-hosted font "${font.family}" has no provenance sha256. Add a hash for audit traceability.`,
        { fontFamily: font.family },
      ),
    );
  }

  // isVariable must have variableAxes
  if (font.isVariable && (!font.variableAxes || font.variableAxes.length === 0)) {
    warnings.push(
      makeDiagnostic(
        "FONT_SELF_HOSTED_NO_PROVENANCE",
        "warning",
        `Variable font "${font.family}" has isVariable=true but variableAxes is empty. List the supported axes.`,
        { fontFamily: font.family },
      ),
    );
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, data: font, warnings };
}

// ── AssetSpec validator ───────────────────────────────────────────────────────

export function validateAssetSpec(input: unknown): ValidationResult<AssetSpec> {
  const base = parseWithZod(assetSpecSchema, input);
  if (!base.ok) return base;
  const asset = base.data;
  const warnings: DiagnosticEntry[] = [];
  const errors: string[] = [];

  // Images should have altText
  if ((asset.type === "image" || asset.type === "svg") && !asset.altText) {
    warnings.push(
      makeDiagnostic(
        "ASSET_MISSING_PROVENANCE",
        "warning",
        `Asset "${asset.id}" (${asset.type}) has no altText. Add accessible description.`,
        { assetId: asset.id },
      ),
    );
  }

  // Commercial use must be cleared (null = unknown → warning)
  if (asset.provenance.license?.commercialUse === false) {
    errors.push(
      `Asset "${asset.id}": license blocks commercial use.`,
    );
  }
  if (asset.provenance.license?.commercialUse === null || !asset.provenance.license) {
    warnings.push(
      makeDiagnostic(
        "ASSET_LICENSE_UNKNOWN",
        "warning",
        `Asset "${asset.id}" has unknown or undocumented license. Verify before publishing.`,
        { assetId: asset.id },
      ),
    );
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, data: asset, warnings };
}

// ── CustomComponentSpec validator ─────────────────────────────────────────────

export function validateCustomComponentSpec(
  input: unknown,
): ValidationResult<CustomComponentSpec> {
  const base = parseWithZod(customComponentSpecSchema, input);
  if (!base.ok) return base;
  const comp = base.data;
  const warnings: DiagnosticEntry[] = [];
  const errors: string[] = [];

  // Material component without a static fallback
  if (comp.isMaterial && !comp.staticHtmlFallback) {
    errors.push(
      `Custom component "${comp.id}" is isMaterial=true but has no staticHtmlFallback. ` +
        "A static fallback is required so the section can be rendered if the component is blocked.",
    );
  }

  // Blocked or pending components — both material and non-material produce warnings here.
  // The IR CAN represent blocked components for tracking/review purposes.
  // Only PASS certification is blocked (caught by validateAdapterDesignIR invariant).
  if (isComponentBlocked(comp)) {
    const severity = comp.isMaterial ? "warning" : "warning";
    const code = comp.isMaterial
      ? ("CUSTOM_COMPONENT_BLOCKED" as const)
      : ("CUSTOM_COMPONENT_PENDING_REVIEW" as const);
    const msg = comp.isMaterial
      ? `Custom component "${comp.id}" is material and blocked/pending-review. It will fail F4 certification if status is PASS.`
      : `Custom component "${comp.id}" is blocked or pending review (non-material). It will not be deployed until reviewed.`;
    warnings.push(makeDiagnostic(code, severity, msg, { componentId: comp.id }));
  }

  // fidelityNote required when blocked
  if (
    (comp.compilationPath === "blocked" || comp.compilationPath === "free-text-fallback") &&
    !comp.fidelityNote
  ) {
    warnings.push(
      makeDiagnostic(
        "CUSTOM_COMPONENT_PENDING_REVIEW",
        "warning",
        `Custom component "${comp.id}" has compilationPath "${comp.compilationPath}" but no fidelityNote.`,
        { componentId: comp.id },
      ),
    );
  }

  // Security: requiresHumanApproval without approvedBy is always a warning
  if (comp.securityBoundary.requiresHumanApproval && !comp.securityBoundary.approvedBy) {
    warnings.push(
      makeDiagnostic(
        "CUSTOM_COMPONENT_BLOCKED",
        "warning",
        `Custom component "${comp.id}" requires human approval but approvedBy is not set.`,
        { componentId: comp.id },
      ),
    );
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, data: comp, warnings };
}

// ── IRSection validator ───────────────────────────────────────────────────────

export function validateIRSection(section: IRSection): {
  errors: string[];
  warnings: DiagnosticEntry[];
} {
  const errors: string[] = [];
  const warnings: DiagnosticEntry[] = [];

  // Owner-portfolio section type leak
  if (isOwnerPortfolioType(section.sectionType)) {
    errors.push(
      `Section "${section.id}" has owner-portfolio section type "${section.sectionType}". ` +
        "Owner-portfolio section types are forbidden in Adapter output.",
    );
  }

  // Validate motion specs
  for (const spec of section.motionSpecs ?? []) {
    const result = validateMotionSpec(spec);
    if (!result.ok) {
      errors.push(
        ...result.errors.map((e) => `Section "${section.id}" motionSpec "${spec.id}": ${e}`),
      );
    } else {
      warnings.push(...result.warnings);
    }
  }

  // Validate custom component
  if (section.customComponent) {
    const result = validateCustomComponentSpec(section.customComponent);
    if (!result.ok) {
      errors.push(...result.errors.map((e) => `Section "${section.id}" customComponent: ${e}`));
    } else {
      warnings.push(...result.warnings);
    }
  }

  // Validate capability overflow — UNSUPPORTED without a preservation record
  for (const overflow of section.capabilityOverflows ?? []) {
    if (overflow.classification === "UNSUPPORTED" && overflow.preservedIn === "lost") {
      if (!overflow.lostReason) {
        warnings.push(
          makeDiagnostic(
            "CAPABILITY_OVERFLOW_UNSUPPORTED",
            "warning",
            `Section "${section.id}": capability "${overflow.capability}" is UNSUPPORTED and marked "lost" without a reason.`,
            { sectionId: section.id },
          ),
        );
      }
    }
  }

  return { errors, warnings };
}

// ── AdapterDesignIR validator ─────────────────────────────────────────────────

export function validateAdapterDesignIR(
  input: unknown,
): ValidationResult<AdapterDesignIR> {
  const base = parseWithZod(adapterDesignIRSchema, input);
  if (!base.ok) return base;
  const ir = base.data;
  const allWarnings: DiagnosticEntry[] = [];
  const allErrors: string[] = [];

  // Validate fonts
  for (const font of ir.fonts) {
    const result = validateFontContractV1(font);
    if (!result.ok) allErrors.push(...result.errors);
    else allWarnings.push(...result.warnings);
  }

  // Validate assets
  for (const asset of ir.assets ?? []) {
    const result = validateAssetSpec(asset);
    if (!result.ok) allErrors.push(...result.errors);
    else allWarnings.push(...result.warnings);
  }

  // Validate custom components
  for (const comp of ir.customComponents ?? []) {
    const result = validateCustomComponentSpec(comp);
    if (!result.ok) allErrors.push(...result.errors);
    else allWarnings.push(...result.warnings);
  }

  // Validate all sections in all pages
  for (const page of ir.pages) {
    for (const section of page.sections) {
      const { errors, warnings } = validateIRSection(section);
      allErrors.push(...errors);
      allWarnings.push(...warnings);
    }
  }

  // Invariant: A material unsupported component CANNOT have PASS certification
  const hasBlockedMaterialComponent = ir.customComponents?.some(isMaterialAndBlocked) ?? false;
  if (hasBlockedMaterialComponent && ir.certificationStatus.status === "PASS") {
    allErrors.push(
      "IR has a material custom component that is blocked or pending review, " +
        "but certificationStatus.status is PASS. " +
        "A material unsupported component cannot receive PASS certification.",
    );
  }

  // Invariant: PASS requires no diagnostic blockers
  if (
    ir.certificationStatus.status === "PASS" &&
    ir.diagnostics.hasBlockers
  ) {
    allErrors.push(
      "certificationStatus is PASS but diagnostics.hasBlockers is true. " +
        "Resolve all errors and blocked entries before certifying.",
    );
  }

  if (allErrors.length > 0) return { ok: false, errors: allErrors };
  return { ok: true, data: ir, warnings: allWarnings };
}

// ── AestheticContractV1 validator ─────────────────────────────────────────────

export function validateAestheticContractV1(
  input: unknown,
): ValidationResult<AestheticContractV1> {
  const base = parseWithZod(aestheticContractV1Schema, input);
  if (!base.ok) return base;
  const contract = base.data;
  const allWarnings: DiagnosticEntry[] = [];
  const allErrors: string[] = [];

  // Validate fonts
  for (const font of contract.fonts) {
    const result = validateFontContractV1(font);
    if (!result.ok) allErrors.push(...result.errors);
    else allWarnings.push(...result.warnings);
  }

  // Validate assets
  for (const asset of contract.assets ?? []) {
    const result = validateAssetSpec(asset);
    if (!result.ok) allErrors.push(...result.errors);
    else allWarnings.push(...result.warnings);
  }

  // Validate custom components
  for (const comp of contract.customComponents ?? []) {
    const result = validateCustomComponentSpec(comp);
    if (!result.ok) allErrors.push(...result.errors);
    else allWarnings.push(...result.warnings);
  }

  // Validate sections
  for (const page of contract.pages) {
    for (const section of page.sections) {
      // Check for owner-portfolio types
      if (isOwnerPortfolioType(section.sectionType)) {
        allErrors.push(
          `Page "${page.slug}" section type "${section.sectionType}" is an owner-portfolio ` +
            "type and cannot appear in Adapter-generated Aesthetics.",
        );
      }
      // Validate motion specs
      for (const spec of section.motionSpecs ?? []) {
        const result = validateMotionSpec(spec);
        if (!result.ok)
          allErrors.push(
            ...result.errors.map(
              (e) => `Page "${page.slug}" section[${section.sectionType}] motion: ${e}`,
            ),
          );
        else allWarnings.push(...result.warnings);
      }
      // Validate custom component
      if (section.customComponent) {
        const result = validateCustomComponentSpec(section.customComponent);
        if (!result.ok)
          allErrors.push(
            ...result.errors.map((e) => `Page "${page.slug}" customComponent: ${e}`),
          );
        else allWarnings.push(...result.warnings);
      }
    }
  }

  // Certified contract cannot have material blocked components
  if (contract.certificationStatus?.status === "PASS") {
    const hasBlockedMaterial =
      contract.customComponents?.some(isMaterialAndBlocked) ?? false;
    if (hasBlockedMaterial) {
      allErrors.push(
        "Contract certificationStatus is PASS but a material custom component is blocked. " +
          "PASS certification requires all material components to be approved.",
      );
    }
  }

  if (allErrors.length > 0) return { ok: false, errors: allErrors };
  return { ok: true, data: contract, warnings: allWarnings };
}

// ── Hostile input detection ───────────────────────────────────────────────────
//
// Detect patterns that suggest prompt injection, script injection, or attempts
// to subvert the adapter pipeline through data payloads.

const HOSTILE_PATTERNS = [
  /<script[\s>]/i,
  /javascript:/i,
  /on\w+\s*=/i,           // inline event handlers
  /document\.write/i,
  /eval\s*\(/i,
  /\bimport\s*\(/,        // dynamic import()
  /\bprocess\.env\b/,     // environment leakage attempt
  /\bSUPABASE_SERVICE/,   // credential fishing
  /\bSUPABASE_ANON/,
  /\bANTHROPIC_API/,
];

export function detectHostileContent(input: string): {
  hostile: boolean;
  patterns: string[];
} {
  const matched: string[] = [];
  for (const pattern of HOSTILE_PATTERNS) {
    if (pattern.test(input)) {
      matched.push(pattern.source);
    }
  }
  return { hostile: matched.length > 0, patterns: matched };
}

/**
 * Safe JSON parse — returns null on any parse error, never throws.
 * Detects hostile patterns before parsing.
 */
export function safeParseJson(raw: string): {
  ok: true;
  data: unknown;
} | {
  ok: false;
  reason: "malformed" | "hostile";
  patterns?: string[];
} {
  // Size guard: 10MB max
  if (raw.length > 10 * 1024 * 1024) {
    return { ok: false, reason: "malformed" };
  }

  const { hostile, patterns } = detectHostileContent(raw);
  if (hostile) {
    return { ok: false, reason: "hostile", patterns };
  }

  try {
    return { ok: true, data: JSON.parse(raw) };
  } catch {
    return { ok: false, reason: "malformed" };
  }
}
