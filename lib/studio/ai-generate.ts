import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import {
  artboardSize,
  canvasDocumentSchema,
  newLayerId,
  STUDIO_DESIGN_TYPES,
  type CanvasDocument,
  type StudioDesignType,
} from "@/lib/studio/canvas-document";
import { STUDIO_TEMPLATES, buildCanvasFromTemplate } from "@/lib/studio/templates";
import {
  coachForCreationMode,
  type StudioCreationMode,
} from "@/lib/studio/coach";

export const studioGenerateBriefSchema = z.object({
  prompt: z.string().trim().min(8).max(800),
  businessName: z.string().trim().max(120).optional().default(""),
  /** Optional brand colors to seed designs */
  primaryColor: z.string().trim().max(40).optional(),
  accentColor: z.string().trim().max(40).optional(),
  backgroundColor: z.string().trim().max(40).optional(),
  /** Do it for me vs Teach me (No watching — learn on the work) */
  creationMode: z.enum(["create_for_me", "teach_me"]).optional().default("create_for_me"),
});

export type StudioGenerateBrief = z.infer<typeof studioGenerateBriefSchema>;

export type StudioGeneratedDesign = {
  title: string;
  designType: StudioDesignType;
  canvas: CanvasDocument;
};

const aiPackItemSchema = z.object({
  title: z.string().trim().min(1).max(120),
  designType: z.enum(STUDIO_DESIGN_TYPES),
  backgroundColor: z.string().trim().max(40).optional(),
  headline: z.string().trim().max(120),
  subheadline: z.string().trim().max(200).optional(),
  cta: z.string().trim().max(60).optional(),
  accentColor: z.string().trim().max(40).optional(),
  businessName: z.string().trim().max(120).optional(),
});

const aiPackSchema = z.object({
  designs: z.array(aiPackItemSchema).min(1).max(4),
});

function extractJson(text: string): unknown {
  const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error("AI did not return JSON");
  }
}

function shortHeadlineFromPrompt(prompt: string): string {
  const cleaned = prompt.replace(/\s+/g, " ").trim();
  if (cleaned.length <= 48) return cleaned;
  return `${cleaned.slice(0, 45).trim()}…`;
}

/** Build editable canvas layers from AI (or fallback) copy — no raster image gen. */
export function canvasFromCopy(opts: {
  designType: StudioDesignType;
  businessName: string;
  backgroundColor?: string;
  headline: string;
  subheadline?: string;
  cta?: string;
  accentColor?: string;
}): CanvasDocument {
  const { width, height } = artboardSize(opts.designType);
  const bg = opts.backgroundColor ?? "#0F0D33";
  const accent = opts.accentColor ?? "#E05A2B";
  const business = opts.businessName.trim() || "My business";
  const layers: Array<Record<string, unknown>> = [
    {
      id: newLayerId(),
      type: "text",
      name: "Business",
      x: width * 0.08,
      y: height * 0.08,
      width: width * 0.84,
      height: 40,
      rotation: 0,
      opacity: 1,
      locked: false,
      text: business,
      fontSize: 18,
      fontFamily: "system-ui",
      fontWeight: "600",
      color: "#FFFFFFAA",
      textAlign: "left",
    },
    {
      id: newLayerId(),
      type: "text",
      name: "Headline",
      x: width * 0.08,
      y: height * 0.14,
      width: width * 0.84,
      height: Math.min(160, height * 0.2),
      rotation: 0,
      opacity: 1,
      locked: false,
      text: opts.headline.slice(0, 120),
      fontSize: opts.designType.includes("story") || opts.designType === "whatsapp_status" ? 56 : 44,
      fontFamily: "Fraunces",
      fontWeight: "700",
      color: "#FFFFFF",
      textAlign: "left",
    },
  ];
  if (opts.subheadline?.trim()) {
    layers.push({
      id: newLayerId(),
      type: "text",
      name: "Subheadline",
      x: width * 0.08,
      y: height * 0.32,
      width: width * 0.84,
      height: 100,
      rotation: 0,
      opacity: 1,
      locked: false,
      text: opts.subheadline.slice(0, 200),
      fontSize: 22,
      fontFamily: "system-ui",
      fontWeight: "400",
      color: "#FFFFFFCC",
      textAlign: "left",
    });
  }
  layers.push(
    {
      id: newLayerId(),
      type: "rect",
      name: "CTA",
      x: width * 0.08,
      y: height * 0.78,
      width: width * 0.42,
      height: 56,
      rotation: 0,
      opacity: 1,
      locked: false,
      fill: accent,
    },
    {
      id: newLayerId(),
      type: "text",
      name: "CTA label",
      x: width * 0.08,
      y: height * 0.79,
      width: width * 0.42,
      height: 48,
      rotation: 0,
      opacity: 1,
      locked: false,
      text: (opts.cta ?? "Shop now").slice(0, 60),
      fontSize: 18,
      fontFamily: "system-ui",
      fontWeight: "700",
      color: "#FFFFFF",
      textAlign: "center",
    },
  );
  return canvasDocumentSchema.parse({
    version: 2,
    width,
    height,
    backgroundColor: bg,
    layers,
    pages: [
      {
        id: `pg_${Math.random().toString(36).slice(2, 10)}`,
        name: "Page 1",
        width,
        height,
        backgroundColor: bg,
        layers,
      },
    ],
  });
}

