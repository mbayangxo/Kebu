import { z } from "zod";

export const companyReviewSchema = z.object({
  applicationId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  body: z.string().max(2000).default(""),
  isAnonymous: z.boolean().default(false),
});

export type CompanyReviewRow = {
  id: string;
  business_id: string;
  reviewer_user_id: string;
  application_id: string;
  rating: number;
  body: string;
  is_anonymous: boolean;
  status: "visible" | "removed";
  created_at: string;
  updated_at: string;
};

export function summarizeRatings(rows: Array<{ rating: number }>): { average: number | null; count: number } {
  if (rows.length === 0) return { average: null, count: 0 };
  const total = rows.reduce((sum, row) => sum + row.rating, 0);
  return { average: Math.round((total / rows.length) * 10) / 10, count: rows.length };
}
