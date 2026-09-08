import { z } from "zod";

export const blogPostStatusSchema = z.enum(["draft", "published"]);

export const blogPostInputSchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .min(1)
    .max(80),
  title: z.string().trim().min(1).max(200),
  excerpt: z.string().trim().max(500).default(""),
  body: z.string().trim().max(50000).default(""),
  coverUrl: z.string().trim().max(500).default(""),
  authorName: z.string().trim().max(80).default(""),
  status: blogPostStatusSchema.default("draft"),
  sortOrder: z.number().int().min(0).optional(),
});

export type BlogPostInput = z.infer<typeof blogPostInputSchema>;

export type BlogPostRow = {
  id: string;
  project_id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  cover_url: string;
  author_name: string;
  status: string;
  published_at: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export function slugifyBlogTitle(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export function mapBlogPostRow(row: BlogPostRow) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    body: row.body,
    coverUrl: row.cover_url,
    authorName: row.author_name,
    status: row.status,
    publishedAt: row.published_at,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function blogPostDbPayload(input: BlogPostInput) {
  const now = new Date().toISOString();
  return {
    slug: input.slug,
    title: input.title,
    excerpt: input.excerpt,
    body: input.body,
    cover_url: input.coverUrl,
    author_name: input.authorName,
    status: input.status,
    published_at: input.status === "published" ? now : null,
    sort_order: input.sortOrder ?? 0,
  };
}
