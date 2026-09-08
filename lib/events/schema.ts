import { z } from "zod";

export const eventModeSchema = z.enum(["rsvp", "ticketed"]);
export const eventStatusSchema = z.enum(["draft", "published", "cancelled", "completed"]);

export const createBusinessEventSchema = z.object({
  title: z.string().trim().min(1).max(160),
  summary: z.string().trim().max(800).optional().default(""),
  venue: z.string().trim().max(200).optional().default(""),
  city: z.string().trim().max(120).optional().default(""),
  countryCode: z.string().trim().max(8).optional().default(""),
  startsAt: z.string().datetime({ offset: true }).or(z.string().min(8).max(40)),
  endsAt: z.string().datetime({ offset: true }).or(z.string().min(8).max(40)).optional().nullable(),
  timezone: z.string().trim().max(64).optional().default("Africa/Dakar"),
  capacity: z.number().int().positive().max(100_000).optional().nullable(),
  mode: eventModeSchema.optional().default("rsvp"),
  status: eventStatusSchema.optional().default("draft"),
  projectId: z.string().uuid().optional().nullable(),
  whatsappPhone: z.string().trim().max(24).optional().default(""),
  tickets: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(80),
        priceXof: z.number().int().min(0).max(50_000_000),
        capacity: z.number().int().positive().max(100_000).optional().nullable(),
      }),
    )
    .max(12)
    .optional()
    .default([]),
});

export const updateBusinessEventSchema = createBusinessEventSchema.partial().extend({
  status: eventStatusSchema.optional(),
});

export const eventRegisterSchema = z.object({
  guestName: z.string().trim().min(1).max(80),
  guestPhone: z.string().trim().min(5).max(24),
  guestEmail: z.string().trim().email().max(254).optional(),
  quantity: z.number().int().min(1).max(20).optional().default(1),
  ticketTypeId: z.string().uuid().optional().nullable(),
  note: z.string().trim().max(400).optional().default(""),
  /** Set by offline sync flush — never trusted for payment. */
  channel: z.enum(["web", "offline_sync"]).optional().default("web"),
});

export function newEventPublicId(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  let out = "evt_";
  for (let i = 0; i < 10; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

export function eventPublicPath(publicId: string): string {
  return `/e/${encodeURIComponent(publicId)}`;
}
