import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { resolveStudioDesignAccess } from "@/lib/studio/design-access";
import { patchCommentSchema } from "@/lib/studio/design-comments";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string; commentId: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: designId, commentId } = await params;

  const access = await resolveStudioDesignAccess(supabase, { designId, userId: user.id });
  if (!access) {
    return NextResponse.json({ error: "Design not found." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = patchCommentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("studio_design_comments")
    .select("id, author_id")
    .eq("id", commentId)
    .eq("design_id", designId)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Comment not found." }, { status: 404 });
  }

  const isOwner = access.role === "owner";
  const isAuthor = existing.author_id === user.id;
  if (!isOwner && !isAuthor) {
    return NextResponse.json({ error: "Only the author or owner can update this comment." }, { status: 403 });
  }

  const patch: Record<string, unknown> = {};
  if (parsed.data.body !== undefined) {
    if (!isAuthor && !isOwner) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
    patch.body = parsed.data.body;
  }
  if (parsed.data.resolved !== undefined) {
    patch.resolved_at = parsed.data.resolved ? new Date().toISOString() : null;
  }

  const { data, error } = await supabase
    .from("studio_design_comments")
    .update(patch)
    .eq("id", commentId)
    .eq("design_id", designId)
    .select("id, design_id, author_id, body, anchor_x, anchor_y, resolved_at, created_at, updated_at")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Could not update comment." }, { status: 500 });
  }

  return NextResponse.json({ comment: data });
}

export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: designId, commentId } = await params;

  const access = await resolveStudioDesignAccess(supabase, { designId, userId: user.id });
  if (!access) {
    return NextResponse.json({ error: "Design not found." }, { status: 404 });
  }

  const { data: existing } = await supabase
    .from("studio_design_comments")
    .select("id, author_id")
    .eq("id", commentId)
    .eq("design_id", designId)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Comment not found." }, { status: 404 });
  }

  if (access.role !== "owner" && existing.author_id !== user.id) {
    return NextResponse.json({ error: "Only the author or owner can delete this comment." }, { status: 403 });
  }

  const { error } = await supabase
    .from("studio_design_comments")
    .delete()
    .eq("id", commentId)
    .eq("design_id", designId);

  if (error) {
    return NextResponse.json({ error: "Could not delete comment." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
