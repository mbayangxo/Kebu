import { z } from "zod";

export function canManageRetailLocations(role: string | null | undefined) {
  return role === "founder" || role === "administrator" || role === "store_manager";
}

export const locationInput = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9][A-Z0-9-]{0,19}$/),
  name: z.string().trim().min(1).max(100),
  address: z.string().trim().min(1).max(240),
  timezone: z.string().trim().min(1).max(64).refine((value) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: value });
      return !/^[+-]/.test(value);
    } catch {
      return false;
    }
  }),
});
