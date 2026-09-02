import { z } from "zod";
import type { AfriqueEligibilityStatus } from "@/lib/afrique-id/types";

export const meProfilePatchSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  residenceCountry: z.string().trim().max(80).optional().nullable(),
  businessStage: z.string().trim().max(40).optional().nullable(),
});

export type MeAfriqueIdSummary = {
  publicId: string;
  eligibilityStatus: AfriqueEligibilityStatus;
  eligibilityLabel: string;
  publicProfilePath: string;
};

export type MeProfile = {
  id: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
  residenceCountry: string | null;
  businessStage: string | null;
  onboardingComplete: boolean;
  afriqueId: MeAfriqueIdSummary | null;
};

export function rowToMeProfile(row: {
  id: string;
  email: string | null;
  name: string | null;
  avatar_url?: string | null;
  residence_country?: string | null;
  business_stage?: string | null;
  onboarding_complete?: boolean | null;
}): MeProfile {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    avatarUrl: row.avatar_url ?? null,
    residenceCountry: row.residence_country ?? null,
    businessStage: row.business_stage ?? null,
    onboardingComplete: Boolean(row.onboarding_complete),
    afriqueId: null,
  };
}

export function displayFirstName(name: string | null | undefined, email: string | null | undefined): string {
  const n = name?.trim();
  if (n) return n.split(/\s+/)[0] ?? n;
  if (email?.includes("@")) return email.split("@")[0] ?? "there";
  return "there";
}
