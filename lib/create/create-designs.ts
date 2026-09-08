import { z } from "zod";
import { canvasDocumentSchema, STUDIO_DESIGN_TYPES } from "@/lib/studio/canvas-document";

/** @deprecated Legacy flat poster fields — use CanvasDocument via parseCanvasDocument */
export const createDesignCanvasSchema = z.object({
  headline: z.string().trim().max(120).default(""),
  subheadline: z.string().trim().max(200).default(""),
  cta: z.string().trim().max(60).default(""),
  accentColor: z.string().trim().max(40).default("#E05A2B"),
  backgroundColor: z.string().trim().max(40).default("#0F0D33"),
  imageUrl: z.union([z.literal(""), z.string().trim().url().max(500)]).default(""),
  businessName: z.string().trim().max(120).default(""),
});

export const CREATE_DESIGN_TYPES = STUDIO_DESIGN_TYPES;

export const createDesignSchema = z.object({
  title: z.string().trim().min(1).max(120),
  designType: z.enum(CREATE_DESIGN_TYPES).default("poster"),
  businessId: z.string().uuid().optional().nullable(),
  canvas: z.union([createDesignCanvasSchema.partial(), canvasDocumentSchema]).optional(),
});

export type CreateDesignCanvas = z.infer<typeof createDesignCanvasSchema>;

export function defaultPosterCanvas(businessName = "My business"): CreateDesignCanvas {
  return createDesignCanvasSchema.parse({
    businessName,
    headline: "Grand opening",
    subheadline: "Quality you can trust — made in Africa.",
    cta: "Order on WhatsApp",
    accentColor: "#E05A2B",
    backgroundColor: "#0F0D33",
    imageUrl: "",
  });
}
