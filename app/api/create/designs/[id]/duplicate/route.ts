import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { resolveStudioDesignAccess } from "@/lib/studio/design-access";
import { duplicateDesignTitle } from "@/lib/studio/create-presets";
import { parseCanvasDocument, type StudioDesignType } from "@/lib/studio/canvas-document";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/**
 * Duplicate a Studio design into a new owned design (Canva-style Make a copy).
 * Editors/viewers may copy into their own library; only accessible designs.
 */
export async function POST(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id } = await params;

  const access = await resolveStudioDesignAccess(supabase, { designId: id, userId: user.id });
  if (!access) {
    return NextResponse.json({ error: "Design not found." }, { status: 404 });
  }

  const { data: source, error } = await supabase
    .from("create_designs")
    .select("id, title, design_type, canvas, business_id")
    .eq("id", id)
    .maybeSingle();

  if (error || !source) {
    return NextResponse.json({ error: "Design not found." }, { status: 404 });
  }

  const designType = source.design_type as StudioDesignType;
  const canvas = parseCanvasDocument(source.canvas, designType);
  const title = duplicateDesignTitle(String(source.title ?? "Untitled"));

  const { data: design, error: insertErr } = await supabase
    .from("create_designs")
    .insert({
      owner_id: user.id,
      business_id: access.role === "owner" ? source.business_id : null,
      design_type: designType,
      title,
      canvas,
    })
    .select("id, title, design_type, business_id, canvas, created_at, updated_at")
    .single();

  if (insertErr || !design) {
    return NextResponse.json({ error: insertErr?.message ?? "Could not duplicate." }, { status: 500 });
  }

  return NextResponse.json({ design });
}
