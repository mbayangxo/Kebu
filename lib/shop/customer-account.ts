import { z } from "zod";

export const shopCustomerProfileSchema = z.object({
  displayName: z.string().trim().max(80).default(""),
  phone: z.string().trim().max(24).default(""),
});

export type ShopCustomerProfileInput = z.infer<typeof shopCustomerProfileSchema>;

export function shopAccountPath(subdomain: string): string {
  return `/sites/${subdomain}/account`;
}
