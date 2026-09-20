import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";
import { mailThreadIdentity } from "@/lib/mail/threading";

export const dynamic = "force-dynamic";

const folderSchema = z.enum(["inbox","sent","drafts","archive","spam","trash"]);

const draftSchema = z.object({
  mailboxId: z.string().uuid(),
  id: z.string().uuid().optional(),
  threadId: z.string().uuid().optional(),
  inReplyToMessageId: z.string().uuid().optional(),
  to: z.array(z.string().email()).max(20).default([]),
  cc: z.array(z.string().email()).max(20).default([]),
  subject: z.string().max(240).default(""),
  text: z.string().max(100000).default(""),
});

export async function GET(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase } = auth;
  const url = new URL(req.url);
  const mailboxId = url.searchParams.get("mailboxId");
  const folder = folderSchema.safeParse(url.searchParams.get("folder") || "inbox");
  if (!mailboxId || !/^[0-9a-f-]{36}$/i.test(mailboxId) || !folder.success) {
    return NextResponse.json({ error: "Valid mailbox and folder required." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("mail_messages")
    .select("id, mailbox_id, thread_id, direction, folder, from_address, to_addresses, cc_addresses, subject, body_text, status, read_at, in_reply_to_message_id, created_at")
    .eq("mailbox_id", mailboxId)
    .eq("folder", folder.data)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: "Could not load messages." }, { status: 500 });
  return NextResponse.json({ messages: data ?? [] });
}

export async function POST(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase } = auth;
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  const parsed = draftSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid draft.", issues: parsed.error.flatten() }, { status: 400 });

  const { data: mailbox } = await supabase
    .from("mailboxes")
    .select("id, address")
    .eq("id", parsed.data.mailboxId)
    .eq("is_active", true)
    .maybeSingle();
  if (!mailbox) return NextResponse.json({ error: "Mailbox not available." }, { status: 403 });

  if (parsed.data.inReplyToMessageId) {
    const { data: target } = await supabase
      .from("mail_messages")
      .select("id, thread_id")
      .eq("id", parsed.data.inReplyToMessageId)
      .eq("mailbox_id", mailbox.id)
      .maybeSingle();
    if (!target) return NextResponse.json({ error: "Reply target not found." }, { status: 404 });
    if (parsed.data.threadId && target.thread_id !== parsed.data.threadId) {
      return NextResponse.json({ error: "Reply thread mismatch." }, { status: 400 });
    }
  }

  if (parsed.data.id) {
    const { data, error } = await supabase
      .from("mail_messages")
      .update({
        to_addresses: parsed.data.to.map((value) => value.toLowerCase()),
        cc_addresses: parsed.data.cc.map((value) => value.toLowerCase()),
        subject: parsed.data.subject,
        body_text: parsed.data.text,
        in_reply_to_message_id: parsed.data.inReplyToMessageId ?? null,
      })
      .eq("id", parsed.data.id)
      .eq("mailbox_id", mailbox.id)
      .eq("folder", "drafts")
      .select("*")
      .single();
    return error ? NextResponse.json({ error: "Could not save draft." }, { status: 500 }) : NextResponse.json({ draft: data });
  }

  let threadId = parsed.data.threadId ?? null;
  if (threadId) {
    const { data } = await supabase
      .from("mail_threads")
      .select("id")
      .eq("id", threadId)
      .eq("mailbox_id", mailbox.id)
      .maybeSingle();
    if (!data) threadId = null;
  }

  if (!threadId) {
    const identity = mailThreadIdentity({
      subject: parsed.data.subject,
      mailboxAddress: mailbox.address,
      otherAddresses: [...parsed.data.to, ...parsed.data.cc],
    });

    const { data: existing } = await supabase
      .from("mail_threads")
      .select("id")
      .eq("mailbox_id", mailbox.id)
      .eq("normalized_subject", identity.normalizedSubject)
      .eq("participant_key", identity.participantKey)
      .order("last_message_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      threadId = existing.id;
    } else {
      const { data: thread, error: threadError } = await supabase
        .from("mail_threads")
        .insert({
          mailbox_id: mailbox.id,
          subject: parsed.data.subject || "(draft)",
          normalized_subject: identity.normalizedSubject,
          participant_key: identity.participantKey,
        })
        .select("id")
        .single();
      if (threadError || !thread) return NextResponse.json({ error: "Could not create draft thread." }, { status: 500 });
      threadId = thread.id;
    }
  }

  const { data, error } = await supabase
    .from("mail_messages")
    .insert({
      mailbox_id: mailbox.id,
      thread_id: threadId,
      direction: "outbound",
      folder: "drafts",
      from_address: mailbox.address,
      to_addresses: parsed.data.to.map((value) => value.toLowerCase()),
      cc_addresses: parsed.data.cc.map((value) => value.toLowerCase()),
      subject: parsed.data.subject,
      body_text: parsed.data.text,
      status: "draft",
      in_reply_to_message_id: parsed.data.inReplyToMessageId ?? null,
    })
    .select("*")
    .single();

  return error ? NextResponse.json({ error: "Could not save draft." }, { status: 500 }) : NextResponse.json({ draft: data }, { status: 201 });
}

const patchSchema = z.object({
  id: z.string().uuid(),
  folder: folderSchema.optional(),
  read: z.boolean().optional(),
}).refine((value) => value.folder !== undefined || value.read !== undefined);

export async function PATCH(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase } = auth;
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid message update." }, { status: 400 });
  const patch: Record<string, unknown> = {};
  if (parsed.data.folder) patch.folder = parsed.data.folder;
  if (parsed.data.read !== undefined) patch.read_at = parsed.data.read ? new Date().toISOString() : null;
  const { data, error } = await supabase.from("mail_messages").update(patch).eq("id", parsed.data.id).select("*").single();
  if (error) return NextResponse.json({ error: "Could not update message." }, { status: 500 });
  return NextResponse.json({ message: data });
}
