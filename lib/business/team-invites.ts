import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendCampaignEmail } from "@/lib/email/send-campaign";
import { appBaseUrl } from "@/lib/business/assert-manager";
import {
  INVITE_ROLES,
  inviteRoleLabel,
  isInviteRole,
  type InviteRole,
} from "@/lib/business/team-roles";

export { INVITE_ROLES, inviteRoleLabel, isInviteRole, type InviteRole };

// Business names and recipient addresses are plain text, even inside email HTML.
function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character]!,
  );
}

export function newInviteToken(): string {
  return randomBytes(24).toString("base64url");
}

export async function listBusinessInvites(
  supabase: SupabaseClient,
  businessId: string,
) {
  const { data, error } = await supabase
    .from("business_invites")
    .select(
      "id, email, role, status, message, expires_at, accepted_at, created_at, token",
    )
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) {
    return {
      invites: [] as NonNullable<typeof data>,
      error: error.message?.includes("does not exist")
        ? "Apply 055_team_invites_demo_orders.sql for team invites."
        : error.message,
    };
  }
  return { invites: data ?? [] };
}

export async function createBusinessInvite(
  supabase: SupabaseClient,
  opts: {
    businessId: string;
    email: string;
    role: InviteRole;
    invitedBy: string;
    message?: string;
    businessName: string;
  },
): Promise<
  | {
      ok: true;
      inviteId: string;
      token: string;
      acceptUrl: string;
      emailed: boolean;
    }
  | { ok: false; error: string }
> {
  const email = opts.email.trim().toLowerCase();
  if (!email.includes("@")) return { ok: false, error: "Enter a valid email." };

  const { data: existingMember } = await supabase
    .from("business_members")
    .select("id, status")
    .eq("business_id", opts.businessId)
    .limit(20);

  // Can't easily join auth.users from client — accept path checks email match.
  void existingMember;

  const { data: pending } = await supabase
    .from("business_invites")
    .select("id")
    .eq("business_id", opts.businessId)
    .eq("status", "pending")
    .ilike("email", email)
    .maybeSingle();

  if (pending) {
    return {
      ok: false,
      error: "A pending invite already exists for this email.",
    };
  }

  const token = newInviteToken();
  const { data: row, error } = await supabase
    .from("business_invites")
    .insert({
      business_id: opts.businessId,
      email,
      role: opts.role,
      token,
      status: "pending",
      invited_by: opts.invitedBy,
      message: (opts.message ?? "").slice(0, 400),
      expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select("id, token")
    .single();

  if (error || !row) {
    return {
      ok: false,
      error: error?.message?.includes("does not exist")
        ? "Apply 055_team_invites_demo_orders.sql for team invites."
        : error?.message || "Could not create invite.",
    };
  }

  const acceptUrl = `${appBaseUrl()}/invite/${row.token}`;
  let emailed = false;
  const from =
    process.env.RESEND_FROM_EMAIL?.trim() ||
    process.env.CAMPAIGN_FROM_EMAIL?.trim() ||
    "team@kebu.africa";
  const text = [
    `You were invited to join ${opts.businessName} on Kebu as ${inviteRoleLabel(opts.role)}.`,
    opts.message?.trim() ? `\nNote: ${opts.message.trim()}` : "",
    `\nAccept here (sign in with ${email}):\n${acceptUrl}`,
    "\nThis link expires in 14 days.",
  ].join("");

  emailed = await sendCampaignEmail({
    to: email,
    from,
    fromName: opts.businessName.slice(0, 60),
    subject: `Join ${opts.businessName} on Kebu`,
    text,
    html: `<p>You were invited to join <strong>${escapeHtml(opts.businessName)}</strong> as <strong>${escapeHtml(inviteRoleLabel(opts.role))}</strong>.</p>
<p><a href="${escapeHtml(acceptUrl)}">Accept invite</a></p>
<p>Sign in with <strong>${escapeHtml(email)}</strong>. Link expires in 14 days.</p>`,
  });

  return { ok: true, inviteId: row.id, token: row.token, acceptUrl, emailed };
}

export async function revokeBusinessInvite(
  supabase: SupabaseClient,
  opts: { businessId: string; inviteId: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data, error } = await supabase
    .from("business_invites")
    .update({ status: "revoked", updated_at: new Date().toISOString() })
    .eq("id", opts.inviteId)
    .eq("business_id", opts.businessId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, error: "Could not revoke this invitation." };
  if (!data)
    return {
      ok: false,
      error:
        "Invitation is no longer pending or you cannot revoke it. Refresh its status.",
    };
  return { ok: true };
}

export async function acceptBusinessInvite(
  supabase: SupabaseClient,
  admin: SupabaseClient,
  opts: { token: string; userId: string; userEmail: string },
): Promise<
  | { ok: true; businessId: string; role: string }
  | { ok: false; error: string; status?: number }
> {
  // The authenticated RPC derives identity/email itself and atomically commits
  // membership, invitation consumption and audit. Never fall back to separate writes.
  void admin;
  const { data, error } = await supabase.rpc("accept_business_invite", {
    p_token: opts.token,
  });
  if (error)
    return {
      ok: false,
      error:
        "Team invitation acceptance is unavailable. Please retry or contact support.",
      status: 503,
    };
  if (!data || typeof data.ok !== "boolean")
    return {
      ok: false,
      error: "Could not verify the invitation result.",
      status: 503,
    };
  return data as
    | { ok: true; businessId: string; role: string }
    | { ok: false; error: string; status: number };
}
