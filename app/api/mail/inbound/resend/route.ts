import { NextResponse } from "next/server";
import { Resend } from "resend";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/opportunity/admin";
import { canonicalAddress, mailThreadIdentity } from "@/lib/mail/threading";

export const dynamic = "force-dynamic";

type ReceivedEvent = {
  type?: string;
  data?: {
    email_id?: string;
    from?: string;
    to?: string[];
    cc?: string[];
    subject?: string;
  };
};

type ReceivedAttachment = {
  id: string;
  filename: string;
  content_type?: string | null;
  download_url?: string | null;
};

type ReceivedAttachmentList = {
  data?: ReceivedAttachment[] | null;
  error?: unknown;
};

async function findOrCreateInboundThread(opts: {
  admin: SupabaseClient;
  mailboxId: string;
  mailboxAddress: string;
  subject: string;
  from: string;
  recipients: string[];
  cc: string[];
}) {
  const identity = mailThreadIdentity({
    subject: opts.subject,
    mailboxAddress: opts.mailboxAddress,
    otherAddresses: [opts.from, ...opts.recipients, ...opts.cc],
  });

  const { data: existing } = await opts.admin
    .from("mail_threads")
    .select("id")
    .eq("mailbox_id", opts.mailboxId)
    .eq("normalized_subject", identity.normalizedSubject)
    .eq("participant_key", identity.participantKey)
    .order("last_message_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) return existing.id as string;

  const { data: created, error } = await opts.admin
    .from("mail_threads")
    .insert({
      mailbox_id: opts.mailboxId,
      subject: opts.subject || "(no subject)",
      normalized_subject: identity.normalizedSubject,
      participant_key: identity.participantKey,
    })
    .select("id")
    .single();
  if (error || !created) throw new Error("Could not create inbound thread.");
  return created.id as string;
}

export async function POST(req: Request) {
  const apiKey = process.env.RESEND_API_KEY;
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  if (!apiKey || !webhookSecret) {
    return NextResponse.json({ error: "Mail inbound is not configured." }, { status: 503 });
  }

  const payload = await req.text();
  const resend = new Resend(apiKey);

  let event: ReceivedEvent;
  try {
    event = resend.webhooks.verify({
      payload,
      headers: {
        id: req.headers.get("svix-id") ?? "",
        timestamp: req.headers.get("svix-timestamp") ?? "",
        signature: req.headers.get("svix-signature") ?? "",
      },
      webhookSecret,
    }) as ReceivedEvent;
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
  }

  if (event.type !== "email.received" || !event.data?.email_id) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const admin = createServiceClient();
  if (!admin) return NextResponse.json({ error: "Service database client unavailable." }, { status: 503 });

  const recipients = (event.data.to ?? []).map(canonicalAddress);
  const cc = (event.data.cc ?? []).map(canonicalAddress);
  if (!recipients.length) return NextResponse.json({ ok: true, ignored: true });

  const { data: mailboxes } = await admin
    .from("mailboxes")
    .select("id, address")
    .in("address", recipients)
    .eq("is_active", true);
  if (!mailboxes?.length) return NextResponse.json({ ok: true, ignored: true });

  let bodyText = "";
  try {
    const received = await resend.emails.receiving.get(event.data.email_id);
    const payloadData = received.data as { text?: string | null } | null;
    bodyText = payloadData?.text ?? "";
  } catch {
    bodyText = "";
  }

  let inboundAttachments: ReceivedAttachment[] = [];
  try {
    const receiving = resend.emails.receiving as unknown as {
      attachments: {
        list(args: { emailId: string }): Promise<ReceivedAttachmentList>;
      };
    };
    const result = await receiving.attachments.list({ emailId: event.data.email_id });
    inboundAttachments = result.data ?? [];
  } catch {
    inboundAttachments = [];
  }

  const from = canonicalAddress(event.data.from ?? "unknown@example.invalid");
  let delivered = 0;
  let attachmentCount = 0;

  for (const mailbox of mailboxes) {
    const { data: existing } = await admin
      .from("mail_messages")
      .select("id")
      .eq("mailbox_id", mailbox.id)
      .eq("provider_message_id", event.data.email_id)
      .maybeSingle();
    if (existing) continue;

    let threadId: string;
    try {
      threadId = await findOrCreateInboundThread({
        admin,
        mailboxId: mailbox.id,
        mailboxAddress: mailbox.address,
        subject: event.data.subject ?? "",
        from,
        recipients,
        cc,
      });
    } catch {
      continue;
    }

    const { data: message, error } = await admin
      .from("mail_messages")
      .insert({
        mailbox_id: mailbox.id,
        thread_id: threadId,
        provider_message_id: event.data.email_id,
        direction: "inbound",
        folder: "inbox",
        from_address: from,
        to_addresses: recipients,
        cc_addresses: cc,
        subject: event.data.subject ?? "",
        body_text: bodyText,
        status: "received",
      })
      .select("id")
      .single();

    if (error || !message) continue;

    for (const attachment of inboundAttachments) {
      if (!attachment.download_url) continue;
      try {
        const response = await fetch(attachment.download_url, { redirect: "follow" });
        if (!response.ok) continue;
        const length = Number(response.headers.get("content-length") || "0");
        if (length > 25 * 1024 * 1024) continue;
        const buffer = new Uint8Array(await response.arrayBuffer());
        if (!buffer.byteLength || buffer.byteLength > 25 * 1024 * 1024) continue;

        const safeName = (attachment.filename || "attachment")
          .replace(/[^a-zA-Z0-9._-]+/g, "-")
          .slice(0, 180);
        const storagePath = `mail-inbound/${mailbox.id}/${message.id}/${crypto.randomUUID()}-${safeName}`;
        const mime = (attachment.content_type || response.headers.get("content-type") || "application/octet-stream").toLowerCase();

        const { error: uploadError } = await admin.storage
          .from("digital-files")
          .upload(storagePath, buffer, { contentType: mime, upsert: false });
        if (uploadError) continue;

        const { error: attachmentError } = await admin.from("mail_attachments").insert({
          message_id: message.id,
          mailbox_id: mailbox.id,
          uploaded_by: null,
          file_name: attachment.filename || "attachment",
          storage_path: storagePath,
          mime,
          byte_size: buffer.byteLength,
          provider_attachment_id: attachment.id,
        });

        if (attachmentError) {
          await admin.storage.from("digital-files").remove([storagePath]);
          continue;
        }
        attachmentCount += 1;
      } catch {
        continue;
      }
    }

    await admin
      .from("mail_threads")
      .update({
        subject: event.data.subject || "(no subject)",
        last_message_at: new Date().toISOString(),
      })
      .eq("id", threadId);

    delivered += 1;
  }

  return NextResponse.json({ ok: true, delivered, attachments: attachmentCount });
}
