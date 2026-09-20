import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";
import { createServiceClient } from "@/lib/opportunity/admin";
import { sendInternetMail } from "@/lib/mail/provider";

export const dynamic = "force-dynamic";

const sendSchema = z.object({
  mailboxId: z.string().uuid(),
  to: z.array(z.string().email()).min(1).max(20),
  cc: z.array(z.string().email()).max(20).default([]),
  subject: z.string().trim().max(240).default(""),
  text: z.string().max(100000),
});

export async function POST(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase } = auth;
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid email.", issues: parsed.error.flatten() }, { status: 400 });

  const { data: mailbox } = await supabase
    .from("mailboxes")
    .select("id, address, display_name")
    .eq("id", parsed.data.mailboxId)
    .eq("is_active", true)
    .maybeSingle();
  if (!mailbox) return NextResponse.json({ error: "Mailbox not available." }, { status: 403 });

  const recipients = parsed.data.to.map((address) => address.toLowerCase());
  const admin = createServiceClient();
  const { data: internal } = admin
    ? await admin.from("mailboxes").select("id, address").in("address", recipients).eq("is_active", true)
    : { data: [] as Array<{ id: string; address: string }> };

  const internalByAddress = new Map((internal ?? []).map((item) => [item.address, item.id]));
  const external = recipients.filter((address) => !internalByAddress.has(address));

  let providerMessageId: string | null = null;
  if (external.length) {
    const sent = await sendInternetMail({
      from: mailbox.display_name ? mailbox.display_name + " <" + mailbox.address + ">" : mailbox.address,
      to: external,
      cc: parsed.data.cc,
      subject: parsed.data.subject,
      text: parsed.data.text,
    });
    if (!sent.ok) return NextResponse.json({ error: sent.reason }, { status: 503 });
    providerMessageId = sent.providerMessageId;
  }

  const { data: senderThread, error: senderThreadError } = await supabase
    .from("mail_threads")
    .insert({ mailbox_id: mailbox.id, subject: parsed.data.subject || "(no subject)" })
    .select("id")
    .single();
  if (senderThreadError || !senderThread) return NextResponse.json({ error: "Could not save sent mail." }, { status: 500 });

  const { error: senderMessageError } = await supabase.from("mail_messages").insert({
    mailbox_id: mailbox.id,
    thread_id: senderThread.id,
    provider_message_id: providerMessageId,
    direction: "outbound",
    folder: "sent",
    from_address: mailbox.address,
    to_addresses: recipients,
    cc_addresses: parsed.data.cc.map((value) => value.toLowerCase()),
    subject: parsed.data.subject,
    body_text: parsed.data.text,
    status: "sent",
    read_at: new Date().toISOString(),
  });
  if (senderMessageError) return NextResponse.json({ error: "Could not save sent mail." }, { status: 500 });

  if (admin) {
    for (const address of recipients) {
      const recipientMailboxId = internalByAddress.get(address);
      if (!recipientMailboxId) continue;
      const { data: thread } = await admin.from("mail_threads").insert({
        mailbox_id: recipientMailboxId,
        subject: parsed.data.subject || "(no subject)",
      }).select("id").single();
      if (!thread) continue;
      await admin.from("mail_messages").insert({
        mailbox_id: recipientMailboxId,
        thread_id: thread.id,
        provider_message_id: providerMessageId,
        direction: "inbound",
        folder: "inbox",
        from_address: mailbox.address,
        to_addresses: [address],
        cc_addresses: parsed.data.cc.map((value) => value.toLowerCase()),
        subject: parsed.data.subject,
        body_text: parsed.data.text,
        status: "received",
      });
    }
  }

  return NextResponse.json({ ok: true, providerMessageId, internalDelivered: (internal ?? []).length, externalSent: external.length });
}
