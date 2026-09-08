import { z } from "zod";

export const shopMessageBodySchema = z.object({
  body: z.string().trim().min(1).max(2000),
  subject: z.string().trim().max(120).optional().default(""),
});

export type ShopMessageBody = z.infer<typeof shopMessageBodySchema>;
