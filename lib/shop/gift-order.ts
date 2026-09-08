import { z } from "zod";

export function newGiftPublicId(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  let out = "gift_";
  for (let i = 0; i < 10; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

export function giftPublicPath(publicId: string): string {
  return `/g/${encodeURIComponent(publicId)}`;
}

/** Shared gift fields for single-item + cart checkout. */
export const shopGiftFieldsSchema = z
  .object({
    isGift: z.boolean().optional().default(false),
    recipientName: z.string().trim().max(80).optional().default(""),
    recipientPhone: z.string().trim().max(24).optional().default(""),
    recipientEmail: z.preprocess(
      (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
      z.string().trim().email().max(254).optional(),
    ),
    giftMessage: z.string().trim().max(400).optional().default(""),
  })
  .superRefine((data, ctx) => {
    if (!data.isGift) return;
    if (!data.recipientName || data.recipientName.length < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Recipient name is required for a gift order.",
        path: ["recipientName"],
      });
    }
    if (!data.recipientPhone || data.recipientPhone.length < 8) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Recipient phone is required for a gift order.",
        path: ["recipientPhone"],
      });
    }
  });

export type ShopGiftFields = z.infer<typeof shopGiftFieldsSchema>;

export function giftColumnsForInsert(gift: ShopGiftFields): Record<string, unknown> {
  if (!gift.isGift) {
    return { is_gift: false };
  }
  return {
    is_gift: true,
    recipient_name: gift.recipientName,
    recipient_phone: gift.recipientPhone,
    recipient_email: gift.recipientEmail ?? null,
    gift_message: gift.giftMessage || "",
    gift_public_id: newGiftPublicId(),
  };
}

export function giftWhatsAppSuffix(gift: {
  isGift?: boolean;
  recipientName?: string;
  recipientPhone?: string;
  giftMessage?: string;
}): string {
  if (!gift.isGift || !gift.recipientName) return "";
  const msg = gift.giftMessage?.trim() ? `\nGift note: ${gift.giftMessage.trim()}` : "";
  return `\nGift for: ${gift.recipientName} (${gift.recipientPhone ?? ""})${msg}`;
}
