import { z } from "zod";
import { isValidLegalStructure, isValidRegion, getCountryModule } from "@/lib/kebu-id/countries";
import { businessCategorySchema, AFRICAN_COUNTRY_CODES } from "@/lib/kebu-id/schemas";

export const registerBusinessSchema = z
  .object({
    legalName: z.string().trim().min(1).max(160),
    tradingName: z
      .string()
      .trim()
      .min(1)
      .max(160)
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : undefined)),
    countryCode: z
      .string()
      .trim()
      .toUpperCase()
      .refine((c) => (AFRICAN_COUNTRY_CODES as readonly string[]).includes(c), {
        message: "Country must be a supported African country code",
      }),
    region: z.string().trim().min(1).max(120),
    category: businessCategorySchema,
    description: z.string().trim().min(20).max(1000),
    businessEmail: z.string().trim().email().max(254),
    businessPhone: z.string().trim().min(5).max(40),
    website: z
      .string()
      .trim()
      .url()
      .max(300)
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : undefined)),
    legalStructure: z.string().trim().min(1).max(80),
    founderName: z.string().trim().min(1).max(160),
    founderEmail: z.string().trim().email().max(254),
    ownershipPercent: z.coerce.number().gt(0).lte(100),
  })
  .superRefine((data, ctx) => {
    const mod = getCountryModule(data.countryCode);
    if (!mod) {
      ctx.addIssue({
        code: "custom",
        path: ["countryCode"],
        message: "Business registration module not available for this country yet. Senegal (SN) is supported in this slice.",
      });
      return;
    }
    if (!isValidLegalStructure(data.countryCode, data.legalStructure)) {
      ctx.addIssue({
        code: "custom",
        path: ["legalStructure"],
        message: "Legal structure is not valid for the selected country module.",
      });
    }
    if (!isValidRegion(data.countryCode, data.region)) {
      ctx.addIssue({
        code: "custom",
        path: ["region"],
        message: "Region is not valid for the selected country module.",
      });
    }
  });

export type RegisterBusinessInput = z.infer<typeof registerBusinessSchema>;

export const SAFE_REGISTRATION_FIELDS =
  "id, public_kebu_id, legal_name, trading_name, country_code, region, category, description, business_email, business_phone, website, legal_structure, logo_url, registration_status, lifecycle_status, verification_level, created_at, updated_at" as const;
