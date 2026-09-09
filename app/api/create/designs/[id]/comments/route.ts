import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { resolveStudioDesignAccess } from "@/lib/studio/design-access";
import { createCommentSchema } from "@/lib/studio/design-comments";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: designId } = await params;

  const access = await resolveStudioDesignAccess(supabase, { designId, userId: user.id });
  if (!access) {
    return NextResponse.json({ error: "Design not found." }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("studio_design_comments")
    .select("id, design_id, author_id, body, anchor_x, anchor_y, resolved_at, created_at, updated_at")
    .eq("design_id", designId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    const missing = error.message?.includes("does not exist");
    return NextResponse.json(
      {
        error: missing
          ? "Design comments table missing. Apply migration 079."
          : "Could not load comments.",
      },
      { status: missing ? 503 : 500 },
    );
  }

  return NextResponse.json({ comments: data ?? [], access });
}

export async function POST(req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: designId } = await params;

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

  const parsed = createCommentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Comment text required (1–2000 chars)." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("studio_design_comments")
    .insert({
      design_id: designId,
      author_id: user.id,
      body: parsed.data.body,
      anchor_x: parsed.data.anchorX ?? null,
      anchor_y: parsed.data.anchorY ?? null,
    })
    .select("id, design_id, author_id, body, anchor_x, anchor_y, resolved_at, created_at, updated_at")
    .single();

  if (error || !data) {
    const missing = error?.message?.includes("does not exist");
    return NextResponse.json(
      {
        error: missing
          ? "Design comments table missing. Apply migration 079."
          : "Could not post comment.",
      },
      { status: missing ? 503 : 500 },
    );
  }

  return NextResponse.json({ comment: data }, { status: 201 });
}
