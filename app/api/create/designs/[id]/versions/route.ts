import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { resolveStudioDesignAccess } from "@/lib/studio/design-access";
import { createVersionSchema } from "@/lib/studio/design-versions";
import { insertDesignVersion } from "@/lib/studio/design-version-store";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** List version metadata (no canvas payloads). */
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
    .from("studio_design_versions")
    .select("id, design_id, created_by, label, source, created_at")
    .eq("design_id", designId)
    .order("created_at", { ascending: false })
    .limit(40);

  if (error) {
    const missing = error.message?.includes("does not exist");
    return NextResponse.json(
      {
        error: missing
          ? "Design versions table missing. Apply migration 078."
          : "Could not load versions.",
      },
      { status: missing ? 503 : 500 },
    );
  }

  return NextResponse.json({ versions: data ?? [], access });
}

/** Save a named (manual) version of the current canvas. */
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

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const parsed = createVersionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const { data: design } = await supabase
    .from("create_designs")
    .select("canvas")
    .eq("id", designId)
    .maybeSingle();

  if (!design) {
    return NextResponse.json({ error: "Design not found." }, { status: 404 });
  }

  const result = await insertDesignVersion(supabase, {
    designId,
    userId: user.id,
    canvas: design.canvas,
    source: "manual",
    label: parsed.data.label ?? "Named version",
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ versionId: result.id }, { status: 201 });
}
