import type { SupabaseClient } from "@supabase/supabase-js";
import { canonicalAddress, mailThreadIdentity } from "@/lib/mail/threading";
import { externalMailReadiness, type DeliverableMailbox } from "@/lib/mail/delivery";

const MAX_FORWARD_DEPTH = 5;

export type ForwardableMessage = {
  mailboxId: string;
  messageId: string;
  fromAddress: string;
  toAddresses: string[];
  ccAddresses: string[];
  subject: string;
  bodyText: string;
  depth: number;
};

type AttachmentRow = { file_name: string; storage_path: string; mime: string; byte_size: number };

async function copyAttachments(
  service: SupabaseClient,
  sourceMessageId: string,
  targetMailboxId: string,
  targetMessageId: string,
  prefix: string,
) {
  const { data: rows } = await service
    .from("mail_attachments")
    .select("file_name,storage_path,mime,byte_size")
    .eq("message_id", sourceMessageId)
    .order("created_at", { ascending: true });

  for (const attachment of (rows ?? []) as AttachmentRow[]) {
    const safeName = attachment.file_name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 180);
    const copyPath = `${prefix}/${targetMailboxId}/${targetMessageId}/${crypto.randomUUID()}-${safeName}`;
    const { error: copyError } = await service.storage.from("digital-files").copy(attachment.storage_path, copyPath);
    if (copyError) continue;
    await service.from("mail_attachments").insert({
      message_id: targetMessageId,
      mailbox_id: targetMailboxId,
      uploaded_by: null,
      file_name: attachment.file_name,
      storage_path: copyPath,
      mime: attachment.mime,
      byte_size: attachment.byte_size,
    });
  }
}

