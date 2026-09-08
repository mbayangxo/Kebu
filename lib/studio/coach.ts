import { z } from "zod";
import type { StudioDesignType } from "@/lib/studio/canvas-document";

export const STUDIO_CREATION_MODES = ["create_for_me", "teach_me"] as const;
export type StudioCreationMode = (typeof STUDIO_CREATION_MODES)[number];

export const studioCoachLessonSchema = z.object({
  id: z.string().trim().min(1).max(40),
  topic: z.enum([
    "layout",
    "color",
    "typography",
    "branding",
    "marketing",
    "hierarchy",
    "format",
  ]),
  title: z.string().trim().min(1).max(120),
  why: z.string().trim().min(1).max(500),
  tip: z.string().trim().max(300).optional(),
});

export type StudioCoachLesson = z.infer<typeof studioCoachLessonSchema>;

export const studioCoachSchema = z.object({
  mode: z.enum(STUDIO_CREATION_MODES),
  lessons: z.array(studioCoachLessonSchema).max(12).default([]),
  generatedAt: z.string().trim().max(40).optional().nullable(),
});

export type StudioCoach = z.infer<typeof studioCoachSchema>;

function lessonId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Build honest teaching notes from real design choices (No watching — learn on the work).
 * Works with or without AI — never invents fake “you watched module 3” progress.
 */
export function buildStudioTeachingLessons(opts: {
  designType: StudioDesignType;
  businessName: string;
  headline: string;
  backgroundColor?: string;
  accentColor?: string;
  prompt?: string;
}): StudioCoachLesson[] {
  const business = opts.businessName.trim() || "your brand";
  const formatLabel = formatLabelForType(opts.designType);
  const lessons: StudioCoachLesson[] = [
    {
      id: lessonId("fmt"),
      topic: "format",
      title: `Sized for ${formatLabel}`,
      why: `This canvas matches how people actually see ${formatLabel} — so your message isn’t cropped or tiny on their phone.`,
      tip: "When you need another size later, use Resize instead of stretching a screenshot.",
    },
    {
      id: lessonId("hir"),
      topic: "hierarchy",
      title: "One clear headline first",
      why: `People skim. We put “${opts.headline.slice(0, 60)}” largest so ${business} is understood in under a second.`,
      tip: "If everything is big, nothing is important — keep one hero line.",
    },
    {
      id: lessonId("col"),
      topic: "color",
      title: "Contrast over decoration",
      why: `Dark or bold backgrounds (${opts.backgroundColor ?? "your bg"}) with a strong accent (${opts.accentColor ?? "accent"}) make type readable in bright African daylight and on cheap screens.`,
      tip: "Check that text still reads if you squint — that’s a real contrast test.",
    },
    {
      id: lessonId("typ"),
      topic: "typography",
      title: "Few fonts, clear roles",
      why: "One display feel for the headline and a simpler face for body/CTA reduces visual noise and looks more professional.",
      tip: "Brand kits lock fonts so every flyer and story feel like the same business.",
    },
    {
      id: lessonId("mkt"),
      topic: "marketing",
      title: "CTA tells them what to do",
      why: "A short call-to-action turns a pretty graphic into something that can get an order, WhatsApp, or visit.",
      tip: "Match the CTA to your next real step — Order, Message, Visit — not vague ‘Learn more’.",
    },
    {
      id: lessonId("brd"),
      topic: "branding",
      title: `Name ${business} early`,
      why: "Putting the business name near the top builds recognition when the design is shared out of context (status, screenshot, print).",
      tip: "Same name + colors across Studio → website → Shop feels like one company.",
    },
  ];

  if (opts.prompt && opts.prompt.length > 20) {
    lessons.push({
      id: lessonId("lay"),
      topic: "layout",
      title: "Built from your brief",
      why: `Your words shaped the copy and formats: “${opts.prompt.slice(0, 100)}${opts.prompt.length > 100 ? "…" : ""}”. Editing the layers keeps you in control — AI started the draft; you finish the craft.`,
      tip: "Try Teach me next time you want the ‘why’ beside every choice.",
    });
  }

  return lessons.slice(0, 8);
}

export function coachForCreationMode(
  mode: StudioCreationMode,
  lessonOpts: Parameters<typeof buildStudioTeachingLessons>[0],
): StudioCoach | null {
  if (mode === "create_for_me") {
    return {
      mode,
      lessons: [],
      generatedAt: new Date().toISOString(),
    };
  }
  return {
    mode: "teach_me",
    lessons: buildStudioTeachingLessons(lessonOpts),
    generatedAt: new Date().toISOString(),
  };
}

function formatLabelForType(t: StudioDesignType): string {
  switch (t) {
    case "instagram_post":
      return "Instagram posts";
    case "instagram_story":
      return "Instagram / WhatsApp stories";
    case "whatsapp_status":
      return "WhatsApp status";
    case "facebook_post":
      return "Facebook posts";
    case "flyer":
      return "print flyers";
    case "poster":
      return "posters";
    case "social_square":
      return "square social posts";
    default:
      return "this format";
  }
}

export function creationModeLabel(mode: StudioCreationMode): string {
  return mode === "teach_me" ? "Teach me" : "Do it for me";
}
