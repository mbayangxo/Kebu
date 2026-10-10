/**
 * Font Contract v1 — fonts as first-class Aesthetic assets.
 *
 * DESIGN RULES:
 * - The 13+6 bundled-font list is a fast path, NOT the architectural boundary.
 *   FontContractV1 supports all four source types so Aesthetics can use any
 *   appropriately licensed font.
 * - License clearance is required before a font goes into a published Aesthetic.
 *   webEmbedAllowed must be true; commercialUse must be true.
 * - Fallback stacks are required on every font — not optional. A font that
 *   fails to load must never leave the page unreadable.
 */

import { z } from "zod";
import { assetProvenanceSchema } from "./assets";

// ── Font source ───────────────────────────────────────────────────────────────

export const fontSourceSchema = z.enum([
  "kebu-bundled",  // Ships with Kebu; already cleared and available
  "google-fonts",  // Loaded from Google Fonts at runtime
  "self-hosted",   // Binary in the project's asset store
  "cdn-variable",  // Variable font from a CDN (subset/subset URL required)
]);

export type FontSource = z.infer<typeof fontSourceSchema>;

// ── Font license ──────────────────────────────────────────────────────────────

export const fontLicenseSchema = z.object({
  /**
   * SPDX identifier (e.g. "OFL-1.1", "Apache-2.0") or a short descriptive
   * label for licenses without an SPDX ID (e.g. "Bebas Neue Free").
   */
  spdx: z.string().trim().min(1).max(100),
  /**
   * Whether this license permits commercial use in published sites.
   * Must be true for any font used in a published Aesthetic.
   */
  commercialUse: z.boolean(),
  /**
   * Whether this license permits web embedding (CSS @font-face / Google Fonts CDN).
   * Must be true for any font used on the web.
   */
  webEmbedAllowed: z.boolean(),
  /** Optional human-readable notes or restrictions. */
  notes: z.string().trim().max(1000).optional(),
});

export type FontLicense = z.infer<typeof fontLicenseSchema>;

// ── Font role ─────────────────────────────────────────────────────────────────

export const fontRoleSchema = z.enum(["display", "body", "mono", "accent"]);
export type FontRole = z.infer<typeof fontRoleSchema>;

// ── Font loading strategy ─────────────────────────────────────────────────────

export const fontLoadingStrategySchema = z.enum([
  "swap",     // font-display: swap — FOUT acceptable; recommended for most
  "block",    // font-display: block — FOIT; only for critical above-fold display fonts
  "optional", // font-display: optional — may not load on slow connections
  "auto",     // font-display: auto — let the browser decide
]);

export type FontLoadingStrategy = z.infer<typeof fontLoadingStrategySchema>;

// ── FontContractV1 ────────────────────────────────────────────────────────────

export const fontContractV1Schema = z.object({
  contractVersion: z.literal("1"),

  /** Semantic role of this font in the Aesthetic. */
  role: fontRoleSchema,

  /** CSS font-family name exactly as it appears in CSS font stacks. */
  family: z.string().trim().min(1).max(100),

  /** Where this font comes from. */
  source: fontSourceSchema,

  /**
   * Numeric weights available in the font (e.g. [400, 600, 700]).
   * Must match what is actually loaded — do not list weights that aren't available.
   */
  weights: z
    .array(z.number().int().min(100).max(900).multipleOf(100))
    .min(1)
    .max(9),

  /** Styles available. */
  styles: z.array(z.enum(["normal", "italic"])).min(1),

  /** Whether this is a variable font (single file covering a range of weights/styles). */
  isVariable: z.boolean().default(false),

  /**
   * Variable axes supported (e.g. ["wght", "ital", "opsz"]).
   * Only meaningful when isVariable is true.
   */
  variableAxes: z.array(z.string().trim().max(20)).optional(),

  /**
   * Required CSS fallback stack. Must have at least one entry.
   * These are used when the font fails to load.
   * Example: ["Georgia", "Times New Roman", "serif"]
   */
  fallbackStack: z.array(z.string().trim().min(1).max(80)).min(1),

  /**
   * CSS size-adjust percentage (e.g. "105%") for metric-compatible fallback.
   * Reduces layout shift when the font loads.
   */
  sizeAdjust: z
    .string()
    .trim()
    .regex(/^\d+(\.\d+)?%$/, "sizeAdjust must be a CSS percentage like '105%'")
    .optional(),

  /** How to handle font loading. Defaults to "swap" for most cases. */
  loadingStrategy: fontLoadingStrategySchema.default("swap"),

  /**
   * License terms. Required for all fonts except kebu-bundled (which are pre-cleared).
   * Even for bundled fonts, this field documents the known license.
   */
  license: fontLicenseSchema,

  /**
   * Google Fonts API family specification string.
   * Only for source: "google-fonts".
   * Example: "Fraunces:ital,wght@0,400;0,600;0,700;1,400"
   */
  googleFontsSpec: z.string().trim().max(300).optional(),

  /**
   * Path to the font file in the asset store or repository.
   * Required for source: "self-hosted" or "kebu-bundled" (non-Google fonts).
   */
  selfHostedPath: z.string().trim().max(500).optional(),

  /**
   * CDN URL for variable font.
   * Required for source: "cdn-variable".
   */
  cdnUrl: z.string().trim().url().max(500).optional(),

  /**
   * Provenance of the font binary file (download URL, hash, etc.).
   * Strongly recommended for self-hosted and cdn-variable.
   */
  provenance: assetProvenanceSchema.optional(),
});

export type FontContractV1 = z.infer<typeof fontContractV1Schema>;

// ── Kebu bundled font registry ────────────────────────────────────────────────
//
// This is the current fast path — fonts already cleared and loaded by Kebu.
// It is NOT the architectural boundary. New fonts can be added via FontContractV1
// with source: "google-fonts" | "self-hosted" | "cdn-variable".

export const KEBU_BUNDLED_FONTS = [
  "Fraunces",
  "Playfair Display",
  "Oswald",
  "Bebas Neue",
  "IBM Plex Sans",
  "Inter",
  "Syne",
  "Lobster",
  "Dancing Script",
  "Great Vibes",
  "Pacifico",
  "Abril Fatface",
  "Steelfish",
  // Body fonts (system or Google)
  "Helvetica Neue",
  "Arial",
  "Georgia",
  "system-ui",
  "Courier New",
  "monospace",
] as const;

export type KebuBundledFont = (typeof KEBU_BUNDLED_FONTS)[number];

export function isKebuBundledFont(family: string): boolean {
  return (KEBU_BUNDLED_FONTS as readonly string[]).includes(family);
}