async function findOrCreateThread(
  service: SupabaseClient,
  mailboxId: string,
  mailboxAddress: string,
  subject: string,
  otherAddresses: string[],
): Promise<string | null> {
  const identity = mailThreadIdentity({ subject, mailboxAddress, otherAddresses });

  const { data: existing } = await service
    .from("mail_threads")
    .select("id")
    .eq("mailbox_id", mailboxId)
    .eq("normalized_subject", identity.normalizedSubject)
    .eq("participant_key", identity.participantKey)
    .order("last_message_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing) return existing.id as string;

  const { data: created, error } = await service
    .from("mail_threads")
    .insert({
      mailbox_id: mailboxId,
      subject: subject || "(no subject)",
      normalized_subject: identity.normalizedSubject,
      participant_key: identity.participantKey,
    })
    .select("id")
    .single();
  if (error || !created) return null;
  return created.id as string;
}

async function forwardInternally(
  service: SupabaseClient,
  ruleOwnerId: string,
  target: { id: string; address: string },
  message: ForwardableMessage,
) {
  const threadId = await findOrCreateThread(service, target.id, target.address, message.subject, [message.fromAddress]);
  if (!threadId) return;

  const { data: created, error } = await service
    .from("mail_messages")
    .insert({
      mailbox_id: target.id,
      thread_id: threadId,
      provider_message_id: null,
      direction: "inbound",
      folder: "inbox",
      from_address: message.fromAddress,
      to_addresses: [target.address],
      cc_addresses: [],
      subject: message.subject,
      body_text: message.bodyText,
      status: "received",
      forwarded_from_message_id: message.messageId,
      forward_depth: message.depth + 1,
    })
    .select("id")
    .single();
  if (error || !created) return;

  await copyAttachments(service, message.messageId, target.id, created.id, "mail-forwarded");
  await service.from("mail_threads").update({
    subject: message.subject || "(no subject)",
    last_message_at: new Date().toISOString(),
  }).eq("id", threadId);

  await service.from("mail_audit_events").insert({
    mailbox_id: target.id,
    business_id: null,
    actor_user_id: ruleOwnerId,
    event_type: "mail.forwarded",
    metadata: { sourceMessageId: message.messageId, depth: message.depth + 1 },
  });

  await processMailForwarding(service, {
    mailboxId: target.id,
    messageId: created.id,
    fromAddress: message.fromAddress,
    toAddresses: message.toAddresses,
    ccAddresses: message.ccAddresses,
    subject: message.subject,
    bodyText: message.bodyText,
    depth: message.depth + 1,
  });
}

async function forwardExternally(
  service: SupabaseClient,
  ruleOwnerId: string,
  sourceMailbox: DeliverableMailbox,
  targetAddress: string,
  message: ForwardableMessage,
) {
  const readiness = await externalMailReadiness(service, sourceMailbox);
  if (!readiness.ready) {
    await service.from("mail_operational_alerts").insert({
      severity: "warning",
      alert_type: "forward_not_ready",
      mailbox_id: sourceMailbox.id,
      message: "An automatic forward could not be queued: " + readiness.reason,
      metadata: { sourceMessageId: message.messageId, targetAddress },
    });
    return;
  }

  const threadId = await findOrCreateThread(service, sourceMailbox.id, sourceMailbox.address, message.subject, [targetAddress]);
  if (!threadId) return;

  const { data: created, error } = await service
    .from("mail_messages")
    .insert({
      mailbox_id: sourceMailbox.id,
      thread_id: threadId,
      provider_message_id: null,
      direction: "outbound",
      folder: "sent",
      from_address: sourceMailbox.address,
      to_addresses: [targetAddress],
      cc_addresses: [],
      subject: message.subject,
      body_text: message.bodyText,
      status: "queued",
      forwarded_from_message_id: message.messageId,
      forward_depth: message.depth + 1,
    })
    .select("id")
    .single();
  if (error || !created) return;

  await copyAttachments(service, message.messageId, sourceMailbox.id, created.id, "mail-forwarded");

  const { error: enqueueError } = await service.from("mail_delivery_jobs").insert({
    message_id: created.id,
    mailbox_id: sourceMailbox.id,
    provider: readiness.provider,
    status: "queued",
    idempotency_key: "forward:" + message.messageId,
  });
  if (enqueueError) {
    await service.from("mail_messages").update({ status: "failed" }).eq("id", created.id);
    return;
  }

  await service.from("mail_threads").update({
    subject: message.subject || "(no subject)",
    last_message_at: new Date().toISOString(),
  }).eq("id", threadId);

  await service.from("mail_audit_events").insert({
    mailbox_id: sourceMailbox.id,
    business_id: sourceMailbox.business_id ?? null,
    actor_user_id: ruleOwnerId,
    event_type: "mail.forward_queued",
    metadata: { sourceMessageId: message.messageId, targetAddress },
  });
}

/**
 * Checks for an active forwarding rule on a mailbox a message just landed
 * in (via internal direct delivery or the inbound provider webhook) and,
 * if one exists, forwards it on — internally by direct delivery into the
 * target mailbox (recursing to support short chains), or externally by
 * reusing the exact same mail_delivery_jobs queue and cron worker every
 * other outbound Kebu message goes through. Never throws: a forwarding
 * failure must not break the inbound delivery that triggered it.
 */
export async function processMailForwarding(service: SupabaseClient, message: ForwardableMessage): Promise<void> {
  try {
    if (message.depth >= MAX_FORWARD_DEPTH) return;

    const { data: rule } = await service
      .from("mail_forwarding_rules")
      .select("forward_to_address,created_by")
      .eq("mailbox_id", message.mailboxId)
      .eq("is_active", true)
      .maybeSingle();
    if (!rule) return;

    const { data: mailbox } = await service
      .from("mailboxes")
      .select("id,address,mailbox_type,business_id,mail_domain_id,display_name")
      .eq("id", message.mailboxId)
      .maybeSingle();
    if (!mailbox) return;

    const target = canonicalAddress(rule.forward_to_address);
    if (target === canonicalAddress(mailbox.address)) return;

    const { data: alreadyForwarded } = await service
      .from("mail_messages")
      .select("id")
      .eq("forwarded_from_message_id", message.messageId)
      .limit(1);
    if (alreadyForwarded?.length) return;

    const { data: internalTarget } = await service
      .from("mailboxes")
      .select("id,address")
      .eq("address", target)
      .eq("is_active", true)
      .maybeSingle();

    if (internalTarget) {
      await forwardInternally(service, rule.created_by as string, internalTarget, message);
    } else {
      await forwardExternally(service, rule.created_by as string, mailbox as DeliverableMailbox, target, message);
    }
  } catch {
    // A forwarding failure must never break the delivery that triggered it.
  }
}
