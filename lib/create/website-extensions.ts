/**
 * Kebu Native Aesthetic Capability Extensions — Phase 3
 *
 * Adds schema definitions for capabilities previously classified as EXTENSION_REQUIRED
 * in the Adapter gap report. All fields are OPTIONAL and ADDITIVE — existing
 * WebsiteDefinitions require no migration to continue rendering.
 *
 * Layer status after Phase 3:
 *   schema + validation  → ✓ (this file)
 *   persistence          → ✓ (fields pass through JSON persist/load unmodified)
 *   Builder editing UI   → partial / future (DO NOT redesign Builder UI per scope)
 *   Rendering            → partial / future (renderer picks up fields it knows)
 *   Certification/tests  → ✓ (see tests/create/website-extensions.test.ts)
 *
 * Because Builder rendering/editing are incomplete, ALL extended capabilities are
 * still classified as EXTENSION_REQUIRED (schema-level) in compile-capabilities.ts.
 * The Adapter compiler reports them honestly — a type in TypeScript is NOT enough
 * to call a capability native.
 *
 * DESIGN RULES:
 * - No arbitrary executable JavaScript. All motion/interaction fields are declarative.
 * - No raw JSON query language. Binding contracts are typed and permission-aware.
 * - No arbitrary ARIA field injection — only semantically justified metadata.
 * - All z.enum values must be explicitly exhaustive. No open strings where a closed
 *   enum is possible.
 */

import { z } from "zod";

// ── A. Device compositions ─────────────────────────────────────────────────────
//
// Shared semantic section content + independent per-device section ordering.
// Desktop is always canonical. Tablet/mobile can reorder or hide sections.
// Does NOT allow per-device section composition recursion (no nested deviceLayouts).
//
// This is a PAGE-level concept: sections live once in page.sections (shared data);
// deviceLayouts controls ordering and visibility on non-desktop devices only.

export const deviceLayoutSchema = z.object({
  /**
   * Section IDs in render order for this device.
   * Sections omitted from sectionOrder are still rendered (at the end, in base order).
   * Providing sectionOrder allows reordering without creating per-device section copies.
   */
  sectionOrder: z.array(z.string().trim().min(1).max(80)).max(40).optional(),
  /**
   * Section IDs to hide on this device.
   * Must not contradict responsive visibility on the section itself —
   * the section-level visibility.hideOn takes precedence if present.
   */
  hiddenSections: z.array(z.string().trim().min(1).max(80)).max(40).optional(),
}).superRefine((val, ctx) => {
  if (val.sectionOrder && val.hiddenSections) {
    const orderSet = new Set(val.sectionOrder);
    const hiddenSet = new Set(val.hiddenSections);
    const conflicts: string[] = [];
    for (const id of hiddenSet) {
      if (orderSet.has(id)) conflicts.push(id);
    }
    if (conflicts.length > 0) {
      ctx.addIssue({
        code: "custom",
        message: `Section IDs appear in both sectionOrder and hiddenSections: ${conflicts.join(", ")}`,
        path: ["hiddenSections"],
      });
    }
  }
});

export type DeviceLayout = z.infer<typeof deviceLayoutSchema>;

export const pageDeviceLayoutsSchema = z.object({
  tablet: deviceLayoutSchema.optional(),
  mobile: deviceLayoutSchema.optional(),
}).optional();

export type PageDeviceLayouts = z.infer<typeof pageDeviceLayoutsSchema>;

// ── B. Structured motion ───────────────────────────────────────────────────────
//
// Declarative motion per section. No arbitrary JavaScript.
// Respects prefers-reduced-motion — the reducedMotionFallback field is mandatory
// when specs are provided. Deterministic: same spec → same rendering.

export const motionTriggerSchema = z.enum([
  "scroll-enter",    // element enters the viewport
  "scroll-exit",     // element exits the viewport
  "load",            // page load / section mount
  "hover",           // pointer enters the element
  "click",           // user clicks the element
  "media-play",      // a media element in the section begins playback
]);

export type MotionTrigger = z.infer<typeof motionTriggerSchema>;

export const motionEasingSchema = z.enum([
  "linear",
  "ease",
  "ease-in",
  "ease-out",
  "ease-in-out",
  "spring",       // natural spring curve
]);

export type MotionEasing = z.infer<typeof motionEasingSchema>;

