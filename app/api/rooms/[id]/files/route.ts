import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import { createServiceClient } from "@/lib/opportunity/admin";

export const dynamic = "force-dynamic";

const MAX_BYTES = 50 * 1024 * 1024;
const ALLOWED = new Set([
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/json",
  "application/zip",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "audio/mpeg",
  "audio/wav",
]);

async function assertRoomAccess(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>,
  id: string,
) {
  const { data } = await supabase.from("rooms").select("id").eq("id", id).maybeSingle();
  return Boolean(data);
}

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase } = auth;
  const { id } = await context.params;
  if (!(await assertRoomAccess(supabase, id))) return NextResponse.json({ error: "Room not found." }, { status: 404 });

  const { data, error } = await supabase
    .from("room_files")
    .select("id, room_id, uploaded_by, file_name, storage_path, mime, byte_size, created_at")
    .eq("room_id", id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return NextResponse.json({ error: "Could not load room files." }, { status: 500 });

  const service = createServiceClient();
  const files = await Promise.all((data ?? []).map(async (file) => {
    let downloadUrl: string | null = null;
    if (service) {
      const { data: signed } = await service.storage.from("digital-files").createSignedUrl(file.storage_path, 60 * 10);
      downloadUrl = signed?.signedUrl ?? null;
    }
    return { ...file, downloadUrl };
  }));
  return NextResponse.json({ files });
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const limited = builderRateLimit(req);
  if (limited) return limited;
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id } = await context.params;
  if (!(await assertRoomAccess(supabase, id))) return NextResponse.json({ error: "Room not found." }, { status: 404 });

  let form: FormData;
  try { form = await req.formData(); } catch { return NextResponse.json({ error: "Expected multipart form data." }, { status: 400 }); }
  const file = form.get("file");
  if (!(file instanceof File) || file.size < 1) return NextResponse.json({ error: "Choose a file." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "File is too large (max 50 MB)." }, { status: 400 });
  const mime = (file.type || "application/octet-stream").toLowerCase();
  if (!ALLOWED.has(mime)) return NextResponse.json({ error: "That file type is not supported in Rooms yet." }, { status: 400 });

  const safeName = (file.name || "file").replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 180);
  const path = `${user.id}/rooms/${id}/${crypto.randomUUID()}-${safeName}`;
  const service = createServiceClient();
  if (!service) return NextResponse.json({ error: "Private file storage is unavailable." }, { status: 503 });
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error: uploadError } = await service.storage.from("digital-files").upload(path, bytes, { contentType: mime, upsert: false });
  if (uploadError) return NextResponse.json({ error: uploadError.message || "Upload failed." }, { status: 500 });

  const { data, error } = await supabase
    .from("room_files")
    .insert({ room_id: id, uploaded_by: user.id, file_name: file.name.slice(0, 240), storage_path: path, mime, byte_size: file.size })
    .select("*")
    .single();

  if (error) {
    await service.storage.from("digital-files").remove([path]);
    return NextResponse.json({ error: "Could not attach file to room." }, { status: 500 });
  }

  const { data: signed } = await service.storage.from("digital-files").createSignedUrl(path, 60 * 10);
  return NextResponse.json({ file: { ...data, downloadUrl: signed?.signedUrl ?? null } }, { status: 201 });
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase } = auth;
  const { id } = await context.params;
  if (!(await assertRoomAccess(supabase, id))) return NextResponse.json({ error: "Room not found." }, { status: 404 });

  const fileId = new URL(req.url).searchParams.get("fileId");
  if (!fileId || !/^[0-9a-f-]{36}$/i.test(fileId)) return NextResponse.json({ error: "fileId required." }, { status: 400 });
  const { data: file } = await supabase.from("room_files").select("id, storage_path").eq("id", fileId).eq("room_id", id).maybeSingle();
  if (!file) return NextResponse.json({ error: "File not found." }, { status: 404 });

  const { error } = await supabase.from("room_files").delete().eq("id", fileId);
  if (error) return NextResponse.json({ error: "Could not remove file." }, { status: 500 });
  const service = createServiceClient();
  if (service) await service.storage.from("digital-files").remove([file.storage_path]);
  return NextResponse.json({ ok: true });
}
