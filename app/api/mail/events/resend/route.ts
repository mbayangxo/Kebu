import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createServiceClient } from "@/lib/opportunity/admin";
import { canonicalAddress } from "@/lib/mail/threading";

export const dynamic = "force-dynamic";

type ResendEvent = {
  type?: string;
  created_at?: string;
  data?: {
    email_id?: string;
    to?: string[] | string;
    from?: string;
    subject?: string;
  };
};

const TRACKED = new Set([
  "email.sent",
  "email.delivered",
  "email.delivery_delayed",
  "email.bounced",
  "email.complained",
  "email.failed",
  "email.suppressed",
]);

function recipients(event: ResendEvent): string[] {
  const to = event.data?.to;
  if (Array.isArray(to)) return to.map(canonicalAddress);
  return typeof to === "string" ? [canonicalAddress(to)] : [];
}

function messageStatus(eventType: string): string | null {
  if (eventType === "email.sent") return "sent";
  if (eventType === "email.delivered") return "delivered";
  if (eventType === "email.delivery_delayed") return "delivery_delayed";
  if (eventType === "email.bounced") return "bounced";
  if (eventType === "email.complained") return "complained";
  if (eventType === "email.failed") return "failed";
  if (eventType === "email.suppressed") return "suppressed";
  return null;
}

function suppressionReason(eventType: string): "hard_bounce" | "complaint" | "provider_suppressed" | null {
  if (eventType === "email.bounced") return "hard_bounce";
  if (eventType === "email.complained") return "complaint";
  if (eventType === "email.suppressed") return "provider_suppressed";
  return null;
}

export async function POST(req: Request) {
  const apiKey = process.env.RESEND_API_KEY;
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  if (!apiKey || !webhookSecret) {
    return NextResponse.json({ error: "Mail webhooks are not configured." }, { status: 503 });
  }

  const payload = await req.text();
  const webhookId = req.headers.get("svix-id") ?? "";
  const resend = new Resend(apiKey);

  let event: ResendEvent;
  try {
    event = resend.webhooks.verify({
      payload,
      headers: {
        id: webhookId,
        timestamp: req.headers.get("svix-timestamp") ?? "",
        signature: req.headers.get("svix-signature") ?? "",
      },
      webhookSecret,
    }) as ResendEvent;
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
  }

  if (!event.type || !TRACKED.has(event.type) || !event.data?.email_id) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const service = createServiceClient();
  if (!service) return NextResponse.json({ error: "Service database client unavailable." }, { status: 503 });

  const providerEventId = webhookId || event.type + ":" + event.data.email_id + ":" + (event.created_at ?? "");
  const { error: eventError } = await service.from("mail_delivery_events").insert({
    provider: "resend",
    provider_event_id: providerEventId,
    provider_message_id: event.data.email_id,
    event_type: event.type,
    recipient: recipients(event)[0] ?? null,
    occurred_at: event.created_at ?? new Date().toISOString(),
    payload: event,
  });

  if (eventError?.code === "23505") {
    return NextResponse.json({ ok: true, duplicate: true });
  }
  if (eventError) {
    return NextResponse.json({ error: "Could not persist mail event." }, { status: 500 });
  }

  const { data: job } = await service
    .from("mail_delivery_jobs")
    .select("id,message_id,mailbox_id")
    .eq("provider_message_id", event.data.email_id)
    .maybeSingle();

  if (!job) return NextResponse.json({ ok: true, unmatched: true });

  const status = messageStatus(event.type);
  if (status) {
    await service.from("mail_messages").update({ status }).eq("id", job.message_id);
  }
  await service.from("mail_delivery_events").update({ message_id: job.message_id })
    .eq("provider", "resend")
    .eq("provider_event_id", providerEventId);

  const reason = suppressionReason(event.type);
  if (reason) {
    for (const address of recipients(event)) {
      const { data: current } = await service
        .from("mail_suppressions")
        .select("event_count,first_seen_at")
        .eq("address", address)
        .maybeSingle();
      await service.from("mail_suppressions").upsert({
        address,
        reason,
        source: "resend",
        active: true,
        event_count: Number(current?.event_count ?? 0) + 1,
        first_seen_at: current?.first_seen_at ?? new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
        metadata: { providerMessageId: event.data.email_id, eventType: event.type },
      }, { onConflict: "address" });
    }
  }

  await service.rpc("record_mail_domain_event", {
    p_mailbox_id: job.mailbox_id,
    p_event_type: event.type,
  });

  if (event.type === "email.complained") {
    await service.from("mail_operational_alerts").insert({
      severity: "critical",
      alert_type: "spam_complaint",
      provider: "resend",
      mailbox_id: job.mailbox_id,
      message: "A recipient marked a Kebu email as spam.",
      metadata: { providerMessageId: event.data.email_id, recipient: recipients(event)[0] ?? null },
    });
  }

  return NextResponse.json({ ok: true });
}
