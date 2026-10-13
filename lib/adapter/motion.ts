/**
 * Motion Contract v1 — full structural representation of animation and interaction intent.
 *
 * DESIGN RULES:
 * - Motion is first-class. Never discard motion information by converting it to an
 *   opaque CSS string when it can be expressed through this contract.
 * - reducedMotionFallback is REQUIRED on every MotionSpec. There is no valid
 *   MotionSpec without an explicit reduced-motion decision.
 * - compilationPath is REQUIRED to document where this motion ends up. If the
 *   compilation target cannot express it natively, this field must say so.
 */

import { z } from "zod";

// ── Transform state ───────────────────────────────────────────────────────────

export const transformStateSchema = z.object({
  x: z.number().optional(),
  y: z.number().optional(),
  scale: z.number().min(0).optional(),
  rotate: z.number().optional(),
  opacity: z.number().min(0).max(1).optional(),
  blur: z.number().min(0).optional(),
  clipPath: z.string().trim().max(500).optional(),
});

export type TransformState = z.infer<typeof transformStateSchema>;

// ── Scroll relationship ───────────────────────────────────────────────────────

export const scrollRelationshipSchema = z.object({
  type: z.enum(["progress", "pin", "parallax"]),
  /** Scroll progress ratio (0–1) at which the animation starts. */
  startRatio: z.number().min(0).max(1).optional(),
  /** Scroll progress ratio (0–1) at which the animation ends. */
  endRatio: z.number().min(0).max(1).optional(),
  /** For pin: how long the element is pinned in scroll-pixels. */
  pinDuration: z.number().min(0).optional(),
  /** For parallax: multiplier relative to scroll speed (negative = opposite direction). */
  parallaxFactor: z.number().optional(),
});

export type ScrollRelationship = z.infer<typeof scrollRelationshipSchema>;

// ── Looping ───────────────────────────────────────────────────────────────────

export const loopingSchema = z.object({
  type: z.enum(["none", "infinite", "count"]),
  count: z.number().int().min(1).optional(),
  reverseOnReturn: z.boolean().optional(),
});

export type Looping = z.infer<typeof loopingSchema>;

// ── Hover behavior ────────────────────────────────────────────────────────────

export const hoverBehaviorSchema = z.object({
  exitAnimation: z.enum(["reverse", "snap", "none"]).optional(),
  /** Scale the interaction target on hover before the main animation fires. */
  scalePre: z.number().min(0).optional(),
});

export type HoverBehavior = z.infer<typeof hoverBehaviorSchema>;

// ── Reduced-motion fallback ────────────────────────────────────────────────────
//
// Every MotionSpec MUST include one of:
//   "none"       — element renders in its final state with no animation
//   "fade-only"  — simple opacity transition replaces the full animation
//   "instant"    — element appears instantly with no transition
//
// "inherit" defers to the parent MotionSpec's fallback (only valid when nested).

export const reducedMotionFallbackSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("none") }),
  z.object({ type: z.literal("fade-only"), durationMs: z.number().min(0).max(500).optional() }),
  z.object({ type: z.literal("instant") }),
  z.object({ type: z.literal("inherit") }),
]);

export type ReducedMotionFallback = z.infer<typeof reducedMotionFallbackSchema>;

// ── Native primitives ─────────────────────────────────────────────────────────
//
// When a MotionSpec maps to a known Kebu native motion primitive, set this field.
// Kebu's SiteRenderer has first-class support for these; all others require either
// a custom-component path or approximate fallback.

export const nativePrimitiveSchema = z.enum([
  "scroll-reveal",
  "ken-burns",
  "hero-parallax",
  "product-hover-zoom",
  "marquee-scroll",
  "quiz-transition",
]);

export type NativePrimitive = z.infer<typeof nativePrimitiveSchema>;

// ── Compilation path ──────────────────────────────────────────────────────────
//
// Documents where this motion ends up in the compiled output. Never left implicit.

export const motionCompilationPathSchema = z.enum([
  "native",             // Compiled to a nativePrimitive — full fidelity
  "custom-component",   // Preserved as a CustomComponentSpec — full fidelity
  "approximated",       // Structurally represented but not pixel-perfect — WARNING
  "unsupported",        // Cannot be compiled — triggers F4 FAIL unless isMaterial=false
]);

