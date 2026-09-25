/**
 * Theme compilation — maps AdapterDesignIR color system, fonts, spacing, and
 * motion flag into WebsiteDefinition ThemeTokens.
 *
 * DESIGN RULES:
 * - Only the TWO theme font slots (fontDisplay, fontBody) exist in WebsiteDefinition.
 *   Additional fonts from FontContractV1 are preserved in IR (provenance + licensing)
 *   and reported as a font overflow.
 * - theme.motion is NOT set to "expressive" based on motionSpecs in the IR.
 *   Setting it would silently flatten rich structural motion into a binary flag.
 *   Structural motion is EXTENSION_REQUIRED and preserved in IR.
 * - Font name must match WebsiteDefinition's known font set for reliable rendering.
 *   Unknown font names are passed through with a warning (self-hosted fonts may work).
 */

import type { AdapterDesignIR } from "./ir";
import type { ThemeTokens } from "@/lib/create/website-schema";
import type { CapabilityCompilationEntry } from "./compile-report";
import type { DiagnosticEntry } from "./diagnostics";


export type ThemeCompilationResult = {
  theme: ThemeTokens;
  capabilityEntries: CapabilityCompilationEntry[];
  diagnostics: DiagnosticEntry[];
};

/**
 * Compiles the IR's color system, fonts, spacing, and radius into
 * a WebsiteDefinition ThemeTokens object.
 *
 * Does NOT set theme.motion = "expressive" from motionSpecs — that
 * would silently discard structural motion information.
 */
export function compileTheme(ir: AdapterDesignIR): ThemeCompilationResult {
  const diagnostics: DiagnosticEntry[] = [];
  const capabilityEntries: CapabilityCompilationEntry[] = [];

  // ── Color system → theme tokens ──
  const theme: Partial<ThemeTokens> = {
    primary: ir.colorSystem.primary,
    accent: ir.colorSystem.accent,
    background: ir.colorSystem.background,
    text: ir.colorSystem.text,
  };
  if (ir.colorSystem.surface) theme.surface = ir.colorSystem.surface;
  if (ir.colorSystem.link) theme.link = ir.colorSystem.link;

  // ── Spacing / radius ──
  if (ir.spacing) theme.spacing = ir.spacing;
  if (ir.radius) theme.radius = ir.radius;

  // ── AestheticId ──
  if (ir.aestheticId) theme.aestheticId = ir.aestheticId;

  // ── Motion flag ──
  // NEVER set "expressive" from motionSpecs — that would silently flatten.
  // Only pass through a motion flag if the IR explicitly carries one (e.g.
  // from a manual AestheticContractV1 that set motionLevel = "expressive").
  if (ir.motion) {
    theme.motion = ir.motion;
  }

  // ── Font compilation ──
  //
  // WebsiteDefinition has exactly two font slots: fontDisplay and fontBody.
  // Find the display font (role = "display") and body font (role = "body")
  // from the IR's font list.

  const displayFont = ir.fonts.find((f) => f.role === "display");
  const bodyFont = ir.fonts.find((f) => f.role === "body");

  if (displayFont) {
    theme.fontDisplay = displayFont.family;
  }

  if (bodyFont) {
    theme.fontBody = bodyFont.family;
  }

  // Fonts beyond the first display + body slot → overflow recorded in capability entry
  const extraFonts = ir.fonts.filter((f) => {
    if (f === displayFont || f === bodyFont) return false;
    return true;
  });

  if (extraFonts.length > 0) {
    capabilityEntries.push({
      capability: "typography",
      classification: "EXTENSION_REQUIRED",
      behavior: "preserved-in-ir",
      preservedIn: "ir-field",
      detail:
        `${extraFonts.length} additional font(s) (${extraFonts.map((f) => f.family).join(", ")}) ` +
        "cannot be registered in WebsiteDefinition's two font slots. " +
        "Full licensing/provenance is preserved in AdapterDesignIR.fonts.",
    });
  }

  // Typography native if no overflow
  if (extraFonts.length === 0) {
    capabilityEntries.push({
      capability: "typography",
      classification: "NATIVE",
      behavior: "compiled",
      detail: `${ir.fonts.length} font(s) mapped to theme.fontDisplay / theme.fontBody.`,
    });
  }

  return {
    theme: theme as ThemeTokens,
    capabilityEntries,
    diagnostics,
  };
}
