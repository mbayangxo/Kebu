import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";
import { createServiceClient } from "@/lib/opportunity/admin";
import { canonicalAddress, mailThreadIdentity } from "@/lib/mail/threading";
import { assertMailboxSendAccess } from "@/lib/mail/business-mail";
import { activeSuppressions, externalMailReadiness } from "@/lib/mail/delivery";

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

export async function POST(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const to = [...new Set(parsed.data.to.map(canonicalAddress))];
  const cc = [...new Set(parsed.data.cc.map(canonicalAddress).filter((address) => !to.includes(address)))];
  const allRecipientAddresses = [...to, ...cc];

  const mailbox = await assertMailboxSendAccess(supabase, user.id, parsed.data.mailboxId);
  if (!mailbox) {
    return NextResponse.json({ error: "You do not have permission to send from this mailbox." }, { status: 403 });
  }

  const service = createServiceClient();
  if (!service) {
    return NextResponse.json({ error: "Mail delivery infrastructure is unavailable." }, { status: 503 });
  }

  const { data: internal } = allRecipientAddresses.length
    ? await service.from("mailboxes").select("id,address").in("address", allRecipientAddresses).eq("is_active", true)
    : { data: [] as Array<{ id: string; address: string }> };

  const internalByAddress = new Map((internal ?? []).map((item) => [canonicalAddress(item.address), item.id as string]));
  const externalTo = to.filter((address) => !internalByAddress.has(address));
  const externalCc = cc.filter((address) => !internalByAddress.has(address));
  const externalAddresses = [...externalTo, ...externalCc];

  if (externalAddresses.length) {
    const readiness = await externalMailReadiness(service, mailbox);
    if (!readiness.ready) {
      return NextResponse.json({
        error: readiness.reason,
        code: "MAIL_DOMAIN_NOT_READY",
        internalMailAvailable: true,
      }, { status: 409 });
    }

    const suppressed = await activeSuppressions(service, externalAddresses);
    if (suppressed.size) {
      return NextResponse.json({
        error: "One or more recipients are suppressed after a bounce, complaint, or provider suppression.",
        code: "MAIL_RECIPIENT_SUPPRESSED",
        suppressedCount: suppressed.size,
      }, { status: 422 });
    }
  }

  const estimatedBytes = new TextEncoder().encode(parsed.data.text).byteLength;
  const { error: quotaError } = await service.rpc("mail_reserve_send_quota", {
    p_mailbox_id: mailbox.id,
    p_recipient_count: allRecipientAddresses.length,
    p_estimated_bytes: estimatedBytes,
  });
  if (quotaError) {
    return NextResponse.json({
      error: "This mailbox is sending too quickly. Wait a moment and try again.",
      code: "MAIL_RATE_LIMIT",
    }, { status: 429, headers: { "Retry-After": "60" } });
  }

  let draft: { id: string; thread_id: string } | null = null;
  if (parsed.data.draftId) {
    const { data } = await supabase
      .from("mail_messages")
      .select("id,thread_id")
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
      .select("id,thread_id")
      .eq("id", parsed.data.inReplyToMessageId)
      .eq("mailbox_id", mailbox.id)
      .maybeSingle();
    if (!replyTarget) return NextResponse.json({ error: "Reply target not found." }, { status: 404 });
    if (parsed.data.threadId && replyTarget.thread_id !== parsed.data.threadId) {
      return NextResponse.json({ error: "Reply thread mismatch." }, { status: 400 });
    }
  }

  let attachmentRows: AttachmentRow[] = [];
  if (draft) {
    const { data } = await supabase
      .from("mail_attachments")
      .select("id,message_id,mailbox_id,file_name,storage_path,mime,byte_size")
      .eq("message_id", draft.id)
      .order("created_at", { ascending: true });
    attachmentRows = (data ?? []) as AttachmentRow[];
    const totalBytes = attachmentRows.reduce((sum, item) => sum + Number(item.byte_size || 0), 0);
    if (totalBytes > 35 * 1024 * 1024) {
      return NextResponse.json({ error: "Attachments exceed the 35 MB delivery limit." }, { status: 413 });
    }
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

  const outgoingStatus = externalAddresses.length ? "queued" : "sent";
  let senderMessageId: string;

  if (draft) {
    const { data: updated, error } = await supabase
      .from("mail_messages")
      .update({
        thread_id: senderThreadId,
        provider_message_id: null,
        direction: "outbound",
        folder: "sent",
        from_address: mailbox.address,
        to_addresses: to,
        cc_addresses: cc,
        subject: parsed.data.subject,
        body_text: parsed.data.text,
        status: outgoingStatus,
        read_at: new Date().toISOString(),
        in_reply_to_message_id: parsed.data.inReplyToMessageId ?? null,
      })
      .eq("id", draft.id)
      .eq("mailbox_id", mailbox.id)
      .select("id")
      .single();
    if (error || !updated) return NextResponse.json({ error: "Could not finalize the sent copy." }, { status: 500 });
    senderMessageId = updated.id;
  } else {
    const { data: created, error } = await supabase
      .from("mail_messages")
      .insert({
        mailbox_id: mailbox.id,
        thread_id: senderThreadId,
        provider_message_id: null,
        direction: "outbound",
        folder: "sent",
        from_address: mailbox.address,
        to_addresses: to,
        cc_addresses: cc,
        subject: parsed.data.subject,
        body_text: parsed.data.text,
        status: outgoingStatus,
        read_at: new Date().toISOString(),
        in_reply_to_message_id: parsed.data.inReplyToMessageId ?? null,
      })
      .select("id")
      .single();
    if (error || !created) return NextResponse.json({ error: "Could not save the sent copy." }, { status: 500 });
    senderMessageId = created.id;
  }

  if (externalAddresses.length) {
    const readiness = await externalMailReadiness(service, mailbox);
    if (!readiness.ready) {
      await service.from("mail_messages").update({ status: "failed" }).eq("id", senderMessageId);
      return NextResponse.json({ error: readiness.reason }, { status: 409 });
    }

    const { error: enqueueError } = await service.from("mail_delivery_jobs").insert({
      message_id: senderMessageId,
      mailbox_id: mailbox.id,
      provider: readiness.provider,
      status: "queued",
      idempotency_key: "message:" + senderMessageId,
    });

    if (enqueueError) {
      await service.from("mail_messages").update({ status: "failed" }).eq("id", senderMessageId);
      return NextResponse.json({ error: "Could not queue external delivery." }, { status: 503 });
    }
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
      .select("id,address")
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

    const { data: recipientMessage, error } = await service
      .from("mail_messages")
      .insert({
        mailbox_id: recipientMailboxId,
        thread_id: recipientThreadId,
        provider_message_id: null,
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

    if (error || !recipientMessage) continue;

    for (const attachment of attachmentRows) {
      const safeName = attachment.file_name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 180);
      const recipientPath = `mail-internal/${recipientMailboxId}/${recipientMessage.id}/${crypto.randomUUID()}-${safeName}`;
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

  await supabase.from("mail_audit_events").insert({
    mailbox_id: mailbox.id,
    business_id: mailbox.business_id ?? null,
    actor_user_id: user.id,
    event_type: externalAddresses.length ? "mail.queued" : "mail.sent",
    metadata: {
      recipientCount: allRecipientAddresses.length,
      externalRecipientCount: externalAddresses.length,
      internalDelivered,
      attachmentCount: attachmentRows.length,
      threadId: senderThreadId,
      messageId: senderMessageId,
    },
  });

  return NextResponse.json({
    ok: true,
    messageId: senderMessageId,
    threadId: senderThreadId,
    status: outgoingStatus,
    internalDelivered,
    externalQueued: externalAddresses.length,
    attachments: attachmentRows.length,
  });
}