export type MotionCompilationPath = z.infer<typeof motionCompilationPathSchema>;

// ── Device-specific overrides ─────────────────────────────────────────────────
//
// Forward-declared as unknown at this level to avoid circular references;
// IRSection-level device handling is in ir.ts. Here we only need lightweight
// per-device motion parameter overrides.

export const deviceMotionOverrideSchema = z.object({
  disable: z.boolean().optional(),
  durationMs: z.number().min(0).optional(),
  effect: z.string().optional(),
  parallaxFactor: z.number().optional(),
});

export type DeviceMotionOverride = z.infer<typeof deviceMotionOverrideSchema>;

// ── MotionSpec ────────────────────────────────────────────────────────────────

export const motionSpecSchema = z.object({
  /** Stable ID for referencing this spec from diagnostics or sequences. */
  id: z.string().trim().min(1).max(80),

  /** What starts the animation. */
  trigger: z.enum([
    "load",
    "scroll-enter",
    "scroll-leave",
    "scroll-progress",
    "hover",
    "click",
    "touch",
    "none",
  ]),

  /**
   * CSS selector, semantic ref, or section-scoped element ID.
   * "self" means the section container itself.
   */
  target: z.string().trim().min(1).max(200).default("self"),

  /** The animation category. */
  effect: z.enum([
    "fade",
    "slide",
    "scale",
    "rotate",
    "blur",
    "reveal-clip",
    "ken-burns",
    "parallax",
    "marquee",
    "magnetic",
    "path-draw",
    "custom",
  ]),

  /** Element state before the animation begins. */
  initialState: transformStateSchema.optional(),

  /** Element state once the animation completes. */
  finalState: transformStateSchema.optional(),

  /** Animation duration in milliseconds. */
  durationMs: z.number().min(0).max(30000).optional(),

  /** Delay before animation starts (ms). */
  delayMs: z.number().min(0).max(10000).optional(),

  /** CSS easing string or named curve. */
  easing: z.string().trim().max(200).optional(),

  /** Groups this spec into a coordinated sequence with staggered timing. */
  sequence: z
    .object({
      group: z.string().trim().min(1).max(80),
      staggerMs: z.number().min(0).max(5000),
      index: z.number().int().min(0).optional(),
    })
    .optional(),

  /** How this motion relates to scroll position. */
  scrollRelationship: scrollRelationshipSchema.optional(),

  /** Looping configuration. */
  looping: loopingSchema.optional(),

  /** Hover/pointer interaction configuration (only for trigger: "hover"). */
  hoverBehavior: hoverBehaviorSchema.optional(),

  /** Per-device overrides for this spec. */
  deviceBehavior: z
    .object({
      desktop: deviceMotionOverrideSchema.optional(),
      tablet: deviceMotionOverrideSchema.optional(),
      mobile: deviceMotionOverrideSchema.optional(),
    })
    .optional(),

  /**
   * REQUIRED. What to show/do for prefers-reduced-motion users.
   * This field must always be set explicitly — there is no inherited default.
   */
  reducedMotionFallback: reducedMotionFallbackSchema,

  /** Which Kebu native primitive this maps to, if any. */
  nativePrimitive: nativePrimitiveSchema.optional(),

  /**
   * REQUIRED. Documents what happens to this spec during compilation.
   * If the compilation target cannot express it, this must say "unsupported"
   * or "approximated" — never silently omit.
   */
  compilationPath: motionCompilationPathSchema,

  /**
   * Human-readable note for diagnostics/review. Required when compilationPath
   * is "approximated" or "unsupported".
   */
  fidelityNote: z.string().trim().max(500).optional(),
});

export type MotionSpec = z.infer<typeof motionSpecSchema>;

// ── MotionContractV1 ──────────────────────────────────────────────────────────
//
// A versioned envelope containing all motion specs for an Aesthetic or section.

export const motionContractV1Schema = z.object({
  contractVersion: z.literal("1"),
  specs: z.array(motionSpecSchema),
  /**
   * Whether this contract was authored with full motion intent (true) or
   * approximated/downgraded from a richer source (false).
   */
  complete: z.boolean().default(true),
  notes: z.string().trim().max(1000).optional(),
});

export type MotionContractV1 = z.infer<typeof motionContractV1Schema>;
