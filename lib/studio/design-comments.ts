import { z } from "zod";

export const createCommentSchema = z.object({
  body: z.string().trim().min(1).max(2000),
  anchorX: z.number().min(0).max(1).nullable().optional(),
  anchorY: z.number().min(0).max(1).nullable().optional(),
});

export const patchCommentSchema = z.object({
  body: z.string().trim().min(1).max(2000).optional(),
  resolved: z.boolean().optional(),
});

export type StudioDesignComment = {
  id: string;
  design_id: string;
  author_id: string;
  body: string;
  anchor_x: number | null;
  anchor_y: number | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};

export function commentPreview(body: string, max = 80): string {
  const t = body.trim().replace(/\s+/g, " ");
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}
