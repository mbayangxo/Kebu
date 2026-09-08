import { z } from "zod";

export function newOpsPublicId(prefix: "inv" | "ctr"): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  let out = `${prefix}_`;
  for (let i = 0; i < 10; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

export const invoiceLineSchema = z.object({
  description: z.string().trim().min(1).max(400),
  quantity: z.number().int().min(1).max(100000).default(1),
  unitAmountXof: z.number().int().min(0).max(50_000_000),
});

export const createInvoiceSchema = z.object({
  clientName: z.string().trim().min(1).max(160),
  clientEmail: z.string().trim().email().max(254).optional().or(z.literal("")),
  clientPhone: z.string().trim().max(24).optional().default(""),
  notes: z.string().trim().max(2000).optional().default(""),
  dueAt: z.string().optional().nullable(),
  lines: z.array(invoiceLineSchema).min(1).max(40),
});

export const createContractSchema = z.object({
  title: z.string().trim().min(1).max(200),
  counterpartyName: z.string().trim().min(1).max(160),
  counterpartyEmail: z.string().trim().email().max(254).optional().or(z.literal("")),
  bodyText: z.string().trim().min(1).max(50000),
});

export const acceptContractSchema = z.object({
  acceptedName: z.string().trim().min(1).max(120),
});

export const launchChecklistItemSchema = z.object({
  id: z.string().min(1).max(40),
  label: z.string().trim().min(1).max(200),
  done: z.boolean(),
});

export const upsertLaunchPlanSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  status: z.enum(["active", "done", "archived"]).optional(),
  checklist: z.array(launchChecklistItemSchema).max(40).optional(),
  popupHeading: z.string().trim().max(120).optional(),
  popupBody: z.string().trim().max(800).optional(),
  popupCta: z.string().trim().max(60).optional(),
});

export function invoicePublicPath(publicId: string): string {
  return `/i/${encodeURIComponent(publicId)}`;
}

export function contractPublicPath(publicId: string): string {
  return `/c/${encodeURIComponent(publicId)}`;
}

export function defaultAgencyLaunchChecklist(): z.infer<typeof launchChecklistItemSchema>[] {
  return [
    { id: "site", label: "Publish live site / landing page", done: false },
    { id: "popup", label: "Add email-popup section for waitlist / launch", done: false },
    { id: "press", label: "Prepare press kit + press list (agency)", done: false },
    { id: "assets", label: "Posters / banners / reel cuts ready", done: false },
    { id: "event", label: "Create RSVP or ticketed launch event (optional)", done: false },
    { id: "invoice", label: "Invoice partners / brands if paid work", done: false },
    { id: "contract", label: "Send talent / vendor contracts", done: false },
  ];
}

export function sumInvoiceLines(
  lines: { quantity: number; unitAmountXof: number }[],
): number {
  return lines.reduce((s, l) => s + l.quantity * l.unitAmountXof, 0);
}
