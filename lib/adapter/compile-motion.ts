/**
 * IR → WD motion normalization.
 *
 * Single canonical boundary: MotionSpec[] (Adapter IR) → SectionMotion (WD runtime).
 *
 * SAFE NATIVE SUBSET (compiled):
 *   triggers   : scroll-enter, load
 *   effects    : fade, slide, scale, rotate, blur, reveal-clip
 *   transforms : opacity, translateX/Y (px → string), scale, rotate
 *   reducedMotionFallback : "instant" | "none"  (fade-only → instant + diagnostic)
 *   sequence/stagger       : staggerMs forwarded
 *   deviceBehavior         : tablet/mobile durationMs/delayMs forwarded
 *
 * PRESERVED AS UNSUPPORTED (never silently discarded):
 *   triggers   : hover, click, touch, scroll-leave, scroll-progress, none
 *   effects    : ken-burns, parallax, marquee, magnetic, path-draw, custom
 *   fields     : looping, scrollRelationship, hoverBehavior, clipPath, blur transform
 *   reducedMotionFallback.type === "inherit" (only valid nested; IR root spec = diagnostic)
 *
 * APPROXIMATED (compiled with loss-of-fidelity diagnostic):
 *   reducedMotionFallback.type === "fade-only"  → mapped to "instant"
 */

import type { MotionSpec, TransformState } from "./motion";
import type { SectionMotion, SectionMotionEntry, MotionTransform, MotionEasing } from "@/lib/create/website-extensions";
import type { DiagnosticEntry } from "./diagnostics";
import { makeDiagnostic } from "./diagnostics";

// ── Trigger mapping ───────────────────────────────────────────────────────────

const NATIVE_TRIGGERS = new Set(["scroll-enter", "load"]);

// ── Effect → safe check ───────────────────────────────────────────────────────

const NATIVE_EFFECTS = new Set(["fade", "slide", "scale", "rotate", "blur", "reveal-clip"]);

// ── Easing normalization ──────────────────────────────────────────────────────

const EASING_MAP: Record<string, MotionEasing> = {
  linear: "linear",
  ease: "ease",
  "ease-in": "ease-in",
  "ease-out": "ease-out",
  "ease-in-out": "ease-in-out",
  spring: "spring",
};

function normalizeEasing(raw?: string): MotionEasing {
  if (!raw) return "ease-out";
  return EASING_MAP[raw] ?? "ease-out";
}

// ── Transform normalization ───────────────────────────────────────────────────
//
// IR TransformState uses plain numbers (px for x/y).
// WD MotionTransform uses strings for translate ("24px"), numbers for opacity/scale/rotate.

function pxStr(n?: number): string | undefined {
  if (n === undefined || n === null) return undefined;
  return `${n}px`;
}

function buildTransform(initial?: TransformState, final?: TransformState): MotionTransform {
  const t: MotionTransform = {};

  if (initial?.opacity !== undefined) t.opacityFrom = initial.opacity;
  if (final?.opacity !== undefined) t.opacityTo = final.opacity;

  const txFrom = pxStr(initial?.x);
  const txTo = pxStr(final?.x);
  if (txFrom !== undefined) t.translateXFrom = txFrom;
  if (txTo !== undefined) t.translateXTo = txTo;

  const tyFrom = pxStr(initial?.y);
  const tyTo = pxStr(final?.y);
  if (tyFrom !== undefined) t.translateYFrom = tyFrom;
  if (tyTo !== undefined) t.translateYTo = tyTo;

  if (initial?.scale !== undefined) t.scaleFrom = initial.scale;
  if (final?.scale !== undefined) t.scaleTo = final.scale;

  if (initial?.rotate !== undefined) t.rotateFrom = initial.rotate;
  if (final?.rotate !== undefined) t.rotateTo = final.rotate;

  // blur and clipPath: no WD equivalent — silently dropped here;
  // callers must emit diagnostics when these are present on the source spec.

  return t;
}

// ── Has unsupported rich fields ───────────────────────────────────────────────

function hasUnsupportedFields(spec: MotionSpec): string[] {
  const reasons: string[] = [];
  if (spec.looping && spec.looping.type !== "none") reasons.push("looping");
  if (spec.scrollRelationship) reasons.push("scrollRelationship");
  if (spec.hoverBehavior) reasons.push("hoverBehavior");
  if (spec.initialState?.blur !== undefined || spec.finalState?.blur !== undefined) reasons.push("blur transform");
  if (spec.initialState?.clipPath || spec.finalState?.clipPath) reasons.push("clipPath");
  return reasons;
}

// ── ReducedMotionFallback mapping ─────────────────────────────────────────────

function mapReducedMotionFallback(
  spec: MotionSpec,
  sectionId: string,
  diagnostics: DiagnosticEntry[],
): "instant" | "none" {
  const rmf = spec.reducedMotionFallback;
  switch (rmf.type) {
    case "instant": return "instant";
    case "none":    return "none";
    case "fade-only":
      diagnostics.push(makeDiagnostic(
        "MOTION_APPROXIMATED",
        "warning",
        `MotionSpec "${spec.id}" in section "${sectionId}": reducedMotionFallback "fade-only" ` +
          `is approximated as "instant" — WD does not support a separate fade-only fallback.`,
        { sectionId },
      ));
      return "instant";
    case "inherit":
      diagnostics.push(makeDiagnostic(
        "MOTION_UNSUPPORTED",
        "warning",
        `MotionSpec "${spec.id}" in section "${sectionId}": reducedMotionFallback "inherit" ` +
          `is only valid when nested; root spec defaults to "instant".`,
        { sectionId },
      ));
      return "instant";
  }
}

