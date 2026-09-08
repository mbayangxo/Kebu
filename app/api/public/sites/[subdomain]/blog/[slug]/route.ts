import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/opportunity/admin";
import { mapBlogPostRow, type BlogPostRow } from "@/lib/create/site-blog";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ subdomain: string; slug: string }> };

/** Public single blog post. */
export async function GET(_req: Request, { params }: Params) {
  const { subdomain, slug } = await params;
  const admin = createServiceClient();
  if (!admin) return NextResponse.json({ error: "Unavailable." }, { status: 503 });

  const { data: project } = await admin
    .from("projects")
    .select("id, status")
    .eq("subdomain", subdomain)
    .maybeSingle();

  if (!project) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const { data: deployment } = await admin
    .from("deployments")
    .select("id")
    .eq("project_id", project.id)
    .eq("status", "live")
    .maybeSingle();

  if (!deployment && project.status !== "published") {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const { data, error } = await admin
    .from("project_blog_posts")
    .select("*")
    .eq("project_id", project.id)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  return NextResponse.json({ post: mapBlogPostRow(data as BlogPostRow) });
}
