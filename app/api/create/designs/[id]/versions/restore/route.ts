import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { resolveStudioDesignAccess } from "@/lib/studio/design-access";
import { parseCanvasDocument, type StudioDesignType } from "@/lib/studio/canvas-document";
import { restoreVersionSchema } from "@/lib/studio/design-versions";
import { insertDesignVersion } from "@/lib/studio/design-version-store";
import { recalculateReadinessForBusiness } from "@/lib/kebu-id/recalculate-hooks";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** Restore a prior canvas version (checkpoints current first). */
export async function POST(req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: designId } = await params;

  const access = await resolveStudioDesignAccess(supabase, { designId, userId: user.id });
  if (!access) {
    return NextResponse.json({ error: "Design not found." }, { status: 404 });
  }
  if (!access.canEdit) {
    return NextResponse.json({ error: "View-only access." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = restoreVersionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "versionId required." }, { status: 400 });
  }

  const { data: version, error: vErr } = await supabase
    .from("studio_design_versions")
    .select("id, canvas")
    .eq("id", parsed.data.versionId)
    .eq("design_id", designId)
    .maybeSingle();

  if (vErr || !version) {
    return NextResponse.json({ error: "Version not found." }, { status: 404 });
  }

  const { data: existing } = await supabase
    .from("create_designs")
    .select("id, canvas, design_type, business_id")
    .eq("id", designId)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Design not found." }, { status: 404 });
  }

  await insertDesignVersion(supabase, {
    designId,
    userId: user.id,
    canvas: existing.canvas,
    source: "pre_restore",
    label: "Before restore",
  });

  const canvas = parseCanvasDocument(
    version.canvas,
    (existing.design_type as StudioDesignType) ?? "poster",
  );

  const { data: design, error } = await supabase
    .from("create_designs")
    .update({ canvas })
    .eq("id", designId)
    .select("id, title, design_type, business_id, canvas, owner_id, created_at, updated_at")
    .single();

  if (error || !design) {
    return NextResponse.json({ error: "Could not restore version." }, { status: 500 });
  }

  await recalculateReadinessForBusiness(supabase, existing.business_id as string | null);
  return NextResponse.json({ design, access, restoredVersionId: version.id });
}
