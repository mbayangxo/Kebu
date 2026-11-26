import { z } from "zod";

export const workExperienceEntrySchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().max(2000).default(""),
  kind: z.enum(["formal", "informal"]).default("informal"),
  startAt: z.string().datetime().nullable().optional(),
  endAt: z.string().datetime().nullable().optional(),
});
export type WorkExperienceEntry = z.infer<typeof workExperienceEntrySchema>;

const availabilitySchema = z.enum(["open", "limited", "unavailable"]);
export type WorkerAvailability = z.infer<typeof availabilitySchema>;

/**
 * No .default(...) on this shared base — see lib/work/items.ts for why:
 * zod's .default() survives .partial(), so a schema built from
 * base.partial() would silently reintroduce defaults on every field an
 * update omitted. Defaults for a brand-new profile are applied explicitly
 * by the route when it lazily creates one, never through this shape.
 */
const workerProfileFields = {
  headline: z.string().trim().max(160).nullable(),
  bio: z.string().max(4000),
  skills: z.array(z.string().trim().min(1).max(60)).max(40),
  languages: z.array(z.string().trim().min(1).max(40)).max(20),
  experience: z.array(workExperienceEntrySchema).max(40),
  location: z.string().trim().max(160).nullable(),
  countryCode: z.string().regex(/^[A-Z]{2}$/).nullable(),
  remoteEligible: z.boolean(),
  availability: availabilitySchema.nullable(),
  isDiscoverable: z.boolean(),
};

export const updateWorkerProfileSchema = z.object(workerProfileFields).partial();

export type WorkerProfileRow = {
  user_id: string;
  headline: string | null;
  bio: string;
  skills: string[];
  languages: string[];
  experience: WorkExperienceEntry[];
  location: string | null;
  country_code: string | null;
  remote_eligible: boolean;
  availability: WorkerAvailability | null;
  is_discoverable: boolean;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
};

export function rowToWorkerProfile(row: WorkerProfileRow) {
  return {
    headline: row.headline,
    bio: row.bio,
    skills: row.skills,
    languages: row.languages,
    experience: row.experience,
    location: row.location,
    countryCode: row.country_code,
    remoteEligible: row.remote_eligible,
    availability: row.availability,
    isDiscoverable: row.is_discoverable,
    // Self-reported vs. verified is a real, visible distinction, not just
    // a schema column: nothing in the product sets verified_at today, so
    // this is always null — surfaced honestly rather than inventing a
    // badge/score the moment the column exists.
    verifiedAt: row.verified_at,
    updatedAt: row.updated_at,
  };
}
