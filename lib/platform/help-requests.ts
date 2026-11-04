import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendInternetMail } from "@/lib/mail/provider";
import { KEBU_SUPPORT_EMAIL } from "@/lib/navigation/marketing-nav";

export const HELP_REQUEST_STATUSES = ["open", "in_progress", "helped", "closed"] as const;
export type HelpRequestStatus = (typeof HELP_REQUEST_STATUSES)[number];

export const helpRequestCreateSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(254),
  phone: z
    .preprocess(
      (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
      z.string().trim().min(8).max(24).optional(),
    )
    .optional(),
  subject: z.string().trim().min(3).max(120),
  body: z.string().trim().min(10).max(4000),
  source: z.enum(["contact", "help", "in_app", "email"]).optional().default("contact"),
});

export type HelpRequestCreateInput = z.infer<typeof helpRequestCreateSchema>;

export async function createHelpRequest(
  admin: SupabaseClient,
  input: HelpRequestCreateInput,
  userId?: string | null,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const { data, error } = await admin
    .from("help_requests")
    .insert({
      user_id: userId ?? null,
      name: input.name,
      email: input.email.trim().toLowerCase(),
      phone: input.phone?.trim() || null,
      subject: input.subject,
      body: input.body,
      source: input.source ?? "contact",
      status: "open",
    })
    .select("id")
    .single();

  if (error || !data) {
    return {
      ok: false,
      error: error?.message?.includes("help_requests")
        ? "Apply migration 083_help_requests_cron_runs.sql."
        : "Could not save help request.",
    };
  }
  return { ok: true, id: data.id as string };
}

export function isHelpedStatus(status: string): boolean {
  return status === "helped" || status === "closed";
}

export type HelpAccountContext = {
  accountCreatedAt: string | null;
  businesses: { publicKebuId: string; legalName: string }[];
};

type MembershipRow = {
  user_id: string;
  businesses: { public_kebu_id: string; legal_name: string } | { public_kebu_id: string; legal_name: string }[] | null;
};

/**
 * Pure join of help_requests.user_id → real account data — the "know their
 * account number and everything there" enrichment shown in Kebu Record.
 * Every user_id in `userIds` gets a real entry; one with no business yet
 * gets an honest `businesses: []`, never a fabricated row.
 */
export function buildHelpAccountContext(
  userIds: string[],
  profiles: { id: string; created_at: string }[],
  memberships: MembershipRow[],
): Record<string, HelpAccountContext> {
  const profileById = new Map(profiles.map((p) => [p.id, p]));
  const byUserId: Record<string, HelpAccountContext> = {};
  for (const uid of userIds) {
    byUserId[uid] = { accountCreatedAt: profileById.get(uid)?.created_at ?? null, businesses: [] };
  }
  for (const m of memberships) {
    const biz = Array.isArray(m.businesses) ? m.businesses[0] : m.businesses;
    if (biz && byUserId[m.user_id]) {
      byUserId[m.user_id]!.businesses.push({ publicKebuId: biz.public_kebu_id, legalName: biz.legal_name });
    }
  }
  return byUserId;
}

export type HelpReplyAuthorType = "customer" | "team";

export const helpReplyCreateSchema = z.object({
  body: z.string().trim().min(1).max(4000),
});

export type HelpReplyRow = {
  id: string;
  help_request_id: string;
  author_type: HelpReplyAuthorType;
  author_name: string;
  author_user_id: string | null;
  body: string;
  email_sent: boolean;
  created_at: string;
};

/** Customer reply on their own request — RLS enforces it can only be inserted as 'customer', on a request they own. */
export async function createCustomerHelpReply(
  userScoped: SupabaseClient,
  opts: { helpRequestId: string; authorName: string; authorUserId: string; body: string },
): Promise<{ ok: true; reply: HelpReplyRow } | { ok: false; error: string }> {
  const { data, error } = await userScoped
    .from("help_request_replies")
    .insert({
      help_request_id: opts.helpRequestId,
      author_type: "customer",
      author_name: opts.authorName,
      author_user_id: opts.authorUserId,
      body: opts.body,
    })
    .select("id, help_request_id, author_type, author_name, author_user_id, body, email_sent, created_at")
    .single();

  if (error || !data) {
    return {
      ok: false,
      error: error?.message?.includes("help_request_replies")
        ? "Apply migration 20261103150000_help_request_replies.sql."
        : "Could not save your reply. The request may no longer be open to you.",
    };
  }

  // A customer following up on a request the team had marked helped/closed
  // means it needs attention again — reopen it so it resurfaces in the queue.
  await userScoped
    .from("help_requests")
    .update({ status: "open", updated_at: new Date().toISOString() })
    .eq("id", opts.helpRequestId)
    .in("status", ["helped", "closed"]);

  return { ok: true, reply: data as HelpReplyRow };
}

/**
 * Team reply, written by the service role (never by a browser-scoped client).
 * Also sends a real outbound email to the requester's authoritative Kebu
 * account email when one is known, falling back to the address they typed
 * on the form for guest/no-account requests. replyTo points at Kebu's own
 * support mailbox — whether that mailbox has a live inbound-receiving
 * webhook wired up today is NOT verified by this function; it only proves
 * the outbound send and the in-app thread, which a customer can always use
 * to reply regardless of whether email-reply ingestion is live.
 */
export async function createTeamHelpReply(
  admin: SupabaseClient,
  opts: {
    helpRequestId: string;
    authorName: string;
    body: string;
    recipientEmail: string;
    requestSubject: string;
  },
): Promise<{ ok: true; reply: HelpReplyRow; emailSent: boolean } | { ok: false; error: string }> {
  const emailResult = await sendInternetMail({
    from: KEBU_SUPPORT_EMAIL,
    to: [opts.recipientEmail],
    replyTo: [KEBU_SUPPORT_EMAIL],
    subject: `Re: ${opts.requestSubject}`,
    text: opts.body,
  });

  const { data, error } = await admin
    .from("help_request_replies")
    .insert({
      help_request_id: opts.helpRequestId,
      author_type: "team",
      author_name: opts.authorName,
      author_user_id: null,
      body: opts.body,
      email_sent: emailResult.ok,
    })
    .select("id, help_request_id, author_type, author_name, author_user_id, body, email_sent, created_at")
    .single();

  if (error || !data) {
    return {
      ok: false,
      error: error?.message?.includes("help_request_replies")
        ? "Apply migration 20261103150000_help_request_replies.sql."
        : "Could not save the reply.",
    };
  }

  return { ok: true, reply: data as HelpReplyRow, emailSent: emailResult.ok };
}
