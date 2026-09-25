/**
 * CustomComponentSpec — representation for components that cannot be expressed
 * through standard section types.
 *
 * SECURITY DESIGN:
 * Custom code imported from external sources (v0/React/arbitrary HTML) is NOT
 * automatically trusted Kebu-executable code. Every custom component must pass
 * through a security boundary analysis before it can be deployed.
 *
 * TRUST LEVELS:
 *
 *   HTML:
 *     "sanitized"      — HTML passed through a DOMPurify-equivalent allowlist.
 *                        Safe to embed inline in Kebu pages. No scripts, no
 *                        dangerous attributes, no external resource loads.
 *     "sandboxed"      — Full arbitrary HTML isolated in an <iframe sandbox>.
 *                        Cannot access parent page context. External fetches
 *                        blocked unless explicitly permitted.
 *     "blocked"        — Contains constructs (inline event handlers, document.write,
 *                        data: iframe srcs, etc.) that cannot be safely embedded.
 *                        Requires human security review and explicit approval.
 *     "pending-review" — Not yet analyzed. Must not be deployed.
 *
 *   CSS:
 *     "scoped"         — All selectors wrapped in .kebu-cc-{id} to prevent bleed.
 *                        @import with external URLs rejected. :root overrides rejected.
 *     "rejected"       — Contains forbidden constructs. Requires rewrite.
 *     "pending-review" — Not yet analyzed.
 *
 *   JavaScript:
 *     "none"           — No JavaScript present. Safe.
 *     "blocked"        — Contains JavaScript. Auto-blocked. Requires human review,
 *                        security sign-off, and explicit allowlisting of capabilities.
 *     "pending-review" — Not yet analyzed.
 *
 *   React/JSX:
 *     "none"           — No React code present.
 *     "blocked"        — Contains React/JSX. Requires compilation pipeline, security
 *                        review, and sandbox deployment.
 *     "pending-review" — Not yet analyzed.
 *
 * PERMITTED CAPABILITIES (allowlist — must be explicitly declared):
 *   "read-dom"         — Component may query its own container's DOM.
 *   "local-storage"    — Component may use localStorage (scoped to site origin).
 *   "external-fetch"   — Component may fetch from approved external URLs (URLs listed
 *                        in permittedFetchOrigins).
 *   "animation"        — Component uses CSS/JS animations (not covered by MotionSpec).
 *   "intersection"     — Component uses IntersectionObserver for scroll detection.
 *   "resize"           — Component uses ResizeObserver.
 *
 * COMPILATION PATHS:
 *   "native-section"   — Mapped to an existing Kebu section type. Full fidelity.
 *   "free-text-fallback" — Rendered as a "free-text" section with sanitized HTML.
 *                          Reduced fidelity; motion/interactivity lost.
 *   "sandboxed-embed"  — Rendered inside an iframe sandbox. Full content preserved
 *                         but isolated from page context.
 *   "blocked"          — Cannot be deployed in current form. Requires human work.
 *   "pending-review"   — Awaiting security review.
 */

import { z } from "zod";
import { motionSpecSchema } from "./motion";
import { assetProvenanceSchema } from "./assets";

// ── Security boundary ─────────────────────────────────────────────────────────

export const htmlTrustLevelSchema = z.enum([
  "sanitized",
  "sandboxed",
  "blocked",
  "pending-review",
]);

export const cssTrustLevelSchema = z.enum([
  "scoped",
  "rejected",
  "pending-review",
]);

export const jsTrustLevelSchema = z.enum([
  "none",
  "blocked",
  "pending-review",
]);

export const reactTrustLevelSchema = z.enum([
  "none",
  "blocked",
  "pending-review",
]);

export const permittedCapabilitySchema = z.enum([
  "read-dom",
  "local-storage",
  "external-fetch",
  "animation",
  "intersection",
  "resize",
]);

export type PermittedCapability = z.infer<typeof permittedCapabilitySchema>;

export const customComponentSecuritySchema = z.object({
  /** Analysis result for HTML content. */
  trustedHtml: htmlTrustLevelSchema,
  /** Analysis result for CSS content. */
  trustedCss: cssTrustLevelSchema,
  /** Analysis result for JavaScript content. */
  trustedJs: jsTrustLevelSchema,
  /** Analysis result for React/JSX content. */
  trustedReact: reactTrustLevelSchema,
  /** Explicitly declared capabilities this component requires. */
  permittedCapabilities: z.array(permittedCapabilitySchema).default([]),
  /** Approved external fetch origins (only when "external-fetch" is permitted). */
  permittedFetchOrigins: z.array(z.string().trim().url().max(200)).optional(),
  /**
   * True when any trust level is "blocked" or "pending-review".
   * A component with requiresHumanApproval = true cannot be deployed.
   */
  requiresHumanApproval: z.boolean(),
  /** Identity of the human who approved this component. */
  approvedBy: z.string().trim().max(200).optional(),
  /** ISO 8601 timestamp of approval. */
  approvedAt: z.string().trim().datetime({ offset: true }).optional(),
  /** Notes from the security review. */
  approvalNotes: z.string().trim().max(2000).optional(),
});

