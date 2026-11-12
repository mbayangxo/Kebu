/**
 * Editorial hero (`editorial-hero`) — legacy template fields.
 *
 * 37 editorial-hero sections in the design-world templates (lib/create/design-worlds) were
 * authored with field names the `editorial-hero` schema and renderer do not know, so creating a
 * site from those templates dropped them (no buttons, no eyebrow, default overlay and alignment).
 * They are mapped onto the canonical model at the schema boundary and in the renderer, the same
 * principle as the standard Hero (lib/create/hero-section.ts normalizeLegacyHeroProps):
 *
 *   backgroundImageUrl: string        → imageUrl
 *   overlay: number (0–0.75 in repo)  → overlayOpacity
 *   textAlign: "left" | "center"      → align
 *   primaryCta: { label, href }       → buttonLabel / buttonHref
 *   secondaryCta: { label, href }     → secondaryButtonLabel / secondaryButtonHref
 *   eyebrow: string                   (canonical name; now declared by the schema)
 *
 * A canonical value always wins (a Builder edit is never overwritten by a template's legacy
 * value). The input is not mutated, so template definitions are never rewritten. A legacy
 * `minHeight` (6 templates, none of them with the legacy shape above) is not mapped: those
 * templates keep rendering exactly as before.
 */
import { applyLegacyCta } from "./hero-section";

const ALIGNS = new Set(["left", "center", "right"]);

export function normalizeLegacyEditorialHeroProps(input: unknown): unknown {
  if (!input || typeof input !== "object" || Array.isArray(input)) return input;
  const props = input as Record<string, unknown>;
  const out: Record<string, unknown> = { ...props };
  if (out.imageUrl === undefined && typeof props.backgroundImageUrl === "string") out.imageUrl = props.backgroundImageUrl;
  if (out.overlayOpacity === undefined && typeof props.overlay === "number") out.overlayOpacity = props.overlay;
  if (out.align === undefined && typeof props.textAlign === "string" && ALIGNS.has(props.textAlign)) out.align = props.textAlign;
  applyLegacyCta(out, props.primaryCta, "buttonLabel", "buttonHref");
  applyLegacyCta(out, props.secondaryCta, "secondaryButtonLabel", "secondaryButtonHref");
  return out;
}
