import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { createServiceClient } from "@/lib/opportunity/admin";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ threadId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase } = auth;
  const { threadId } = await params;

  if (!/^[0-9a-f-]{36}$/i.test(threadId)) return NextResponse.json({ error: "Invalid thread id." }, { status: 400 });

  const { data: thread, error: threadError } = await supabase
    .from("mail_threads")
    .select("id, mailbox_id, subject, normalized_subject, participant_key, last_message_at, created_at")
    .eq("id", threadId)
    .maybeSingle();
  if (threadError || !thread) return NextResponse.json({ error: "Thread not found." }, { status: 404 });

  const { data: messages, error } = await supabase
    .from("mail_messages")
    .select("id, mailbox_id, thread_id, direction, folder, from_address, to_addresses, cc_addresses, subject, body_text, status, read_at, in_reply_to_message_id, created_at")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: "Could not load thread." }, { status: 500 });

  const messageIds = (messages ?? []).map((message) => message.id);
  let attachments: Array<{
    id: string;
    message_id: string;
    file_name: string;
    mime: string;
    byte_size: number;
    storage_path: string;
    created_at: string;
    downloadUrl: string | null;
  }> = [];

  if (messageIds.length) {
    const { data: rows } = await supabase
      .from("mail_attachments")
      .select("id, message_id, file_name, mime, byte_size, storage_path, created_at")
      .in("message_id", messageIds)
      .order("created_at", { ascending: true });

    const service = createServiceClient();
    attachments = await Promise.all((rows ?? []).map(async (row) => {
      let downloadUrl: string | null = null;
      if (service) {
        const { data: signed } = await service.storage.from("digital-files").createSignedUrl(row.storage_path, 60 * 10);
        downloadUrl = signed?.signedUrl ?? null;
      }
      return { ...row, downloadUrl };
    }));
  }

  return NextResponse.json({ thread, messages: messages ?? [], attachments });
}