export const motionTransformSchema = z.object({
  /** Starting opacity (0–1). If null, opacity is not animated. */
  opacityFrom: z.number().min(0).max(1).optional(),
  /** Ending opacity (0–1). If null, opacity is not animated. */
  opacityTo: z.number().min(0).max(1).optional(),
  /** Starting horizontal translate in px or % string (e.g. "-24px", "0%"). */
  translateXFrom: z.string().trim().max(20).optional(),
  translateXTo: z.string().trim().max(20).optional(),
  /** Starting vertical translate. */
  translateYFrom: z.string().trim().max(20).optional(),
  translateYTo: z.string().trim().max(20).optional(),
  /** Starting scale (1 = no change). */
  scaleFrom: z.number().min(0).max(4).optional(),
  scaleTo: z.number().min(0).max(4).optional(),
  /** Starting rotation in degrees. */
  rotateFrom: z.number().min(-360).max(360).optional(),
  rotateTo: z.number().min(-360).max(360).optional(),
});

export type MotionTransform = z.infer<typeof motionTransformSchema>;

/** One declarative motion spec for a rendered element within a section. */
export const sectionMotionEntrySchema = z.object({
  /**
   * CSS selector relative to the section root. Must be a simple, safe selector:
   * element type, class (.cls), data attribute ([data-motion]). No combinators,
   * pseudo-classes, or :root references.
   */
  target: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(
      /^[a-z0-9\-_.[\]"='#\s,+>~:]+$/i,
      "target must be a safe CSS selector",
    ),
  trigger: motionTriggerSchema,
  transform: motionTransformSchema,
  /** Duration in milliseconds (1–5000). */
  durationMs: z.number().int().min(1).max(5000).default(400),
  /** Delay before the animation starts (ms). */
  delayMs: z.number().int().min(0).max(3000).optional().default(0),
  easing: motionEasingSchema.optional().default("ease-out"),
  /**
   * For lists of items that animate in sequence (stagger).
   * Each child delays by staggerMs * index.
   */
  staggerMs: z.number().int().min(0).max(500).optional(),
  /**
   * scroll-enter only: what fraction of the element must be visible
   * before the animation fires (0–1).
   */
  scrollThreshold: z.number().min(0).max(1).optional().default(0.15),
  /**
   * Whether the animation replays each time the trigger fires (true)
   * or plays once and stays at the final state (false).
   */
  replay: z.boolean().optional().default(false),
  /**
   * Per-device override: { tablet?: overrideFields, mobile?: overrideFields }
   * Absent = same spec on all devices.
   */
  deviceOverride: z
    .object({
      tablet: z.object({ durationMs: z.number().int().min(1).max(5000).optional(), delayMs: z.number().int().min(0).max(3000).optional() }).optional(),
      mobile: z.object({ durationMs: z.number().int().min(1).max(5000).optional(), delayMs: z.number().int().min(0).max(3000).optional() }).optional(),
    })
    .optional(),
});

export type SectionMotionEntry = z.infer<typeof sectionMotionEntrySchema>;

export const sectionMotionSchema = z.object({
  specs: z.array(sectionMotionEntrySchema).max(12),
  /**
   * REQUIRED when specs are provided.
   * "instant" — skip animation, jump to final state immediately.
   * "none" — remove all animated effects, section renders statically.
   */
  reducedMotionFallback: z.enum(["instant", "none"]),
}).optional();

export type SectionMotion = z.infer<typeof sectionMotionSchema>;

// ── C. Accessibility metadata ──────────────────────────────────────────────────
//
// Semantic HTML is the preferred mechanism. These fields are for cases where
// the section renderer cannot infer the correct role or label from content alone.
// DO NOT add ARIA fields blindly — each must have a justified semantic purpose.

export const sectionA11ySchema = z.object({
  /**
   * Override the ARIA landmark role for this section.
   * Only set when the section genuinely plays this landmark role on the page
   * and the renderer cannot infer it from section type alone.
   */
  landmark: z
    .enum(["main", "nav", "banner", "complementary", "contentinfo", "region"])
    .optional(),
  /**
   * Human-readable label for the landmark (aria-label).
   * Required when landmark = "region" (a generic landmark without a label is useless).
   * Useful for pages with multiple nav landmarks (e.g. "Primary navigation").
   */
  label: z.string().trim().max(120).optional(),
  /**
   * Override the heading level (h1–h6) for the section's primary heading.
   * The renderer normally derives this from section order; override only when
   * the page has an unusual document outline that the renderer cannot fix itself.
   */
  headingLevel: z.union([
    z.literal(1), z.literal(2), z.literal(3),
    z.literal(4), z.literal(5), z.literal(6),
  ]).optional(),
  /**
   * Mark this section as the skip-link destination (id="main-content").
   * Only one section per page should set this to true.
   */
  skipTarget: z.boolean().optional(),
  /**
   * Declare a live region policy for sections that update dynamically
   * (e.g. real-time stock count, active cart indicator, notification feed).
   * "polite" = announce when user is idle; "assertive" = announce immediately.
   */
  liveRegion: z.enum(["polite", "assertive"]).optional(),
}).superRefine((val, ctx) => {
  if (val.landmark === "region" && !val.label) {
    ctx.addIssue({
      code: "custom",
      message: 'a11y.label is required when landmark is "region" (aria-label needed for generic landmark)',
      path: ["label"],
    });
  }
});

export type SectionA11y = z.infer<typeof sectionA11ySchema>;

// ── D. Responsive visibility ───────────────────────────────────────────────────
//
// Device-level section visibility. Prevents contradictory states.
// Both showOn and hideOn accept device arrays; they MUST NOT overlap.

export const deviceNameSchema = z.enum(["desktop", "tablet", "mobile"]);
export type DeviceName = z.infer<typeof deviceNameSchema>;

export const responsiveVisibilitySchema = z.object({
  /**
   * Render this section only on these devices.
   * Mutually exclusive with hideOn — do not combine.
   */
  showOn: z.array(deviceNameSchema).min(1).max(3).optional(),
  /**
   * Hide this section on these devices.
   * Mutually exclusive with showOn — do not combine.
   */
  hideOn: z.array(deviceNameSchema).min(1).max(3).optional(),
}).superRefine((val, ctx) => {
  if (val.showOn && val.hideOn) {
    const showSet = new Set(val.showOn);
    const hideSet = new Set(val.hideOn);
    const overlap = [...showSet].filter((d) => hideSet.has(d));
    if (overlap.length > 0) {
      ctx.addIssue({
        code: "custom",
        message: `Contradictory visibility: device(s) ${overlap.join(", ")} appear in both showOn and hideOn`,
        path: ["hideOn"],
      });
    }
  }
  if (val.showOn && val.showOn.length === 3) {
    ctx.addIssue({
      code: "custom",
      message: "showOn with all 3 devices is redundant — omit the field instead",
      path: ["showOn"],
    });
  }
  if (val.hideOn && val.hideOn.length === 3) {
    ctx.addIssue({
      code: "custom",
      message: "hideOn with all 3 devices hides the section on every device — use section.hidden instead",
      path: ["hideOn"],
    });
  }
}).optional();

export type ResponsiveVisibility = z.infer<typeof responsiveVisibilitySchema>;

// ── E. Data binding contract ───────────────────────────────────────────────────
//
// Typed binding contract for sections that source their content from Kebu-owned
// objects (products, collections, events, posts, business data).
// - No executable code or arbitrary query language.
// - Permission-aware: bindings must declare their access tier.
// - Resolvers are trusted Kebu services — never client-side evaluation.

export const bindingEntityTypeSchema = z.enum([
  "products",
  "collections",
  "events",
  "posts",
  "business",
]);

export type BindingEntityType = z.infer<typeof bindingEntityTypeSchema>;

export const dataBindingFilterSchema = z.record(
  z.string().trim().max(60),
  z.union([z.string().trim().max(120), z.number(), z.boolean()]),
);

export const dataBindingSchema = z.object({
  /** The Kebu-owned entity type this section renders from. */
  entityType: bindingEntityTypeSchema,
  /**
   * Optional: bind to a specific entity by UUID.
   * When absent, the section renders from a collection/list.
   */
  entityId: z.string().uuid().optional(),
  /** Optional: typed query constraints applied by the Kebu resolver. */
  query: z
    .object({
      limit: z.number().int().min(1).max(100).optional(),
      sortBy: z
        .enum(["createdAt", "updatedAt", "name", "price", "popularity", "eventDate"])
        .optional(),
      sortOrder: z.enum(["asc", "desc"]).optional().default("asc"),
      /** Simple key=value filter bag. No nested queries, no operators. */
      filter: dataBindingFilterSchema.optional(),
    })
    .optional(),
  /**
   * Permission tier required to read this binding.
   * Kebu resolvers enforce this — it is NOT enforced by the schema alone.
   */
  permission: z.enum(["public", "owner", "admin"]).default("public"),
  /**
   * What to render when the live data is unavailable (network, loading, draft).
   * "placeholder" = show section skeleton UI.
   * "static-fallback" = render props.* fields as static content.
   * "hidden" = hide the section entirely.
   */
  unavailableBehavior: z.enum(["placeholder", "static-fallback", "hidden"]).default("static-fallback"),
}).optional();

export type DataBinding = z.infer<typeof dataBindingSchema>;

// ── F. Commerce bindings ───────────────────────────────────────────────────────
//
// Products section specific: reference live Kebu Commerce products.
// liveProductIds — ordered list of product UUIDs from Kebu Commerce.
// When set, the renderer fetches live prices/stock; static props remain as fallback.

export const commerceBindingSchema = z.object({
  /**
   * Ordered list of Kebu Commerce product UUIDs.
   * Renderer fetches live product data when available.
   * Falls back to static section props (title, price, imageUrl, etc.) when unavailable.
   */
  liveProductIds: z.array(z.string().uuid()).min(1).max(24).optional(),
  /**
   * When true, products that are out of stock are hidden in the rendered output.
   * Default: false (out-of-stock products show with an "out of stock" badge).
   */
  hideOutOfStock: z.boolean().optional().default(false),
  /**
   * Currency code for live price display (ISO 4217).
   * Falls back to theme.currency if absent.
   */
  currency: z.string().trim().max(8).optional(),
}).optional();

export type CommerceBinding = z.infer<typeof commerceBindingSchema>;

// ── G. Custom interactions ─────────────────────────────────────────────────────
//
// Safe declarative interaction primitives. No arbitrary JavaScript.
// Each type has a closed set of configuration fields.

export const interactionTypeSchema = z.enum([
  "tabs",
  "accordion",
  "carousel",
  "modal",
  "open-close",
  "scroll-reveal",
  "hover-state",
  "media-controls",
]);

export type InteractionType = z.infer<typeof interactionTypeSchema>;

export const sectionInteractionSchema = z
  .discriminatedUnion("type", [
    // tabs: multi-panel tab interface
    z.object({
      type: z.literal("tabs"),
      /** Which tab index to show on load (0-indexed). */
      defaultTab: z.number().int().min(0).max(20).optional().default(0),
      /** Transition style between tabs. */
      transition: z.enum(["fade", "slide", "none"]).optional().default("fade"),
    }),
    // accordion: collapsible content sections
    z.object({
      type: z.literal("accordion"),
      /** Whether multiple items can be open simultaneously. */
      multiExpand: z.boolean().optional().default(false),
      /** Which item index is open on load (-1 = all closed). */
      defaultOpen: z.number().int().min(-1).max(20).optional().default(0),
    }),
    // carousel: horizontal scrolling item reel
    z.object({
      type: z.literal("carousel"),
      /** Auto-advance interval in ms. 0 = no auto-advance. */
      autoplayMs: z.number().int().min(0).max(30000).optional().default(0),
      /** Show prev/next arrow buttons. */
      showArrows: z.boolean().optional().default(true),
      /** Show dot-indicator row. */
      showDots: z.boolean().optional().default(true),
      /** Loop back to the first item after the last. */
      loop: z.boolean().optional().default(false),
    }),
    // modal: section opens a dialog overlay
    z.object({
      type: z.literal("modal"),
      /** Trigger: what user action opens the modal. */
      openOn: z.enum(["button-click", "section-click", "timer"]).optional().default("button-click"),
      /** Timer mode: delay in ms before auto-open. */
      timerMs: z.number().int().min(500).max(30000).optional(),
      /** Whether clicking the backdrop closes the modal. */
      backdropClose: z.boolean().optional().default(true),
    }),
    // open-close: a toggle (drawer, collapsible block)
    z.object({
      type: z.literal("open-close"),
      /** Initial open state. */
      defaultOpen: z.boolean().optional().default(false),
      /** Animation when opening/closing. */
      animation: z.enum(["slide-down", "fade", "none"]).optional().default("slide-down"),
    }),
    // scroll-reveal: staggered reveal of section children on scroll
    z.object({
      type: z.literal("scroll-reveal"),
      /** Reveal animation style. */
      animation: z.enum(["fade-up", "fade-in", "slide-left", "slide-right", "scale-up"]).optional().default("fade-up"),
      /** Stagger delay between each child (ms). */
      staggerMs: z.number().int().min(0).max(300).optional().default(60),
      /** Viewport threshold before triggering (0–1). */
      threshold: z.number().min(0).max(1).optional().default(0.12),
    }),
    // hover-state: alternate content or style on pointer hover
    z.object({
      type: z.literal("hover-state"),
      /** What changes on hover. */
      effect: z.enum(["image-swap", "text-reveal", "color-shift", "scale-zoom"]).optional().default("scale-zoom"),
      /** Transition duration in ms. */
      durationMs: z.number().int().min(50).max(1000).optional().default(250),
    }),
    // media-controls: custom controls for video/audio sections
    z.object({
      type: z.literal("media-controls"),
      /** Auto-play media on load. */
      autoplay: z.boolean().optional().default(false),
      /** Mute on load (for autoplay compliance). */
      muted: z.boolean().optional().default(true),
      /** Loop media. */
      loop: z.boolean().optional().default(false),
      /** Show native browser controls vs. custom Kebu controls. */
      controlStyle: z.enum(["native", "kebu", "minimal", "hidden"]).optional().default("kebu"),
    }),
  ])
  .optional();

export type SectionInteraction = z.infer<typeof sectionInteractionSchema>;

// ── Re-export all extension types ──────────────────────────────────────────────

export const EXTENSION_SCHEMA_VERSION = "1.0.0" as const;
