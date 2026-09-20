import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createServiceClient } from "@/lib/opportunity/admin";

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

function addressOnly(value: string): string {
  const match = value.match(/<([^>]+)>/);
  return (match?.[1] ?? value).trim().toLowerCase();
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

  const recipients = (event.data.to ?? []).map(addressOnly);
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

  const from = addressOnly(event.data.from ?? "unknown@example.invalid");
  for (const mailbox of mailboxes) {
    const { data: existing } = await admin
      .from("mail_messages")
      .select("id")
      .eq("mailbox_id", mailbox.id)
      .eq("provider_message_id", event.data.email_id)
      .maybeSingle();
    if (existing) continue;

    const { data: thread } = await admin
      .from("mail_threads")
      .insert({ mailbox_id: mailbox.id, subject: event.data.subject || "(no subject)" })
      .select("id")
      .single();
    if (!thread) continue;

    await admin.from("mail_messages").insert({
      mailbox_id: mailbox.id,
      thread_id: thread.id,
      provider_message_id: event.data.email_id,
      direction: "inbound",
      folder: "inbox",
      from_address: from,
      to_addresses: recipients,
      cc_addresses: (event.data.cc ?? []).map(addressOnly),
      subject: event.data.subject ?? "",
      body_text: bodyText,
      status: "received",
    });
  }

  return NextResponse.json({ ok: true, delivered: mailboxes.length });
}
