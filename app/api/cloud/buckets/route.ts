import { NextResponse } from "next/server";
import { requireUser, logCreate } from "@/lib/create/auth";
import { assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";
import { getCloudQuota } from "@/lib/cloud/quota";
import { BUCKET_NAME_PATTERN } from "@/lib/cloud/constants";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const [{ data: buckets, error }, quota] = await Promise.all([
    supabase
      .from("cloud_storage_buckets")
      .select("id, name, visibility, created_at")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false }),
    getCloudQuota(supabase, user.id),
  ]);

  if (error) {
    return NextResponse.json(
      {
        error: error.message.includes("does not exist")
          ? "Apply the Kebu Cloud storage migration."
          : "Could not load buckets.",
        detail: error.message,
      },
      { status: 500 },
    );
  }

  const bucketIds = (buckets ?? []).map((b) => b.id);
  const counts: Record<string, { fileCount: number; sizeBytes: number }> = {};
  if (bucketIds.length) {
    const { data: files } = await supabase
      .from("cloud_storage_files")
      .select("bucket_id, size_bytes")
      .in("bucket_id", bucketIds);
    for (const f of files ?? []) {
      const entry = counts[f.bucket_id] ?? { fileCount: 0, sizeBytes: 0 };
      entry.fileCount += 1;
      entry.sizeBytes += f.size_bytes ?? 0;
      counts[f.bucket_id] = entry;
    }
  }

  return NextResponse.json({
    buckets: (buckets ?? []).map((b) => ({ ...b, ...(counts[b.id] ?? { fileCount: 0, sizeBytes: 0 }) })),
    quota,
  });
}

export async function POST(req: Request) {
  const blocked = assertSameOriginMutation(req);
  if (blocked) return blocked;
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const rec = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const name = typeof rec.name === "string" ? rec.name.trim().toLowerCase() : "";
  const visibility = rec.visibility === "public" ? "public" : "private";

  if (!name || name.length > 63 || !BUCKET_NAME_PATTERN.test(name)) {
    return NextResponse.json(
      { error: "Bucket name must be lowercase letters, numbers, dots, dashes or underscores, starting with a letter or number." },
      { status: 400 },
    );
  }

  const { data: row, error } = await supabase
    .from("cloud_storage_buckets")
    .insert({ owner_id: user.id, name, visibility })
    .select("id, name, visibility, created_at")
    .single();

  if (error || !row) {
    return NextResponse.json(
      { error: error?.message.includes("duplicate") ? "You already have a bucket with that name." : "Could not create bucket." },
      { status: error?.message.includes("duplicate") ? 409 : 500 },
    );
  }

  logCreate("cloud.bucket_created", { userId: user.id, bucketId: row.id });
  return NextResponse.json({ bucket: { ...row, fileCount: 0, sizeBytes: 0 } });
}
