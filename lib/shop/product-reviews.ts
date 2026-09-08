import { z } from "zod";

export const reviewInputSchema = z.object({
  productId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(120).default(""),
  body: z.string().trim().max(2000).default(""),
  reviewerName: z.string().trim().min(1).max(80),
  reviewerEmail: z.string().trim().email().max(254).optional(),
});

export type ReviewRow = {
  id: string;
  project_id: string;
  product_id: string;
  rating: number;
  title: string;
  body: string;
  reviewer_name: string;
  reviewer_email: string | null;
  status: string;
  created_at: string;
};

export function mapReview(row: ReviewRow) {
  return {
    id: row.id,
    productId: row.product_id,
    rating: row.rating,
    title: row.title,
    body: row.body,
    reviewerName: row.reviewer_name,
    reviewerEmail: row.reviewer_email,
    status: row.status,
    createdAt: row.created_at,
  };
}

export function averageRating(reviews: { rating: number }[]): number | null {
  if (!reviews.length) return null;
  const sum = reviews.reduce((a, r) => a + r.rating, 0);
  return Math.round((sum / reviews.length) * 10) / 10;
}
