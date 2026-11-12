import { assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";
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
  const originBlocked = assertSameOriginMutation(req);
  if (originBlocked) return originBlocked;
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
    return NextResponse.json({ error: "A version and current design revision are required." }, { status: 400 });
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
    .select("id, canvas, design_type, business_id, updated_at")
    .eq("id", designId)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Design not found." }, { status: 404 });
  }

  if (Date.parse(existing.updated_at) !== Date.parse(parsed.data.expectedUpdatedAt)) {
    return NextResponse.json({ error: "This design changed. Save or reload before restoring history.", code: "studio_version_conflict" }, { status: 409 });
  }

  const checkpoint = await insertDesignVersion(supabase, {
    designId,
    userId: user.id,
    canvas: existing.canvas,
    source: "pre_restore",
    label: "Before restore",
  });

  if ("error" in checkpoint) {
    return NextResponse.json({ error: "Could not preserve your current canvas. Restore was cancelled." }, { status: checkpoint.status });
  }

  const canvas = parseCanvasDocument(
    version.canvas,
    (existing.design_type as StudioDesignType) ?? "poster",
  );

  const { data: design, error } = await supabase
    .from("create_designs")
    .update({ canvas })
    .eq("id", designId)
    .eq("updated_at", parsed.data.expectedUpdatedAt)
    .select("id, title, design_type, business_id, canvas, owner_id, created_at, updated_at")
    .maybeSingle();

  if (!error && !design) {
    return NextResponse.json({ error: "This design changed while restoring. Your newer edit was kept.", code: "studio_version_conflict" }, { status: 409 });
  }

  if (error || !design) {
    return NextResponse.json({ error: "Could not restore version." }, { status: 500 });
  }

  await recalculateReadinessForBusiness(supabase, existing.business_id as string | null);
  return NextResponse.json({ design, access, restoredVersionId: version.id });
}