function attachCoach(
  canvas: CanvasDocument,
  brief: StudioGenerateBrief,
  designType: StudioDesignType,
  headline: string,
): CanvasDocument {
  const mode = (brief.creationMode ?? "create_for_me") as StudioCreationMode;
  const coach = coachForCreationMode(mode, {
    designType,
    businessName: brief.businessName,
    headline,
    backgroundColor: brief.backgroundColor,
    accentColor: brief.accentColor,
    prompt: brief.prompt,
  });
  return { ...canvas, coach };
}

function packFromValidatedItems(
  items: z.infer<typeof aiPackItemSchema>[],
  brief: StudioGenerateBrief,
): StudioGeneratedDesign[] {
  return items.map((item) => {
    const canvas = canvasFromCopy({
      designType: item.designType,
      businessName: item.businessName || brief.businessName || "My business",
      backgroundColor: item.backgroundColor ?? brief.backgroundColor,
      headline: item.headline,
      subheadline: item.subheadline,
      cta: item.cta,
      accentColor: item.accentColor ?? brief.accentColor,
    });
    return {
      title: item.title.slice(0, 120),
      designType: item.designType,
      canvas: attachCoach(canvas, brief, item.designType, item.headline),
    };
  });
}

/** Deterministic multi-asset pack when AI is off or fails — always editable canvases. */
export function fallbackStudioCampaignPack(brief: StudioGenerateBrief): {
  designs: StudioGeneratedDesign[];
  usedAi: false;
  fallback: true;
} {
  const business = brief.businessName.trim() || "My business";
  const headline = shortHeadlineFromPrompt(brief.prompt);
  const sub = brief.prompt.length > 60 ? brief.prompt.slice(0, 160) : `Built for ${business}`;
  const types: StudioDesignType[] = ["instagram_post", "instagram_story", "flyer"];
  const designs = types.map((designType, i) => {
    const template =
      STUDIO_TEMPLATES.find((t) => t.designType === designType) ?? STUDIO_TEMPLATES[0]!;
    const canvas = buildCanvasFromTemplate(
      {
        ...template,
        preset: {
          ...template.preset,
          backgroundColor: brief.backgroundColor ?? template.preset?.backgroundColor,
          accentColor: brief.accentColor ?? template.preset?.accentColor,
          headline,
          subheadline: sub,
          cta: "Order now",
        },
      },
      business,
    );
    const labels = ["IG post", "IG story", "Flyer"];
    return {
      title: `${business} — ${labels[i] ?? designType}`.slice(0, 120),
      designType,
      canvas: attachCoach(canvas, brief, designType, headline),
    };
  });
  return { designs, usedAi: false, fallback: true };
}

/**
 * Prompt → 1–3 editable Studio canvases (structured JSON, not images).
 * Honest fallback when ANTHROPIC_API_KEY is missing.
 */
export async function generateStudioCampaignWithAi(brief: StudioGenerateBrief): Promise<
  | { ok: true; designs: StudioGeneratedDesign[]; usedAi: boolean; fallback?: boolean }
  | { ok: false; error: string }
> {
  const parsed = studioGenerateBriefSchema.safeParse(brief);
  if (!parsed.success) {
    return { ok: false, error: "Invalid campaign brief." };
  }
  const input = parsed.data;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    const fb = fallbackStudioCampaignPack(input);
    return { ok: true, designs: fb.designs, usedAi: false, fallback: true };
  }

  const anthropic = new Anthropic({ apiKey });
  const system = `You are Yande in Kebu Studio. Generate editable marketing design packs as JSON only.
Return ONLY JSON: { "designs": [ { "title", "designType", "backgroundColor", "headline", "subheadline", "cta", "accentColor", "businessName" } ] }
Allowed designType: ${STUDIO_DESIGN_TYPES.join(", ")}.
Prefer 3 designs: instagram_post, instagram_story, flyer.
No HTML, no image URLs, no markdown. Keep text short for mobile Africa.`;

  const userPrompt = `Campaign brief:
${input.prompt}
Business name: ${input.businessName || "(infer short brand name)"}
Brand colors (optional): primary=${input.primaryColor ?? ""} accent=${input.accentColor ?? ""} background=${input.backgroundColor ?? ""}

Return 3 designs for Instagram post, Instagram story, and flyer.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [
        { role: "user", content: system },
        { role: "user", content: userPrompt },
      ],
    });
    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      const fb = fallbackStudioCampaignPack(input);
      return { ok: true, designs: fb.designs, usedAi: false, fallback: true };
    }
    const raw = extractJson(textBlock.text);
    const pack = aiPackSchema.safeParse(raw);
    if (!pack.success) {
      const fb = fallbackStudioCampaignPack(input);
      return { ok: true, designs: fb.designs, usedAi: false, fallback: true };
    }
    return {
      ok: true,
      designs: packFromValidatedItems(pack.data.designs, input),
      usedAi: true,
    };
  } catch {
    const fb = fallbackStudioCampaignPack(input);
    return { ok: true, designs: fb.designs, usedAi: false, fallback: true };
  }
}
