import { z } from "zod";

export const employmentTypeSchema = z.enum(["full_time", "part_time", "contract", "internship", "apprenticeship", "gig"]);
export const locationTypeSchema = z.enum(["onsite", "remote", "hybrid"]);
export const listingStatusSchema = z.enum(["draft", "published", "closed", "archived"]);
export const applicationStatusSchema = z.enum(["submitted", "reviewed", "accepted", "declined", "withdrawn"]);

/** No .default(...) on this shared base — see lib/work/items.ts for why. */
const jobListingFields = {
  title: z.string().trim().min(1).max(160),
  description: z.string().max(8000),
  requirements: z.string().max(4000),
  employmentType: employmentTypeSchema,
  locationType: locationTypeSchema,
  location: z.string().trim().max(160),
  status: listingStatusSchema,
};

export const createJobListingSchema = z.object(jobListingFields).extend({
  description: jobListingFields.description.default(""),
  requirements: jobListingFields.requirements.default(""),
  locationType: jobListingFields.locationType.default("onsite"),
  location: jobListingFields.location.default(""),
  status: jobListingFields.status.default("draft"),
});

export const updateJobListingSchema = z.object(jobListingFields).partial();

export function newJobListingPublicId(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  let out = "job_";
  for (let i = 0; i < 10; i += 1) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

export type JobListingRow = {
  id: string;
  business_id: string;
  public_id: string;
  title: string;
  description: string;
  requirements: string;
  employment_type: z.infer<typeof employmentTypeSchema>;
  location_type: z.infer<typeof locationTypeSchema>;
  location: string;
  status: z.infer<typeof listingStatusSchema>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type JobApplicationRow = {
  id: string;
  listing_id: string;
  business_id: string;
  applicant_user_id: string;
  cover_note: string;
  status: z.infer<typeof applicationStatusSchema>;
  decided_at: string | null;
  decided_by: string | null;
  created_at: string;
  updated_at: string;
};
