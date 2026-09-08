import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/opportunity/admin";
import { mapBlogPostRow, type BlogPostRow } from "@/lib/create/site-blog";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ subdomain: string }> };

async function resolveLiveProject(subdomain: string) {
  const admin = createServiceClient();
  if (!admin) return null;

  const { data: project } = await admin
    .from("projects")
    .select("id, subdomain, status")
    .eq("subdomain", subdomain)
    .maybeSingle();

  if (!project) return null;

  const { data: deployment } = await admin
    .from("deployments")
    .select("id")
    .eq("project_id", project.id)
    .eq("status", "live")
    .maybeSingle();

  if (!deployment && project.status !== "published") return null;

  return { admin, projectId: project.id as string };
}

/** Public blog index for a published site. */
export async function GET(_req: Request, { params }: Params) {
  const { subdomain } = await params;
  const gate = await resolveLiveProject(subdomain);
  if (!gate) return NextResponse.json({ error: "Site not found." }, { status: 404 });

  const { data, error } = await gate.admin
    .from("project_blog_posts")
    .select("*")
    .eq("project_id", gate.projectId)
    .eq("status", "published")
    .order("published_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Could not load blog." }, { status: 500 });
  }

  return NextResponse.json({
    posts: ((data ?? []) as BlogPostRow[]).map(mapBlogPostRow),
  });
}
