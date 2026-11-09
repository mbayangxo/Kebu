import { NextResponse } from "next/server";
import { requireUser, logCreate } from "@/lib/create/auth";
import { CLOUD_USER_STORAGE_BUCKET } from "@/lib/cloud/constants";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ fileId: string }> };

async function loadOwnedFile(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>,
  fileId: string,
  ownerId: string,
) {
  const { data } = await supabase
    .from("cloud_storage_files")
    .select("id, storage_path, file_name, bucket_id, cloud_storage_buckets!inner(owner_id)")
    .eq("id", fileId)
    .eq("cloud_storage_buckets.owner_id", ownerId)
    .maybeSingle();
  return data;
}

export async function GET(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { fileId } = await params;

  if (!/^[0-9a-f-]{36}$/i.test(fileId)) {
    return NextResponse.json({ error: "Invalid file id." }, { status: 400 });
  }

  const file = await loadOwnedFile(supabase, fileId, user.id);
  if (!file) return NextResponse.json({ error: "File not found." }, { status: 404 });

  const { data: signed, error } = await supabase.storage
    .from(CLOUD_USER_STORAGE_BUCKET)
    .createSignedUrl(file.storage_path, 3600);

  if (error || !signed) {
    return NextResponse.json({ error: "Could not create download link." }, { status: 500 });
  }

  return NextResponse.json({ downloadUrl: signed.signedUrl, fileName: file.file_name });
}

export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { fileId } = await params;

  if (!/^[0-9a-f-]{36}$/i.test(fileId)) {
    return NextResponse.json({ error: "Invalid file id." }, { status: 400 });
  }

  const file = await loadOwnedFile(supabase, fileId, user.id);
  if (!file) return NextResponse.json({ error: "File not found." }, { status: 404 });

  await supabase.storage.from(CLOUD_USER_STORAGE_BUCKET).remove([file.storage_path]);
  const { error } = await supabase.from("cloud_storage_files").delete().eq("id", fileId);
  if (error) {
    return NextResponse.json({ error: "Could not delete file." }, { status: 500 });
  }

  logCreate("cloud.file_deleted", { userId: user.id, fileId });
  return NextResponse.json({ ok: true });
}
