import { NextResponse } from "next/server";
import { requireUser, logCreate } from "@/lib/create/auth";
import { createServiceClient } from "@/lib/opportunity/admin";
import { siteCommunityPostBodySchema, siteCommunityModerationSchema } from "@/lib/create/site-community";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ subdomain: string; postId: string }> };

async function liveProject(subdomain: string) {
  const admin = createServiceClient();
  if (!admin) return { error: NextResponse.json({ error: "Service unavailable." }, { status: 503 }) };
  const { data: live } = await admin
    .from("deployments")
    .select("project_id")
    .eq("subdomain", subdomain)
    .eq("status", "live")
    .maybeSingle();
  if (!live?.project_id) {
    return { error: NextResponse.json({ error: "Site is not live." }, { status: 404 }) };
  }
  return { projectId: live.project_id as string };
}

/**
 * Edit your own post body, or (project owner only) hide/unhide any post on your community.
 * RLS is the real backstop — these checks just return the right error before hitting it.
 */
export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { user, supabase } = auth;
  const { subdomain: raw, postId } = await params;
  const subdomain = raw.trim().toLowerCase();
  const live = await liveProject(subdomain);
  if ("error" in live) return live.error;

  const { data: post } = await supabase
    .from("site_community_posts")
    .select("id, project_id, user_id")
    .eq("id", postId)
    .eq("project_id", live.projectId)
    .maybeSingle();
  if (!post) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const moderation = siteCommunityModerationSchema.safeParse(body);
  if (moderation.success) {
    const { data: ownerRow } = await supabase
      .from("projects")
      .select("id")
      .eq("id", live.projectId)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (!ownerRow) {
      return NextResponse.json({ error: "Only the project owner can moderate posts." }, { status: 403 });
    }
    const { error } = await supabase
      .from("site_community_posts")
      .update({ is_hidden: moderation.data.isHidden })
      .eq("id", postId);
    if (error) return NextResponse.json({ error: "Could not update post." }, { status: 500 });
    logCreate("site.community_post_moderated", { userId: user.id, projectId: live.projectId, postId, isHidden: moderation.data.isHidden });
    return NextResponse.json({ ok: true });
  }

  const edit = siteCommunityPostBodySchema.pick({ body: true }).safeParse(body);
  if (!edit.success) {
    return NextResponse.json({ error: "Invalid update." }, { status: 400 });
  }
  if (post.user_id !== user.id) {
    return NextResponse.json({ error: "You can only edit your own post." }, { status: 403 });
  }
  const { error } = await supabase
    .from("site_community_posts")
    .update({ body: edit.data.body })
    .eq("id", postId);
  if (error) return NextResponse.json({ error: "Could not save." }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/** Delete your own post, or (project owner) delete any post on your community. */
export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { user, supabase } = auth;
  const { subdomain: raw, postId } = await params;
  const subdomain = raw.trim().toLowerCase();
  const live = await liveProject(subdomain);
  if ("error" in live) return live.error;

  const { data: post } = await supabase
    .from("site_community_posts")
    .select("id, project_id, user_id")
    .eq("id", postId)
    .eq("project_id", live.projectId)
    .maybeSingle();
  if (!post) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  if (post.user_id !== user.id) {
    const { data: ownerRow } = await supabase
      .from("projects")
      .select("id")
      .eq("id", live.projectId)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (!ownerRow) {
      return NextResponse.json({ error: "You can only delete your own post." }, { status: 403 });
    }
  }

  const { error } = await supabase.from("site_community_posts").delete().eq("id", postId);
  if (error) return NextResponse.json({ error: "Could not delete." }, { status: 500 });
  logCreate("site.community_post_deleted", { userId: user.id, projectId: live.projectId, postId });
  return NextResponse.json({ ok: true });
}
