import { NextResponse } from "next/server";
import { requireUser, logCreate } from "@/lib/create/auth";
import { CLOUD_USER_STORAGE_BUCKET } from "@/lib/cloud/constants";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ bucketId: string }> };

export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { bucketId } = await params;

  if (!/^[0-9a-f-]{36}$/i.test(bucketId)) {
    return NextResponse.json({ error: "Invalid bucket id." }, { status: 400 });
  }

  const { data: bucket } = await supabase
    .from("cloud_storage_buckets")
    .select("id")
    .eq("id", bucketId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!bucket) {
    return NextResponse.json({ error: "Bucket not found." }, { status: 404 });
  }

  const { data: files } = await supabase
    .from("cloud_storage_files")
    .select("storage_path")
    .eq("bucket_id", bucketId);

  const paths = (files ?? []).map((f) => f.storage_path);
  if (paths.length) {
    await supabase.storage.from(CLOUD_USER_STORAGE_BUCKET).remove(paths);
  }

  const { error } = await supabase.from("cloud_storage_buckets").delete().eq("id", bucketId);
  if (error) {
    return NextResponse.json({ error: "Could not delete bucket." }, { status: 500 });
  }

  logCreate("cloud.bucket_deleted", { userId: user.id, bucketId });
  return NextResponse.json({ ok: true });
}