export type CustomComponentSecurity = z.infer<typeof customComponentSecuritySchema>;

// ── Compilation path ──────────────────────────────────────────────────────────

export const componentCompilationPathSchema = z.enum([
  "native-section",
  "free-text-fallback",
  "sandboxed-embed",
  "blocked",
  "pending-review",
]);

export type ComponentCompilationPath = z.infer<typeof componentCompilationPathSchema>;

// ── Interactive spec ──────────────────────────────────────────────────────────

export const interactiveSpecSchema = z.object({
  /** DOM events this component listens for (e.g. ["click", "mousemove"]). */
  events: z.array(z.string().trim().max(50)).optional(),
  /** Simplified description of internal state (for documentation). */
  stateModel: z.record(z.string(), z.unknown()).optional(),
  /** External APIs or services this component calls. */
  apiDependencies: z.array(z.string().trim().max(200)).optional(),
  /**
   * Whether this component's interactivity is material (losing it fails F4).
   * Defaults to true — opt out only for decorative interactions.
   */
  interactivityMaterial: z.boolean().default(true),
});

export type InteractiveSpec = z.infer<typeof interactiveSpecSchema>;

// ── CustomComponentSpec ───────────────────────────────────────────────────────

export const customComponentSpecSchema = z.object({
  contractVersion: z.literal("1"),

  /** Stable ID within the IR. Referenced from IRSection.customComponent. */
  id: z.string().trim().min(1).max(200),

  /** Human-readable display name (e.g. "Animated Hero Carousel"). */
  displayName: z.string().trim().min(1).max(200),

  /** Optional description of what this component does. */
  description: z.string().trim().max(1000).optional(),

  /** Original source file path (relative to source root). */
  sourceFile: z.string().trim().max(500).optional(),

  /** SHA-256 hex digest of the original source file. */
  sourceHash: z
    .string()
    .trim()
    .regex(/^[a-f0-9]{64}$/, "Must be a 64-character hex SHA-256 digest")
    .optional(),

  /**
   * The Kebu section type this component maps to, if it maps to one.
   * "custom" means it has no native Kebu section equivalent.
   */
  displayType: z.string().trim().min(1).max(80).default("custom"),

  /**
   * Whether this component is materially part of the approved design.
   * When true: if compilationPath is "blocked" or "pending-review",
   * certification is blocked (F4 FAIL). When false: blocked motion/components
   * produce a WARNING rather than an ERROR.
   */
  isMaterial: z.boolean().default(true),

  /**
   * Minimal safe static HTML representation (sanitized, no scripts).
   * Used as fallback when the component cannot be rendered interactively.
   * Required when isMaterial = true.
   */
  staticHtmlFallback: z.string().trim().max(50000).optional(),

  /** Path to a screenshot or preview image in the asset store. */
  previewImagePath: z.string().trim().max(500).optional(),

  /** Interactivity specification. */
  interactiveSpec: interactiveSpecSchema.optional(),

  /** Motion specs associated with this component. */
  motionSpecs: z.array(motionSpecSchema).optional(),

  /**
   * Security analysis and trust boundaries for all code in this component.
   * REQUIRED. There is no custom component without a security boundary.
   */
  securityBoundary: customComponentSecuritySchema,

  /**
   * Human-readable note about fidelity tradeoffs, if any.
   * Required when compilationPath is "free-text-fallback" or "blocked".
   */
  fidelityNote: z.string().trim().max(1000).optional(),

  /**
   * How this component will be compiled into the output.
   * Never left implicit.
   */
  compilationPath: componentCompilationPathSchema,

  /** Where this component's source came from. */
  sourceProvenance: assetProvenanceSchema,
});

export type CustomComponentSpec = z.infer<typeof customComponentSpecSchema>;

// ── Security helpers ──────────────────────────────────────────────────────────

/** Returns true when the component's security boundary blocks deployment. */
export function isComponentBlocked(spec: CustomComponentSpec): boolean {
  const { trustedHtml, trustedCss, trustedJs, trustedReact, requiresHumanApproval } =
    spec.securityBoundary;
  if (requiresHumanApproval && !spec.securityBoundary.approvedBy) return true;
  if (trustedHtml === "blocked" || trustedHtml === "pending-review") return true;
  if (trustedCss === "rejected" || trustedCss === "pending-review") return true;
  if (trustedJs === "blocked" || trustedJs === "pending-review") return true;
  if (trustedReact === "blocked" || trustedReact === "pending-review") return true;
  return false;
}

/** Returns true when this component is material and blocked — which fails F4. */
export function isMaterialAndBlocked(spec: CustomComponentSpec): boolean {
  return spec.isMaterial && isComponentBlocked(spec);
}
