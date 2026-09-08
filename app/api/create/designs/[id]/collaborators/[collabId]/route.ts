import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { resolveStudioDesignAccess } from "@/lib/studio/design-access";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string; collabId: string }> };

/** Revoke collaborator (owner only). */
export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id, collabId } = await params;

  const access = await resolveStudioDesignAccess(supabase, { designId: id, userId: user.id });
  if (!access?.canShare) {
    return NextResponse.json({ error: "Only the owner can remove collaborators." }, { status: 403 });
  }

  const { error } = await supabase
    .from("studio_design_collaborators")
    .update({ status: "revoked", updated_at: new Date().toISOString() })
    .eq("id", collabId)
    .eq("design_id", id);

  if (error) {
    return NextResponse.json({ error: "Could not remove collaborator." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
