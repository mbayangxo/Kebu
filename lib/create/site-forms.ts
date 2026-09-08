import { z } from "zod";

export const FORM_FIELD_TYPES = ["text", "email", "phone", "textarea", "select"] as const;

export const formFieldSchema = z.object({
  id: z.string().trim().min(1).max(40),
  label: z.string().trim().min(1).max(80),
  type: z.enum(FORM_FIELD_TYPES).default("text"),
  required: z.boolean().default(false),
  placeholder: z.string().trim().max(120).default(""),
  options: z.array(z.string().trim().max(60)).max(12).default([]),
});

export const siteFormSectionSchema = z.object({
  heading: z.string().trim().max(160).default("Contact us"),
  subheading: z.string().trim().max(240).default("Send a message — we reply on WhatsApp or email."),
  buttonLabel: z.string().trim().max(40).default("Send"),
  successMessage: z.string().trim().max(160).default("Thanks — we received your message."),
  notifyEmail: z.union([z.literal(""), z.string().trim().email().max(254)]).optional(),
  fields: z.array(formFieldSchema).min(1).max(12).default([
    { id: "name", label: "Your name", type: "text", required: true, placeholder: "", options: [] },
    { id: "email", label: "Email", type: "email", required: false, placeholder: "", options: [] },
    { id: "message", label: "Message", type: "textarea", required: true, placeholder: "", options: [] },
  ]),
  hidden: z.boolean().optional(),
});

export type SiteFormField = z.infer<typeof formFieldSchema>;
export type SiteFormSectionProps = z.infer<typeof siteFormSectionSchema>;

export const publicFormSubmitSchema = z.object({
  values: z.record(z.string(), z.string().trim().max(2000)),
  submitterName: z.string().trim().max(80).optional(),
  submitterEmail: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().trim().email().max(254).optional(),
  ),
  submitterPhone: z.string().trim().max(24).optional(),
});

export function validateFormPayload(
  fields: SiteFormField[],
  values: Record<string, string>,
): { ok: true; cleaned: Record<string, string> } | { ok: false; error: string } {
  const cleaned: Record<string, string> = {};
  for (const field of fields) {
    const raw = values[field.id] ?? "";
    const val = raw.trim();
    if (field.required && !val) {
      return { ok: false, error: `${field.label} is required.` };
    }
    if (val && field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      return { ok: false, error: `${field.label} must be a valid email.` };
    }
    if (val && field.type === "select" && field.options.length && !field.options.includes(val)) {
      return { ok: false, error: `Invalid choice for ${field.label}.` };
    }
    if (val) cleaned[field.id] = val.slice(0, 2000);
  }
  return { ok: true, cleaned };
}
