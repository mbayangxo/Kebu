import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";
import { parseStudioComposition, studioCompositionSchema } from "@/lib/studio/composition";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  composition: studioCompositionSchema.optional(),
  editMode: z.enum(["quick_edit", "smart_edit", "full_timeline"]).optional(),
});

export async function GET(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id } = await params;

  const { data: project, error } = await supabase
    .from("studio_video_projects")
    .select("id, title, width, height, frame_rate, edit_mode, composition, owner_id, created_at, updated_at")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();

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
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id } = await params;

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

  const { data: project, error } = await supabase
    .from("studio_video_projects")
    .update(patch)
    .eq("id", id)
    .eq("owner_id", user.id)
    .select("id, title, width, height, frame_rate, edit_mode, composition, updated_at")
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
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id } = await params;

  const { error } = await supabase
    .from("studio_video_projects")
    .delete()
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error) {
    return NextResponse.json({ error: "Could not delete project." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
