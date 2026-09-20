import { Buffer } from "node:buffer";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";
import { createServiceClient } from "@/lib/opportunity/admin";
import { sendInternetMail, type MailProviderAttachment } from "@/lib/mail/provider";
import { canonicalAddress, mailThreadIdentity } from "@/lib/mail/threading";

export const dynamic = "force-dynamic";

const sendSchema = z.object({
  mailboxId: z.string().uuid(),
  to: z.array(z.string().email()).min(1).max(20),
  cc: z.array(z.string().email()).max(20).default([]),
  subject: z.string().trim().max(240).default(""),
  text: z.string().max(100000),
  draftId: z.string().uuid().optional(),
  threadId: z.string().uuid().optional(),
  inReplyToMessageId: z.string().uuid().optional(),
});

type AttachmentRow = {
  id: string;
  message_id: string;
  mailbox_id: string;
  file_name: string;
  storage_path: string;
  mime: string;
  byte_size: number;
};

async function findOrCreateThread(opts: {
  client: SupabaseClient;
  mailboxId: string;
  mailboxAddress: string;
  subject: string;
  otherAddresses: string[];
  preferredThreadId?: string;
}) {
  if (opts.preferredThreadId) {
    const { data } = await opts.client
      .from("mail_threads")
      .select("id")
      .eq("id", opts.preferredThreadId)
      .eq("mailbox_id", opts.mailboxId)
      .maybeSingle();
    if (data) return data.id as string;
  }

  const identity = mailThreadIdentity({
    subject: opts.subject,
    mailboxAddress: opts.mailboxAddress,
    otherAddresses: opts.otherAddresses,
  });

  const { data: existing } = await opts.client
    .from("mail_threads")
    .select("id")
    .eq("mailbox_id", opts.mailboxId)
    .eq("normalized_subject", identity.normalizedSubject)
    .eq("participant_key", identity.participantKey)
    .order("last_message_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) return existing.id as string;

  const { data: created, error } = await opts.client
    .from("mail_threads")
    .insert({
      mailbox_id: opts.mailboxId,
      subject: opts.subject || "(no subject)",
      normalized_subject: identity.normalizedSubject,
      participant_key: identity.participantKey,
    })
    .select("id")
    .single();

  if (error || !created) throw new Error("Could not create mail thread.");
  return created.id as string;
}

async function loadProviderAttachments(
  service: NonNullable<ReturnType<typeof createServiceClient>>,
  rows: AttachmentRow[],
): Promise<MailProviderAttachment[]> {
  const result: MailProviderAttachment[] = [];
  for (const row of rows) {
    const { data, error } = await service.storage.from("digital-files").download(row.storage_path);
    if (error || !data) throw new Error("Could not read attachment " + row.file_name + ".");
    const contentBase64 = Buffer.from(await data.arrayBuffer()).toString("base64");
    result.push({ filename: row.file_name, contentBase64, contentType: row.mime });
  }
  return result;
}

export async function POST(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid email.", issues: parsed.error.flatten() }, { status: 400 });

  const to = parsed.data.to.map(canonicalAddress);
  const cc = parsed.data.cc.map(canonicalAddress);

  const { data: mailbox } = await supabase
    .from("mailboxes")
    .select("id, address, display_name")
    .eq("id", parsed.data.mailboxId)
    .eq("is_active", true)
    .maybeSingle();
  if (!mailbox) return NextResponse.json({ error: "Mailbox not available." }, { status: 403 });

  let draft: {
    id: string;
    thread_id: string;
    folder: string;
    status: string;
  } | null = null;

  if (parsed.data.draftId) {
    const { data } = await supabase
      .from("mail_messages")
      .select("id, thread_id, folder, status")
      .eq("id", parsed.data.draftId)
      .eq("mailbox_id", mailbox.id)
      .eq("folder", "drafts")
      .maybeSingle();
    if (!data) return NextResponse.json({ error: "Draft not found." }, { status: 404 });
    draft = data;
  }

  if (parsed.data.inReplyToMessageId) {
    const { data: replyTarget } = await supabase
      .from("mail_messages")
      .select("id, thread_id")
      .eq("id", parsed.data.inReplyToMessageId)
      .eq("mailbox_id", mailbox.id)
      .maybeSingle();
    if (!replyTarget) return NextResponse.json({ error: "Reply target not found." }, { status: 404 });
    if (parsed.data.threadId && replyTarget.thread_id !== parsed.data.threadId) {
      return NextResponse.json({ error: "Reply thread mismatch." }, { status: 400 });
    }
  }

  const service = createServiceClient();
  if (!service) return NextResponse.json({ error: "Mail delivery infrastructure is unavailable." }, { status: 503 });

  const allRecipientAddresses = [...new Set([...to, ...cc])];
  const { data: internal } = allRecipientAddresses.length
    ? await service.from("mailboxes").select("id, address").in("address", allRecipientAddresses).eq("is_active", true)
    : { data: [] as Array<{ id: string; address: string }> };

  const internalByAddress = new Map((internal ?? []).map((item) => [canonicalAddress(item.address), item.id as string]));
  const externalTo = to.filter((address) => !internalByAddress.has(address));
  const externalCc = cc.filter((address) => !internalByAddress.has(address));

  let attachmentRows: AttachmentRow[] = [];
  if (draft) {
    const { data } = await supabase
      .from("mail_attachments")
      .select("id, message_id, mailbox_id, file_name, storage_path, mime, byte_size")
      .eq("message_id", draft.id)
      .order("created_at", { ascending: true });
    attachmentRows = (data ?? []) as AttachmentRow[];
  }

  let providerMessageId: string | null = null;
  if (externalTo.length || externalCc.length) {
    let providerAttachments: MailProviderAttachment[] = [];
    try {
      providerAttachments = attachmentRows.length ? await loadProviderAttachments(service, attachmentRows) : [];
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Could not prepare attachments." }, { status: 500 });
    }

    const sent = await sendInternetMail({
      from: mailbox.display_name ? mailbox.display_name + " <" + mailbox.address + ">" : mailbox.address,
      to: externalTo.length ? externalTo : externalCc,
      cc: externalTo.length ? externalCc : [],
      subject: parsed.data.subject,
      text: parsed.data.text,
      attachments: providerAttachments,
      replyTo: [mailbox.address],
    });
    if (!sent.ok) return NextResponse.json({ error: sent.reason }, { status: 503 });
    providerMessageId = sent.providerMessageId;
  }

  let senderThreadId: string;
  try {
    senderThreadId = await findOrCreateThread({
      client: supabase,
      mailboxId: mailbox.id,
      mailboxAddress: mailbox.address,
      subject: parsed.data.subject,
      otherAddresses: allRecipientAddresses,
      preferredThreadId: parsed.data.threadId ?? draft?.thread_id,
    });
  } catch {
    return NextResponse.json({ error: "Could not create mail thread." }, { status: 500 });
  }

  let senderMessageId: string;
  if (draft) {
    const { data: updated, error } = await supabase
      .from("mail_messages")
      .update({
        thread_id: senderThreadId,
        provider_message_id: providerMessageId,
        direction: "outbound",
        folder: "sent",
        from_address: mailbox.address,
        to_addresses: to,
        cc_addresses: cc,
        subject: parsed.data.subject,
        body_text: parsed.data.text,
        status: "sent",
        read_at: new Date().toISOString(),
        in_reply_to_message_id: parsed.data.inReplyToMessageId ?? null,
      })
      .eq("id", draft.id)
      .eq("mailbox_id", mailbox.id)
      .select("id")
      .single();

    if (error || !updated) return NextResponse.json({ error: "Provider accepted mail, but Kebu could not finalize the sent copy." }, { status: 500 });
    senderMessageId = updated.id;
  } else {
    const { data: created, error } = await supabase
      .from("mail_messages")
      .insert({
        mailbox_id: mailbox.id,
        thread_id: senderThreadId,
        provider_message_id: providerMessageId,
        direction: "outbound",
        folder: "sent",
        from_address: mailbox.address,
        to_addresses: to,
        cc_addresses: cc,
        subject: parsed.data.subject,
        body_text: parsed.data.text,
        status: "sent",
        read_at: new Date().toISOString(),
        in_reply_to_message_id: parsed.data.inReplyToMessageId ?? null,
      })
      .select("id")
      .single();

    if (error || !created) return NextResponse.json({ error: "Provider accepted mail, but Kebu could not save the sent copy." }, { status: 500 });
    senderMessageId = created.id;
  }

  await supabase.from("mail_threads").update({
    subject: parsed.data.subject || "(no subject)",
    last_message_at: new Date().toISOString(),
  }).eq("id", senderThreadId);

  let internalDelivered = 0;
  for (const address of allRecipientAddresses) {
    const recipientMailboxId = internalByAddress.get(address);
    if (!recipientMailboxId) continue;

    const { data: recipientMailbox } = await service
      .from("mailboxes")
      .select("id, address")
      .eq("id", recipientMailboxId)
      .maybeSingle();
    if (!recipientMailbox) continue;

    let recipientThreadId: string;
    try {
      recipientThreadId = await findOrCreateThread({
        client: service,
        mailboxId: recipientMailboxId,
        mailboxAddress: recipientMailbox.address,
        subject: parsed.data.subject,
        otherAddresses: [mailbox.address, ...allRecipientAddresses],
      });
    } catch {
      continue;
    }

    const { data: recipientMessage, error: recipientMessageError } = await service
      .from("mail_messages")
      .insert({
        mailbox_id: recipientMailboxId,
        thread_id: recipientThreadId,
        provider_message_id: providerMessageId,
        direction: "inbound",
        folder: "inbox",
        from_address: mailbox.address,
        to_addresses: to,
        cc_addresses: cc,
        subject: parsed.data.subject,
        body_text: parsed.data.text,
        status: "received",
      })
      .select("id")
      .single();

    if (recipientMessageError || !recipientMessage) continue;

    for (const attachment of attachmentRows) {
      const recipientPath = `${user.id}/mail-delivery/${recipientMailboxId}/${recipientMessage.id}/${crypto.randomUUID()}-${attachment.file_name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 180)}`;
      const { error: copyError } = await service.storage.from("digital-files").copy(attachment.storage_path, recipientPath);
      if (copyError) continue;
      await service.from("mail_attachments").insert({
        message_id: recipientMessage.id,
        mailbox_id: recipientMailboxId,
        uploaded_by: null,
        file_name: attachment.file_name,
        storage_path: recipientPath,
        mime: attachment.mime,
        byte_size: attachment.byte_size,
      });
    }

    await service.from("mail_threads").update({
      subject: parsed.data.subject || "(no subject)",
      last_message_at: new Date().toISOString(),
    }).eq("id", recipientThreadId);

    internalDelivered += 1;
  }

  return NextResponse.json({
    ok: true,
    messageId: senderMessageId,
    threadId: senderThreadId,
    providerMessageId,
    internalDelivered,
    externalSent: externalTo.length + externalCc.length,
    attachments: attachmentRows.length,
  });
}
