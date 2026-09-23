import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import { createServiceClient } from "@/lib/opportunity/admin";

export const dynamic = "force-dynamic";

const MAX_BYTES = 25 * 1024 * 1024;
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
  "image/gif",
  "audio/mpeg",
  "audio/wav",
  "video/mp4",
]);

async function assertMessageAccess(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>,
  messageId: string,
) {
  const { data } = await supabase
    .from("mail_messages")
    .select("id, mailbox_id, folder, status")
    .eq("id", messageId)
    .maybeSingle();
  return data;
}

export async function GET(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase } = auth;
  const messageId = new URL(req.url).searchParams.get("messageId");
  if (!messageId || !/^[0-9a-f-]{36}$/i.test(messageId)) return NextResponse.json({ error: "messageId required." }, { status: 400 });

  const message = await assertMessageAccess(supabase, messageId);
  if (!message) return NextResponse.json({ error: "Message not found." }, { status: 404 });

  const { data, error } = await supabase
    .from("mail_attachments")
    .select("id, message_id, mailbox_id, file_name, storage_path, mime, byte_size, created_at")
    .eq("message_id", messageId)
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: "Could not load attachments." }, { status: 500 });

  const service = createServiceClient();
  const attachments = await Promise.all((data ?? []).map(async (attachment) => {
    let downloadUrl: string | null = null;
    if (service) {
      const { data: signed } = await service.storage.from("digital-files").createSignedUrl(attachment.storage_path, 60 * 10);
      downloadUrl = signed?.signedUrl ?? null;
    }
    return { ...attachment, downloadUrl };
  }));

  return NextResponse.json({ attachments });
}

export async function POST(req: Request) {
  const limited = builderRateLimit(req);
  if (limited) return limited;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  let form: FormData;
  try { form = await req.formData(); } catch { return NextResponse.json({ error: "Expected multipart form data." }, { status: 400 }); }
  const file = form.get("file");
  const messageId = String(form.get("messageId") ?? "");
  if (!(file instanceof File) || file.size < 1) return NextResponse.json({ error: "Choose a file." }, { status: 400 });
  if (!/^[0-9a-f-]{36}$/i.test(messageId)) return NextResponse.json({ error: "Valid messageId required." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Attachment is too large (max 25 MB)." }, { status: 400 });

  const message = await assertMessageAccess(supabase, messageId);
  if (!message || (message.folder !== "drafts" && message.status !== "draft")) {
    return NextResponse.json({ error: "Attachments may only be added to drafts." }, { status: 403 });
  }

  const mime = (file.type || "application/octet-stream").toLowerCase();
  if (!ALLOWED.has(mime)) return NextResponse.json({ error: "That attachment type is not supported yet." }, { status: 400 });

  const service = createServiceClient();
  if (!service) return NextResponse.json({ error: "Private attachment storage is unavailable." }, { status: 503 });
  const safeName = (file.name || "attachment").replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 180);
  const path = `${user.id}/mail/${message.mailbox_id}/${messageId}/${crypto.randomUUID()}-${safeName}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error: uploadError } = await service.storage.from("digital-files").upload(path, bytes, { contentType: mime, upsert: false });
  if (uploadError) return NextResponse.json({ error: uploadError.message || "Attachment upload failed." }, { status: 500 });

  const { data, error } = await supabase
    .from("mail_attachments")
    .insert({
      message_id: messageId,
      mailbox_id: message.mailbox_id,
      uploaded_by: user.id,
      file_name: file.name.slice(0, 240),
      storage_path: path,
      mime,
      byte_size: file.size,
    })
    .select("*")
    .single();

  if (error) {
    await service.storage.from("digital-files").remove([path]);
    return NextResponse.json({ error: "Could not attach file." }, { status: 500 });
  }

  const { data: signed } = await service.storage.from("digital-files").createSignedUrl(path, 60 * 10);
  return NextResponse.json({ attachment: { ...data, downloadUrl: signed?.signedUrl ?? null } }, { status: 201 });
}

export async function DELETE(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase } = auth;
  const id = new URL(req.url).searchParams.get("id");
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Attachment id required." }, { status: 400 });

  const { data: attachment } = await supabase
    .from("mail_attachments")
    .select("id, storage_path, message_id")
    .eq("id", id)
    .maybeSingle();
  if (!attachment) return NextResponse.json({ error: "Attachment not found." }, { status: 404 });

  const message = await assertMessageAccess(supabase, attachment.message_id);
  if (!message || message.folder !== "drafts") return NextResponse.json({ error: "Only draft attachments can be removed." }, { status: 403 });

  const { error } = await supabase.from("mail_attachments").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "Could not remove attachment." }, { status: 500 });

  const service = createServiceClient();
  if (service) await service.storage.from("digital-files").remove([attachment.storage_path]);
  return NextResponse.json({ ok: true });
}
