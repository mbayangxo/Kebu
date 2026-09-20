import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { loadActiveWorkspaceScope } from "@/lib/account/server-workspace";

export const dynamic = "force-dynamic";

/** List owner's Studio uploads library (S16). */
export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const workspace = await loadActiveWorkspaceScope(supabase, user.id);

  let query = supabase
    .from("studio_uploads")
    .select("id, kind, url, file_name, mime, byte_size, business_id, owner_id, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  query = workspace.activeBusinessId
    ? query.eq("business_id", workspace.activeBusinessId)
    : query.is("business_id", null);
  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      {
        error: error.message?.includes("does not exist")
          ? "Uploads library missing. Apply migration 073."
          : "Could not load uploads.",
      },
      { status: error.message?.includes("does not exist") ? 503 : 500 },
    );
  }

  return NextResponse.json({ uploads: data ?? [] });
}

/** Delete an upload library row (does not remove storage object — keep file for existing designs). */
export async function DELETE(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const workspace = await loadActiveWorkspaceScope(supabase, user.id);

  const id = new URL(req.url).searchParams.get("id");
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Upload id required." }, { status: 400 });
  }

  let deleteQuery = supabase.from("studio_uploads").delete().eq("id", id);
  deleteQuery = workspace.activeBusinessId
    ? deleteQuery.eq("business_id", workspace.activeBusinessId)
    : deleteQuery.is("business_id", null);
  const { error } = await deleteQuery;
  if (error) {
    return NextResponse.json({ error: "Could not remove from library." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
