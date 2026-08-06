import { z } from "zod";

export const projectTypeSchema = z.enum(["website", "store", "portfolio", "landing"]);

export const heroPropsSchema = z.object({
  heading: z.string().trim().min(1).max(160).default("Your business name"),
  subheading: z.string().trim().max(400).default("Tell customers what you offer."),
  buttonLabel: z.string().trim().max(60).default("Get started"),
  buttonHref: z.string().trim().max(300).default("#"),
  align: z.enum(["left", "center"]).default("center"),
  background: z.string().trim().max(40).default("#0F0D33"),
});

export type HeroProps = z.infer<typeof heroPropsSchema>;

export const createProjectSchema = z.object({
  title: z.string().trim().min(1).max(120),
  projectType: projectTypeSchema.default("website"),
});

export const addHeroSchema = z.object({
  props: heroPropsSchema.partial().optional(),
});

export const updateSectionSchema = z.object({
  props: heroPropsSchema.partial(),
});

export const DEFAULT_HERO_PROPS: HeroProps = heroPropsSchema.parse({});
