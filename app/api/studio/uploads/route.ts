import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";

export const dynamic = "force-dynamic";

/** List owner's Studio uploads library (S16). */
export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const { data, error } = await supabase
    .from("studio_uploads")
    .select("id, kind, url, file_name, mime, byte_size, created_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

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

  const id = new URL(req.url).searchParams.get("id");
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Upload id required." }, { status: 400 });
  }

  const { error } = await supabase.from("studio_uploads").delete().eq("id", id).eq("owner_id", user.id);
  if (error) {
    return NextResponse.json({ error: "Could not remove from library." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
