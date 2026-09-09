import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { normalizeFolderName, patchStudioFolderSchema } from "@/lib/studio/folders";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** Rename a folder (owner only). */
export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = patchStudioFolderSchema.safeParse(body);
  if (!parsed.success || !parsed.data.name) {
    return NextResponse.json({ error: "Invalid folder name." }, { status: 400 });
  }

  const name = normalizeFolderName(parsed.data.name);

  const { data: folder, error } = await supabase
    .from("studio_folders")
    .update({ name })
    .eq("id", id)
    .eq("owner_id", user.id)
    .select("id, name, created_at, updated_at")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "You already have a folder with that name." }, { status: 409 });
    }
    return NextResponse.json({ error: "Could not rename folder." }, { status: 500 });
  }
  if (!folder) {
    return NextResponse.json({ error: "Folder not found." }, { status: 404 });
  }

  return NextResponse.json({ folder });
}

/** Delete folder — designs become unfiled (ON DELETE SET NULL). */
export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id } = await params;

  const { data: existing } = await supabase
    .from("studio_folders")
    .select("id")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Folder not found." }, { status: 404 });
  }

  const { error } = await supabase.from("studio_folders").delete().eq("id", id).eq("owner_id", user.id);
  if (error) {
    return NextResponse.json({ error: "Could not delete folder." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
