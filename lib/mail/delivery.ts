import { Buffer } from "node:buffer";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { MailProviderAttachment, MailProviderName } from "@/lib/mail/provider";
import { canonicalAddress } from "@/lib/mail/threading";

export type DeliverableMailbox = {
  id: string;
  mailbox_type: string;
  address: string;
  business_id?: string | null;
  mail_domain_id?: string | null;
  display_name?: string | null;
};

export async function externalMailReadiness(
  service: SupabaseClient,
  mailbox: DeliverableMailbox,
): Promise<
  | { ready: true; provider: MailProviderName; domain: string }
  | { ready: false; reason: string; domain: string }
> {
  const domain = canonicalAddress(mailbox.address).split("@")[1] ?? "";

  if (mailbox.mailbox_type === "personal") {
    const { data } = await service
      .from("mail_platform_domains")
      .select("domain,provider,status,sending_enabled,reputation_status")
      .eq("domain", domain)
      .maybeSingle();

    if (!data || data.status !== "verified" || !data.sending_enabled) {
      return {
        ready: false,
        domain,
        reason: "External Kebu Mail is not active yet. The Kebu mail domain must be purchased and verified first.",
      };
    }
    if (data.reputation_status === "paused") {
      return { ready: false, domain, reason: "External sending is temporarily paused to protect sender reputation." };
    }
    return { ready: true, provider: data.provider === "resend" ? "resend" : "resend", domain };
  }

  if (!mailbox.mail_domain_id) {
    return { ready: false, domain, reason: "This business mailbox is not connected to a verified mail domain." };
  }

  const { data } = await service
    .from("mail_domains")
    .select("domain,provider,status,sending_enabled,reputation_status")
    .eq("id", mailbox.mail_domain_id)
    .maybeSingle();

  if (!data || data.status !== "verified" || !data.sending_enabled) {
    return { ready: false, domain, reason: "This business mail domain is not verified for external sending." };
  }
  if (data.reputation_status === "paused") {
    return { ready: false, domain, reason: "External sending is temporarily paused to protect sender reputation." };
  }

  return { ready: true, provider: data.provider === "resend" ? "resend" : "resend", domain: data.domain };
}

export async function loadMailAttachments(
  service: SupabaseClient,
  messageId: string,
): Promise<MailProviderAttachment[]> {
  const { data: rows, error } = await service
    .from("mail_attachments")
    .select("file_name,storage_path,mime,byte_size")
    .eq("message_id", messageId)
    .order("created_at", { ascending: true });

  if (error) throw new Error("Could not load mail attachments.");

  const totalBytes = (rows ?? []).reduce((sum, row) => sum + Number(row.byte_size || 0), 0);
  if (totalBytes > 35 * 1024 * 1024) throw new Error("Attachments exceed the 35 MB delivery limit.");

  const result: MailProviderAttachment[] = [];
  for (const row of rows ?? []) {
    const { data, error: downloadError } = await service.storage
      .from("digital-files")
      .download(row.storage_path);
    if (downloadError || !data) throw new Error("Could not read attachment " + row.file_name + ".");
    const bytes = await data.arrayBuffer();
    result.push({
      filename: row.file_name,
      contentBase64: Buffer.from(bytes).toString("base64"),
      contentType: row.mime,
    });
  }
  return result;
}

export async function activeSuppressions(
  service: SupabaseClient,
  addresses: string[],
): Promise<Set<string>> {
  const unique = [...new Set(addresses.map(canonicalAddress))];
  if (!unique.length) return new Set();
  const { data } = await service
    .from("mail_suppressions")
    .select("address")
    .in("address", unique)
    .eq("active", true);
  return new Set((data ?? []).map((row) => canonicalAddress(row.address)));
}

export function nextMailRetry(attemptCount: number): string {
  const baseSeconds = 30;
  const exponent = Math.min(10, Math.max(0, attemptCount - 1));
  const delaySeconds = Math.min(6 * 60 * 60, baseSeconds * 2 ** exponent);
  return new Date(Date.now() + delaySeconds * 1000).toISOString();
}
