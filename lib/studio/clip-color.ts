/**
 * Clip color grade + chroma key settings (persisted on composition clips).
 * Preview applies CSS filters; chroma uses canvas keying when enabled.
 */
import { z } from "zod";

export const clipColorGradeSchema = z.object({
  brightness: z.number().min(-1).max(1).default(0),
  contrast: z.number().min(-1).max(1).default(0),
  saturation: z.number().min(-1).max(1).default(0),
});

export type ClipColorGrade = z.infer<typeof clipColorGradeSchema>;

export const clipChromaSchema = z.object({
  enabled: z.boolean().default(false),
  /** Hex key color, typically green screen */
  color: z.string().trim().regex(/^#[0-9A-Fa-f]{6}$/).default("#00FF00"),
  similarity: z.number().min(0.05).max(1).default(0.4),
  smoothness: z.number().min(0).max(1).default(0.1),
});

export type ClipChroma = z.infer<typeof clipChromaSchema>;

export function cssFilterFromGrade(grade: Partial<ClipColorGrade> | null | undefined): string {
  const b = grade?.brightness ?? 0;
  const c = grade?.contrast ?? 0;
  const s = grade?.saturation ?? 0;
  const brightness = 1 + b;
  const contrast = 1 + c;
  const saturate = 1 + s;
  return `brightness(${brightness}) contrast(${contrast}) saturate(${saturate})`;
}

export function parseHexColor(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([0-9A-Fa-f]{6})$/.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1]!, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/** Distance 0–1 for chroma similarity tests / canvas keying. */
export function chromaDistance(
  pixel: { r: number; g: number; b: number },
  key: { r: number; g: number; b: number },
): number {
  const dr = pixel.r - key.r;
  const dg = pixel.g - key.g;
  const db = pixel.b - key.b;
  return Math.min(1, Math.sqrt(dr * dr + dg * dg + db * db) / 441.67);
}
