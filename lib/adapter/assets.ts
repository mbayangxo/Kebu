/**
 * Asset contracts for the Aesthetic Adapter.
 *
 * Assets include images, videos, audio, SVGs, and other binary resources.
 * Every asset in an AdapterDesignIR must have traceable provenance —
 * where it came from, who owns it, and whether it can be embedded commercially.
 */

import { z } from "zod";

// ── Asset license ─────────────────────────────────────────────────────────────

export const assetLicenseSchema = z.object({
  /** SPDX license identifier when applicable (e.g. "CC-BY-4.0", "Unsplash"). */
  spdx: z.string().trim().max(80).optional(),
  /** Whether the license allows commercial use. null = unknown. */
  commercialUse: z.boolean().nullable().default(null),
  /** Required attribution text, if any. */
  attribution: z.string().trim().max(500).optional(),
  /** Human-readable license clarification. */
  notes: z.string().trim().max(1000).optional(),
});

export type AssetLicense = z.infer<typeof assetLicenseSchema>;

// ── Asset provenance ──────────────────────────────────────────────────────────

export const assetProvenanceSchema = z.object({
  /** Canonical source URL (original download location). */
  sourceUrl: z.string().trim().url().max(2000).optional(),
  /** Relative or absolute path in the source repository/design system. */
  sourcePath: z.string().trim().max(500).optional(),
  /** Original filename from the source system. */
  originalFilename: z.string().trim().max(255).optional(),
  /** SHA-256 hex digest of the asset content at import time. */
  sha256: z
    .string()
    .trim()
    .regex(/^[a-f0-9]{64}$/, "Must be a 64-character hex SHA-256 digest")
    .optional(),
  /** ISO 8601 timestamp when this asset was captured/downloaded. */
  capturedAt: z.string().trim().datetime({ offset: true }).optional(),
  /** License under which this asset may be used. */
  license: assetLicenseSchema.optional(),
  /** Business or individual that owns this asset. */
  ownedBy: z.string().trim().max(200).optional(),
  /** Whether this asset requires separate licensing clearance before publication. */
  requiresClearance: z.boolean().default(false),
});

export type AssetProvenance = z.infer<typeof assetProvenanceSchema>;

// ── Asset spec ────────────────────────────────────────────────────────────────

export const assetTypeSchema = z.enum([
  "image",
  "video",
  "audio",
  "svg",
  "document",
  "3d",
  "font",  // font binary assets use AssetSpec for the file; FontContractV1 for metadata
  "other",
]);

export type AssetType = z.infer<typeof assetTypeSchema>;

export const assetSpecSchema = z.object({
  /** Stable ID for this asset within the IR (not the URL — URLs can change). */
  id: z.string().trim().min(1).max(200),

  type: assetTypeSchema,

  /**
   * URL as it appears in the source design or as it will be used in output.
   * May be a data: URI, absolute URL, or relative path.
   */
  url: z.string().trim().max(2000),

  /** Accessible description of the asset. Required for images/SVGs. */
  altText: z.string().trim().max(500).optional(),

  /** Pixel dimensions for raster images. */
  dimensions: z
    .object({ width: z.number().int().min(1), height: z.number().int().min(1) })
    .optional(),

  /** File size in bytes, if known. */
  fileSize: z.number().int().min(0).optional(),

  /** MIME type (e.g. "image/webp", "video/mp4"). */
  mimeType: z.string().trim().max(100).optional(),

  /**
   * Where this asset came from and who owns it.
   * Provenance is not optional when the asset is from an external source.
   */
  provenance: assetProvenanceSchema,
});

export type AssetSpec = z.infer<typeof assetSpecSchema>;
