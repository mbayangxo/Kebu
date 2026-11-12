import { NextResponse } from "next/server";
import { requireUser, logCreate } from "@/lib/create/auth";
import { createServiceClient } from "@/lib/opportunity/admin";
import { siteCommunityPostBodySchema, threadCommunityPosts } from "@/lib/create/site-community";
import { shopOrderRateLimit } from "@/lib/api-guard";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ subdomain: string }> };

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

/** Signed-in member: read this site's community board (RLS hides other projects + hidden posts from non-owners). */
export async function GET(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { user, supabase } = auth;
  const { subdomain: raw } = await params;
  const subdomain = raw.trim().toLowerCase();
  const live = await liveProject(subdomain);
  if ("error" in live) return live.error;

  const { data: rows, error } = await supabase
    .from("site_community_posts")
    .select("id, parent_id, role, display_name, body, is_hidden, user_id, created_at")
    .eq("project_id", live.projectId)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    return NextResponse.json(
      {
        error: error.message?.includes("does not exist")
          ? "Community needs a migration. Apply 20261103120000_site_fan_community.sql."
          : "Could not load the community board.",
      },
      { status: 500 },
    );
  }

  const isOwner = await supabase
    .from("projects")
    .select("id")
    .eq("id", live.projectId)
    .eq("owner_id", user.id)
    .maybeSingle();

  return NextResponse.json({
    posts: threadCommunityPosts(rows ?? [], user.id),
    isOwner: Boolean(isOwner.data),
  });
}

/** Signed-in member (or the project owner, posting as the creator): create a post or reply. */
export async function POST(req: Request, { params }: Params) {
  const limited = shopOrderRateLimit(req);
  if (limited) return limited;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { user, supabase } = auth;
  const { subdomain: raw } = await params;
  const subdomain = raw.trim().toLowerCase();
  const live = await liveProject(subdomain);
  if ("error" in live) return live.error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = siteCommunityPostBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid post." }, { status: 400 });
  }

  if (parsed.data.parentId) {
    const { data: parent } = await supabase
      .from("site_community_posts")
      .select("id, project_id, parent_id")
      .eq("id", parsed.data.parentId)
      .maybeSingle();
    if (!parent || parent.project_id !== live.projectId || parent.parent_id) {
      return NextResponse.json({ error: "Can only reply to a top-level post on this community." }, { status: 400 });
    }
  }

  const { data: ownerRow } = await supabase
    .from("projects")
    .select("id")
    .eq("id", live.projectId)
    .eq("owner_id", user.id)
    .maybeSingle();
  const isOwner = Boolean(ownerRow);

  const fallbackName = isOwner ? "Creator" : (user.email?.split("@")[0] ?? "Fan");
  const displayName = parsed.data.displayName?.trim() || fallbackName;

  const { data: inserted, error } = await supabase
    .from("site_community_posts")
    .insert({
      project_id: live.projectId,
      user_id: user.id,
      parent_id: parsed.data.parentId ?? null,
      role: isOwner ? "creator" : "member",
      display_name: displayName.slice(0, 80),
      body: parsed.data.body,
    })
    .select("id, parent_id, role, display_name, body, is_hidden, user_id, created_at")
    .single();

  if (error || !inserted) {
    return NextResponse.json(
      {
        error: error?.message?.includes("does not exist")
          ? "Community needs a migration. Apply 20261103120000_site_fan_community.sql."
          : "Could not post.",
      },
      { status: 500 },
    );
  }

  logCreate("site.community_post_created", { userId: user.id, projectId: live.projectId, role: inserted.role });
  return NextResponse.json({
    post: {
      id: inserted.id,
      parentId: inserted.parent_id,
      role: inserted.role,
      displayName: inserted.display_name,
      body: inserted.body,
      isHidden: inserted.is_hidden,
      isMine: true,
      createdAt: inserted.created_at,
    },
  });
}
