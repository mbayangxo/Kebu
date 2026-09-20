import { assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";
import { loadActiveWorkspaceScope } from "@/lib/account/server-workspace";
import { parseStudioComposition, studioCompositionSchema } from "@/lib/studio/composition";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  composition: studioCompositionSchema.optional(),
  editMode: z.enum(["quick_edit", "smart_edit", "full_timeline"]).optional(),\n  /** Optimistic concurrency token: prevents silent cross-tab/device overwrites. */\n  expectedUpdatedAt: z.string().datetime().optional(),
});

export async function GET(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id } = await params;
  const workspace = await loadActiveWorkspaceScope(supabase, user.id);

  let query = supabase
    .from("studio_video_projects")
    .select("id, title, width, height, frame_rate, edit_mode, composition, owner_id, business_id, source_design_id, created_at, updated_at")
    .eq("id", id);
  query = workspace.activeBusinessId
    ? query.eq("business_id", workspace.activeBusinessId)
    : query.is("business_id", null);
  const { data: project, error } = await query.maybeSingle();

  if (error || !project) {
    return NextResponse.json(
      {
        error: error?.message?.includes("does not exist")
          ? "Video projects missing. Apply migration 075."
          : "Project not found.",
      },
      { status: error?.message?.includes("does not exist") ? 503 : 404 },
    );
  }

  let composition;
  try {
    composition = parseStudioComposition(project.composition);
  } catch {
    return NextResponse.json({ error: "Project composition is corrupt." }, { status: 500 });
  }

  return NextResponse.json({
    project: { ...project, composition },
  });
}

export async function PATCH(req: Request, { params }: Params) {
  const originBlocked = assertSameOriginMutation(req);
  if (originBlocked) return originBlocked;
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id } = await params;
  const workspace = await loadActiveWorkspaceScope(supabase, user.id);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid update." }, { status: 400 });
  }

  if (parsed.data.expectedUpdatedAt) {
    let currentQuery = supabase
      .from("studio_video_projects")
      .select("updated_at")
      .eq("id", id);
    currentQuery = workspace.activeBusinessId
      ? currentQuery.eq("business_id", workspace.activeBusinessId)
      : currentQuery.is("business_id", null);
    const { data: current } = await currentQuery.maybeSingle();
    if (!current) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }
    if (
      current.updated_at &&
      new Date(current.updated_at).toISOString() !== new Date(parsed.data.expectedUpdatedAt).toISOString()
    ) {
      return NextResponse.json(
        {
          error: "This video changed somewhere else. Your local edit was kept; review the newer server version before overwriting it.",
          code: "studio_video_version_conflict",
          serverUpdatedAt: current.updated_at,
        },
        { status: 409 },
      );
    }
  }

  const patch: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) patch.title = parsed.data.title;
  if (parsed.data.editMode !== undefined) patch.edit_mode = parsed.data.editMode;
  if (parsed.data.composition) {
    const c = parsed.data.composition;
    patch.composition = c;
    patch.width = c.width;
    patch.height = c.height;
    patch.frame_rate = c.frameRate;
    patch.edit_mode = c.editMode;
  }

  if (!Object.keys(patch).length) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  let updateQuery = supabase
    .from("studio_video_projects")
    .update(patch)
    .eq("id", id);
  updateQuery = workspace.activeBusinessId
    ? updateQuery.eq("business_id", workspace.activeBusinessId)
    : updateQuery.is("business_id", null);
  const { data: project, error } = await updateQuery
    .select("id, title, width, height, frame_rate, edit_mode, composition, business_id, source_design_id, updated_at")
    .maybeSingle();

  if (error || !project) {
    return NextResponse.json({ error: "Could not save project." }, { status: 500 });
  }

  return NextResponse.json({
    project: {
      ...project,
      composition: parseStudioComposition(project.composition),
    },
  });
}

export async function DELETE(_req: Request, { params }: Params) {
  const originBlocked = assertSameOriginMutation(_req);
  if (originBlocked) return originBlocked;
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id } = await params;
  const workspace = await loadActiveWorkspaceScope(supabase, user.id);

  let deleteQuery = supabase
    .from("studio_video_projects")
    .delete()
    .eq("id", id);
  deleteQuery = workspace.activeBusinessId
    ? deleteQuery.eq("business_id", workspace.activeBusinessId)
    : deleteQuery.is("business_id", null);
  const { error } = await deleteQuery;

  if (error) {
    return NextResponse.json({ error: "Could not delete project." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
