import { z } from "zod";

/** Text lives in the existing extraCutouts collection and uses the same save authority. */
export const collageTextFields = z.object({
  kind: z.enum(["image", "text"]).optional(),
  text: z.string().max(2000).optional(),
  fontFamily: z.enum(["editorial", "serif", "sans", "handwriting"]).optional(),
  fontSize: z.number().min(12).max(240).optional(),
  textColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  outlineColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  outlineWidth: z.number().min(0).max(12).optional(),
  textAlign: z.enum(["left", "center", "right"]).optional(),
});
export type CollageText = z.infer<typeof collageTextFields> & {
  id: string; src: string; topPct: number; leftPct: number; widthPct: number;
  alt?: string; href?: string; rotate?: number; zIndex?: number;
};
export const COLLAGE_TEXT_FONTS = {
  editorial: "Steelfish, 'Arial Narrow', Impact, sans-serif",
  serif: "Georgia, serif",
  sans: "Arial, sans-serif",
  handwriting: "'Brush Script MT', cursive",
} as const;
