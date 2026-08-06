import { z } from "zod";

export const AFRICAN_COUNTRY_CODES = [
  "DZ","AO","BJ","BW","BF","BI","CV","CM","CF","TD","KM","CG","CD","CI","DJ","EG",
  "GQ","ER","SZ","ET","GA","GM","GH","GN","GW","KE","LS","LR","LY","MG","MW","ML",
  "MR","MU","MA","MZ","NA","NE","NG","RW","ST","SN","SC","SL","SO","ZA","SS","SD",
  "TZ","TG","TN","UG","ZM","ZW",
] as const;

export const businessCategorySchema = z.enum([
  "agriculture",
  "fashion",
  "beauty",
  "food",
  "retail",
  "technology",
  "education",
  "services",
  "tourism",
  "construction",
  "manufacturing",
  "health",
  "other",
]);

export const createDraftBusinessSchema = z.object({
  legalName: z.string().trim().min(1).max(160),
  tradingName: z.string().trim().min(1).max(160).optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
  countryCode: z
    .string()
    .trim()
    .toUpperCase()
    .refine((c) => (AFRICAN_COUNTRY_CODES as readonly string[]).includes(c), {
      message: "Country must be a supported African country code",
    }),
  category: businessCategorySchema,
  description: z.string().trim().min(1).max(1000),
});

export type CreateDraftBusinessInput = z.infer<typeof createDraftBusinessSchema>;

export const SAFE_BUSINESS_FIELDS =
  "id, public_kebu_id, legal_name, trading_name, country_code, category, description, lifecycle_status, verification_level, created_at, updated_at" as const;
