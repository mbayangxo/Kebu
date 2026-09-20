import { NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";
import { loadActiveWorkspaceScope } from "@/lib/account/server-workspace";
import { requireUser } from "@/lib/create/auth";
import { parseCanvasDocument } from "@/lib/studio/canvas-document";
import { parseStudioComposition } from "@/lib/studio/composition";
import { syncSourceDesignIntoComposition } from "@/lib/studio/source-design-sync";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  expectedUpdatedAt: z.string().datetime().optional(),
});

export async function POST(req: Request, { params }: Params) {
  const originBlocked = assertSameOriginMutation(req);
  if (originBlocked) return originBlocked;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id } = await params;
  const workspace = await loadActiveWorkspaceScope(supabase, user.id);

  let raw: unknown = {};
  try {
    raw = await req.json();
  } catch {
    raw = {};
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Invalid refresh request." }, { status: 400 });

  let projectQuery = supabase
    .from("studio_video_projects")
    .select("id, composition, source_design_id, business_id, updated_at")
    .eq("id", id);
  projectQuery = workspace.activeBusinessId
    ? projectQuery.eq("business_id", workspace.activeBusinessId)
    : projectQuery.is("business_id", null);

  const { data: project, error: projectError } = await projectQuery.maybeSingle();
  if (projectError || !project) return NextResponse.json({ error: "Video project not found." }, { status: 404 });
  if (!project.source_design_id) {
    return NextResponse.json({ error: "This video is not linked to a source design." }, { status: 409 });
  }

  if (
    parsed.data.expectedUpdatedAt &&
    project.updated_at &&
    new Date(project.updated_at).toISOString() !== new Date(parsed.data.expectedUpdatedAt).toISOString()
  ) {
    return NextResponse.json(
      {
        error: "This video changed somewhere else. Reload before refreshing the linked design.",
        code: "studio_video_version_conflict",
        serverUpdatedAt: project.updated_at,
      },
      { status: 409 },
    );
  }

  let designQuery = supabase
    .from("create_designs")
    .select("id, business_id, canvas, updated_at")
    .eq("id", project.source_design_id);
  designQuery = workspace.activeBusinessId
    ? designQuery.eq("business_id", workspace.activeBusinessId)
    : designQuery.is("business_id", null);

  const { data: design, error: designError } = await designQuery.maybeSingle();
  if (designError || !design) {
    return NextResponse.json(
      { error: "The linked design is no longer available in this Kebu space." },
      { status: 404 },
    );
  }

  let current;
  let source;
  try {
    current = parseStudioComposition(project.composition);
    source = parseCanvasDocument(design.canvas);
  } catch {
    return NextResponse.json({ error: "The linked Studio project contains invalid data." }, { status: 500 });
  }

  const synced = syncSourceDesignIntoComposition(current, source);
  const { data: updated, error: updateError } = await supabase
    .from("studio_video_projects")
    .update({
      composition: synced.composition,
      width: synced.composition.width,
      height: synced.composition.height,
      frame_rate: synced.composition.frameRate,
      edit_mode: synced.composition.editMode,
    })
    .eq("id", id)
    .eq("source_design_id", design.id)
    .select("id, composition, source_design_id, business_id, updated_at")
    .maybeSingle();

  if (updateError || !updated) {
    return NextResponse.json({ error: "Could not refresh the linked design." }, { status: 500 });
  }

  return NextResponse.json({
    project: {
      ...updated,
      composition: parseStudioComposition(updated.composition),
    },
    sourceDesignUpdatedAt: design.updated_at,
    summary: synced.summary,
  });
}
