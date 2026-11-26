import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/opportunity/admin";
import { requireCronSecret } from "@/lib/api-guard";
import {
  activeSuppressions,
  externalMailReadiness,
  loadMailAttachments,
  nextMailRetry,
} from "@/lib/mail/delivery";
import { sendInternetMail, type MailProviderName } from "@/lib/mail/provider";
import { canonicalAddress } from "@/lib/mail/threading";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type DeliveryJob = {
  id: string;
  message_id: string;
  mailbox_id: string;
  provider: MailProviderName;
  attempt_count: number;
  max_attempts: number;
};

async function setProviderSuccess(service: NonNullable<ReturnType<typeof createServiceClient>>, provider: string) {
  await service.from("mail_provider_health").update({
    consecutive_failures: 0,
    cooldown_until: null,
    last_success_at: new Date().toISOString(),
    last_error: null,
    updated_at: new Date().toISOString(),
  }).eq("provider", provider);
}

async function setProviderFailure(
  service: NonNullable<ReturnType<typeof createServiceClient>>,
  provider: string,
  reason: string,
) {
  const { data: health } = await service
    .from("mail_provider_health")
    .select("consecutive_failures")
    .eq("provider", provider)
    .maybeSingle();
  const failures = Number(health?.consecutive_failures ?? 0) + 1;
  const cooldownUntil = failures >= 5 ? new Date(Date.now() + 5 * 60_000).toISOString() : null;

  await service.from("mail_provider_health").update({
    consecutive_failures: failures,
    cooldown_until: cooldownUntil,
    last_failure_at: new Date().toISOString(),
    last_error: reason.slice(0, 500),
    updated_at: new Date().toISOString(),
  }).eq("provider", provider);

  if (failures === 5) {
    await service.from("mail_operational_alerts").insert({
      severity: "critical",
      alert_type: "provider_failure_streak",
      provider,
      message: "Mail provider failed five consecutive delivery attempts.",
      metadata: { failures, reason: reason.slice(0, 500) },
    });
  }
}

async function retryOrFail(
  service: NonNullable<ReturnType<typeof createServiceClient>>,
  job: DeliveryJob,
  reason: string,
  retryable: boolean,
) {
  const exhausted = !retryable || job.attempt_count >= job.max_attempts;
  if (exhausted) {
    await service.from("mail_delivery_jobs").update({
      status: "failed",
      locked_at: null,
      locked_by: null,
      last_error: reason.slice(0, 1000),
      updated_at: new Date().toISOString(),
    }).eq("id", job.id);
    await service.from("mail_messages").update({ status: "failed" }).eq("id", job.message_id);
    await service.from("mail_operational_alerts").insert({
      severity: "warning",
      alert_type: "delivery_exhausted",
      provider: job.provider,
      mailbox_id: job.mailbox_id,
      message: "An outbound message exhausted its delivery attempts.",
      metadata: { jobId: job.id, messageId: job.message_id, attempts: job.attempt_count },
    });
    return "failed" as const;
  }

  await service.from("mail_delivery_jobs").update({
    status: "retry",
    next_attempt_at: nextMailRetry(job.attempt_count),
    locked_at: null,
    locked_by: null,
    last_error: reason.slice(0, 1000),
    updated_at: new Date().toISOString(),
  }).eq("id", job.id);
  return "retry" as const;
}

