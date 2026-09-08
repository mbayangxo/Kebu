import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import {
  assertProjectEditorAccess,
  dbForProjectAccess,
} from "@/lib/create/project-access";
import {
  blogPostDbPayload,
  blogPostInputSchema,
  mapBlogPostRow,
  type BlogPostRow,
} from "@/lib/create/site-blog";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: projectId } = await params;

  const access = await assertProjectEditorAccess(supabase, {
    userId: user.id,
    email: user.email,
    projectId,
    action: "blog-posts.list",
  });
  if (!access) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  const db = dbForProjectAccess(supabase, access.via);
  const { data, error } = await db
    .from("project_blog_posts")
    .select("*")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true })
    .order("published_at", { ascending: false, nullsFirst: false });

  if (error) {
    return NextResponse.json(
      { error: error.message.includes("project_blog_posts") ? "Apply migration 066_remaining_slices.sql." : "Could not load posts." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    posts: ((data ?? []) as BlogPostRow[]).map(mapBlogPostRow),
  });
}

export async function POST(req: Request, { params }: Params) {
  const limited = builderRateLimit(req);
  if (limited) return limited;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: projectId } = await params;

  const access = await assertProjectEditorAccess(supabase, {
    userId: user.id,
    email: user.email,
    projectId,
    action: "blog-posts.create",
  });
  if (!access) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = blogPostInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const db = dbForProjectAccess(supabase, access.via);
  const payload = blogPostDbPayload(parsed.data);

  const { data, error } = await db
    .from("project_blog_posts")
    .insert({ ...payload, project_id: projectId })
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Could not create post." }, { status: 500 });
  }

  return NextResponse.json({ post: mapBlogPostRow(data as BlogPostRow) }, { status: 201 });
}

const patchSchema = blogPostInputSchema.partial();

export async function PATCH(req: Request, { params }: Params) {
  const limited = builderRateLimit(req);
  if (limited) return limited;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: projectId } = await params;

  const access = await assertProjectEditorAccess(supabase, {
    userId: user.id,
    email: user.email,
    projectId,
    action: "blog-posts.patch",
  });
  if (!access) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const envelope = z.object({ postId: z.string().uuid(), patch: patchSchema }).safeParse(body);
  if (!envelope.success) {
    return NextResponse.json({ error: "postId and patch required." }, { status: 400 });
  }

  const db = dbForProjectAccess(supabase, access.via);
  const update: Record<string, unknown> = {};
  const p = envelope.data.patch;
  if (p.slug) update.slug = p.slug;
  if (p.title) update.title = p.title;
  if (p.excerpt !== undefined) update.excerpt = p.excerpt;
  if (p.body !== undefined) update.body = p.body;
  if (p.coverUrl !== undefined) update.cover_url = p.coverUrl;
  if (p.authorName !== undefined) update.author_name = p.authorName;
  if (p.status) {
    update.status = p.status;
    update.published_at = p.status === "published" ? new Date().toISOString() : null;
  }
  if (typeof p.sortOrder === "number") update.sort_order = p.sortOrder;

  const { data, error } = await db
    .from("project_blog_posts")
    .update(update)
    .eq("id", envelope.data.postId)
    .eq("project_id", projectId)
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Could not update post." }, { status: 500 });
  }

  return NextResponse.json({ post: mapBlogPostRow(data as BlogPostRow) });
}

export async function DELETE(req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: projectId } = await params;

  const access = await assertProjectEditorAccess(supabase, {
    userId: user.id,
    email: user.email,
    projectId,
    action: "blog-posts.delete",
  });
  if (!access) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = z.object({ postId: z.string().uuid() }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "postId required." }, { status: 400 });

  const db = dbForProjectAccess(supabase, access.via);
  const { error } = await db
    .from("project_blog_posts")
    .delete()
    .eq("id", parsed.data.postId)
    .eq("project_id", projectId);

  if (error) {
    return NextResponse.json({ error: "Could not delete post." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
