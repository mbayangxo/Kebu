import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser, logCreate } from "@/lib/create/auth";
import { assertCloudStorageQuota, getCloudQuota } from "@/lib/cloud/quota";
import { maybeNotifyCloudStorageThreshold } from "@/lib/cloud/storage-notify";
import { createAdminClient } from "@/lib/supabase/admin";
import { platformLog } from "@/lib/platform/observability";
import {
  CLOUD_USER_STORAGE_BUCKET,
  MAX_STORAGE_FILE_BYTES,
  sanitizeFileName,
} from "@/lib/cloud/constants";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ bucketId: string }> };

async function assertBucketAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  bucketId: string,
  ownerId: string,
) {
  const { data } = await supabase
    .from("cloud_storage_buckets")
    .select("id, visibility")
    .eq("id", bucketId)
    .eq("owner_id", ownerId)
    .maybeSingle();
  return data;
}

export async function GET(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { bucketId } = await params;

  if (!/^[0-9a-f-]{36}$/i.test(bucketId)) {
    return NextResponse.json({ error: "Invalid bucket id." }, { status: 400 });
  }
  const bucket = await assertBucketAccess(supabase, bucketId, user.id);
  if (!bucket) return NextResponse.json({ error: "Bucket not found." }, { status: 404 });

  const { data: files, error } = await supabase
    .from("cloud_storage_files")
    .select("id, file_name, mime_type, size_bytes, created_at")
    .eq("bucket_id", bucketId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Could not load files." }, { status: 500 });
  }

  return NextResponse.json({ files: files ?? [] });
}

export async function POST(req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { bucketId } = await params;

  if (!/^[0-9a-f-]{36}$/i.test(bucketId)) {
    return NextResponse.json({ error: "Invalid bucket id." }, { status: 400 });
  }
  const bucket = await assertBucketAccess(supabase, bucketId, user.id);
  if (!bucket) return NextResponse.json({ error: "Bucket not found." }, { status: 404 });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form upload." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file." }, { status: 400 });
  }
  if (file.size <= 0 || file.size > MAX_STORAGE_FILE_BYTES) {
    return NextResponse.json({ error: `File must be between 1 byte and ${MAX_STORAGE_FILE_BYTES} bytes.` }, { status: 400 });
  }

  const quota = await assertCloudStorageQuota(supabase, user.id, file.size);
  if (!quota.ok) {
    return NextResponse.json({ error: quota.error }, { status: 413 });
  }

  const fileId = crypto.randomUUID();
  const safeName = sanitizeFileName(file.name);
  const storagePath = `${user.id}/${bucketId}/${fileId}-${safeName}`;
  const mime = file.type || "application/octet-stream";

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadErr } = await supabase.storage
    .from(CLOUD_USER_STORAGE_BUCKET)
    .upload(storagePath, buffer, { contentType: mime, upsert: false });

  if (uploadErr) {
    return NextResponse.json({ error: "Upload failed.", detail: uploadErr.message }, { status: 500 });
  }

  const { data: row, error: insertErr } = await supabase
    .from("cloud_storage_files")
    .insert({
      id: fileId,
      bucket_id: bucketId,
      storage_path: storagePath,
      file_name: safeName,
      mime_type: mime,
      size_bytes: file.size,
      uploaded_by: user.id,
    })
    .select("id, file_name, mime_type, size_bytes, created_at")
    .single();

  if (insertErr || !row) {
    await supabase.storage.from(CLOUD_USER_STORAGE_BUCKET).remove([storagePath]);
    return NextResponse.json({ error: "Could not save file record." }, { status: 500 });
  }

  logCreate("cloud.file_uploaded", { userId: user.id, bucketId, fileId: row.id, sizeBytes: file.size });

  try {
    const admin = createAdminClient();
    const quotaAfter = await getCloudQuota(supabase, user.id);
    await maybeNotifyCloudStorageThreshold(admin, user.id, quotaAfter);
  } catch (cause) {
    platformLog.error("cloud_storage.warning_check_failed", {
      userId: user.id, error: cause instanceof Error ? cause.message : String(cause),
    });
  }

  return NextResponse.json({ file: row });
}