async function processJob(
  service: NonNullable<ReturnType<typeof createServiceClient>>,
  job: DeliveryJob,
) {
  const { data: providerHealth } = await service
    .from("mail_provider_health")
    .select("is_enabled,cooldown_until")
    .eq("provider", job.provider)
    .maybeSingle();

  if (!providerHealth?.is_enabled) {
    return retryOrFail(service, job, "Mail provider is disabled.", true);
  }
  if (providerHealth.cooldown_until && new Date(providerHealth.cooldown_until).getTime() > Date.now()) {
    await service.from("mail_delivery_jobs").update({
      status: "retry",
      next_attempt_at: providerHealth.cooldown_until,
      locked_at: null,
      locked_by: null,
      updated_at: new Date().toISOString(),
    }).eq("id", job.id);
    return "retry" as const;
  }

  const { data: message } = await service
    .from("mail_messages")
    .select("id,from_address,to_addresses,cc_addresses,subject,body_text")
    .eq("id", job.message_id)
    .maybeSingle();
  const { data: mailbox } = await service
    .from("mailboxes")
    .select("id,mailbox_type,address,business_id,mail_domain_id,display_name,is_active")
    .eq("id", job.mailbox_id)
    .maybeSingle();

  if (!message || !mailbox?.is_active) {
    return retryOrFail(service, job, "Message or mailbox no longer exists.", false);
  }

  const readiness = await externalMailReadiness(service, mailbox);
  if (!readiness.ready) {
    return retryOrFail(service, job, readiness.reason, true);
  }

  const allRecipients = [
    ...((message.to_addresses ?? []) as string[]).map(canonicalAddress),
    ...((message.cc_addresses ?? []) as string[]).map(canonicalAddress),
  ];
  const { data: internal } = allRecipients.length
    ? await service.from("mailboxes").select("address").in("address", allRecipients).eq("is_active", true)
    : { data: [] as Array<{ address: string }> };
  const internalAddresses = new Set((internal ?? []).map((row) => canonicalAddress(row.address)));

  const externalTo = ((message.to_addresses ?? []) as string[])
    .map(canonicalAddress)
    .filter((address) => !internalAddresses.has(address));
  const externalCc = ((message.cc_addresses ?? []) as string[])
    .map(canonicalAddress)
    .filter((address) => !internalAddresses.has(address));

  const suppressed = await activeSuppressions(service, [...externalTo, ...externalCc]);
  const deliverableTo = externalTo.filter((address) => !suppressed.has(address));
  const deliverableCc = externalCc.filter((address) => !suppressed.has(address));

  if (!deliverableTo.length && !deliverableCc.length) {
    await service.from("mail_delivery_jobs").update({
      status: "suppressed",
      locked_at: null,
      locked_by: null,
      last_error: "All external recipients are suppressed.",
      updated_at: new Date().toISOString(),
    }).eq("id", job.id);
    await service.from("mail_messages").update({ status: "suppressed" }).eq("id", job.message_id);
    return "suppressed" as const;
  }

  let attachments;
  try {
    attachments = await loadMailAttachments(service, job.message_id);
  } catch (error) {
    return retryOrFail(
      service,
      job,
      error instanceof Error ? error.message : "Could not prepare attachments.",
      false,
    );
  }

  const result = await sendInternetMail({
    from: mailbox.display_name
      ? mailbox.display_name + " <" + mailbox.address + ">"
      : mailbox.address,
    to: deliverableTo.length ? deliverableTo : deliverableCc,
    cc: deliverableTo.length ? deliverableCc : [],
    subject: message.subject ?? "",
    text: message.body_text ?? "",
    attachments,
    replyTo: [mailbox.address],
  }, job.provider);

  if (!result.ok) {
    await setProviderFailure(service, job.provider, result.reason);
    return retryOrFail(service, job, result.reason, result.retryable);
  }

  const now = new Date().toISOString();
  await service.from("mail_delivery_jobs").update({
    status: "sent",
    provider_message_id: result.providerMessageId,
    sent_at: now,
    locked_at: null,
    locked_by: null,
    last_error: null,
    updated_at: now,
  }).eq("id", job.id);
  await service.from("mail_messages").update({
    status: "sent",
    provider_message_id: result.providerMessageId,
  }).eq("id", job.message_id);
  await setProviderSuccess(service, job.provider);

  return "sent" as const;
}

export async function GET(req: NextRequest) {
  const blocked = requireCronSecret(req);
  if (blocked) return blocked;

  const service = createServiceClient();
  if (!service) return NextResponse.json({ error: "Service database client unavailable." }, { status: 503 });

  const workerId = "vercel:" + crypto.randomUUID();
  const deadline = Date.now() + 45_000;
  const totals = { claimed: 0, sent: 0, retry: 0, failed: 0, suppressed: 0 };

  while (Date.now() < deadline && totals.claimed < 400) {
    const { data, error } = await service.rpc("claim_mail_delivery_jobs", {
      p_worker_id: workerId,
      p_limit: 40,
    });
    if (error) return NextResponse.json({ error: "Could not claim mail delivery jobs." }, { status: 500 });

    const jobs = (data ?? []) as DeliveryJob[];
    if (!jobs.length) break;
    totals.claimed += jobs.length;

    for (let i = 0; i < jobs.length; i += 8) {
      const chunk = jobs.slice(i, i + 8);
      const outcomes = await Promise.all(chunk.map((job) => processJob(service, job)));
      for (const outcome of outcomes) totals[outcome] += 1;
      if (Date.now() >= deadline) break;
    }
  }

  await service.rpc("cleanup_mail_operational_data");
  return NextResponse.json({ ok: true, ...totals });
}