// ── Main normalizer ───────────────────────────────────────────────────────────

export type MotionNormalizationResult = {
  motion: SectionMotion | undefined;
  unsupportedSpecs: MotionSpec[];
  diagnostics: DiagnosticEntry[];
};

/**
 * Normalize IR MotionSpec[] to the WD SectionMotion consumed by SiteRenderer.
 *
 * @param specs  The IR motionSpecs array from an IRSection.
 * @param sectionId  For diagnostic messages.
 */
export function normalizeIRMotionSpecs(
  specs: MotionSpec[],
  sectionId: string,
): MotionNormalizationResult {
  if (!specs || specs.length === 0) {
    return { motion: undefined, unsupportedSpecs: [], diagnostics: [] };
  }

  const diagnostics: DiagnosticEntry[] = [];
  const unsupportedSpecs: MotionSpec[] = [];
  const entries: SectionMotionEntry[] = [];

  // reducedMotionFallback is section-wide in WD; derive from the first compilable spec
  // or default to "instant" when all specs are unsupported.
  let sectionRMF: "instant" | "none" | undefined;

  for (const spec of specs) {
    // ── Guard: unsupported trigger ────────────────────────────────────────────
    if (!NATIVE_TRIGGERS.has(spec.trigger)) {
      unsupportedSpecs.push(spec);
      diagnostics.push(makeDiagnostic(
        "MOTION_UNSUPPORTED",
        "warning",
        `MotionSpec "${spec.id}" in section "${sectionId}": trigger "${spec.trigger}" is not in ` +
          `the safe native subset. Spec preserved in IR, not compiled to WD.`,
        { sectionId },
      ));
      continue;
    }

    // ── Guard: unsupported effect ─────────────────────────────────────────────
    if (!NATIVE_EFFECTS.has(spec.effect)) {
      unsupportedSpecs.push(spec);
      diagnostics.push(makeDiagnostic(
        "MOTION_UNSUPPORTED",
        "warning",
        `MotionSpec "${spec.id}" in section "${sectionId}": effect "${spec.effect}" is not in ` +
          `the safe native subset (requires ken-burns/parallax/marquee/magnetic/path-draw/custom runtime). ` +
          `Spec preserved in IR, not compiled to WD.`,
        { sectionId },
      ));
      continue;
    }

    // ── Warn: unsupported rich fields (compiled with loss) ────────────────────
    const richFields = hasUnsupportedFields(spec);
    if (richFields.length > 0) {
      diagnostics.push(makeDiagnostic(
        "MOTION_APPROXIMATED",
        "warning",
        `MotionSpec "${spec.id}" in section "${sectionId}": rich fields [${richFields.join(", ")}] ` +
          `have no WD equivalent and are dropped. Animation compiles without them.`,
        { sectionId },
      ));
    }

    // ── Map reducedMotionFallback ─────────────────────────────────────────────
    const rmf = mapReducedMotionFallback(spec, sectionId, diagnostics);
    if (sectionRMF === undefined) sectionRMF = rmf;

    // ── Build transform ───────────────────────────────────────────────────────
    const transform = buildTransform(spec.initialState, spec.finalState);

    // ── Map deviceBehavior → deviceOverride ───────────────────────────────────
    let deviceOverride: SectionMotionEntry["deviceOverride"];
    if (spec.deviceBehavior) {
      const { tablet, mobile } = spec.deviceBehavior;
      deviceOverride = {};
      if (tablet) {
        deviceOverride.tablet = {};
        if (tablet.durationMs !== undefined) deviceOverride.tablet.durationMs = tablet.durationMs;
        if (tablet.durationMs !== undefined) deviceOverride.tablet.delayMs = 0; // carry existing default
      }
      if (mobile) {
        deviceOverride.mobile = {};
        if (mobile.durationMs !== undefined) deviceOverride.mobile.durationMs = mobile.durationMs;
      }
      if (!deviceOverride.tablet && !deviceOverride.mobile) deviceOverride = undefined;
    }

    // ── Build SectionMotionEntry ──────────────────────────────────────────────
    const entry: SectionMotionEntry = {
      target: spec.target ?? "self",
      trigger: spec.trigger as SectionMotionEntry["trigger"],
      transform,
      durationMs: Math.min(Math.max(Math.round(spec.durationMs ?? 400), 1), 5000),
      delayMs: Math.min(Math.max(Math.round(spec.delayMs ?? 0), 0), 3000),
      easing: normalizeEasing(spec.easing),
      scrollThreshold: 0.15,
      replay: false,
      ...(spec.sequence?.staggerMs !== undefined ? { staggerMs: Math.min(spec.sequence.staggerMs, 500) } : {}),
      ...(deviceOverride ? { deviceOverride } : {}),
    };

    entries.push(entry);
  }

  if (entries.length === 0) {
    // All specs were unsupported — no compiled motion.
    if (unsupportedSpecs.length > 0) {
      diagnostics.push(makeDiagnostic(
        "MOTION_UNSUPPORTED",
        "warning",
        `Section "${sectionId}": all ${unsupportedSpecs.length} motion spec(s) were unsupported ` +
          `and not compiled. Motion preserved in IR diagnostics.`,
        { sectionId },
      ));
    }
    return { motion: undefined, unsupportedSpecs, diagnostics };
  }

  const motion: SectionMotion = {
    specs: entries,
    reducedMotionFallback: sectionRMF ?? "instant",
  };

  return { motion, unsupportedSpecs, diagnostics };
}
