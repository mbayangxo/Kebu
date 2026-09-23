import type { SupabaseClient } from "@supabase/supabase-js";

export const BUSINESS_MAIL_ADMIN_ROLES = new Set([
  "founder",
  "cofounder",
  "director",
  "administrator",
  "manager",
]);

export function canManageBusinessMailRole(role: string | null | undefined) {
  return Boolean(role && BUSINESS_MAIL_ADMIN_ROLES.has(role));
}

export async function loadActiveBusinessMailContext(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("active_business_id")
    .eq("id", userId)
    .maybeSingle();

  const businessId = profile?.active_business_id ?? null;
  if (!businessId) {
    return {
      mode: "personal" as const,
      businessId: null,
      businessName: null,
      role: null,
      canManage: false,
    };
  }

  const { data: membership } = await supabase
    .from("business_members")
    .select("business_id, role")
    .eq("business_id", businessId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (!membership) {
    return {
      mode: "personal" as const,
      businessId: null,
      businessName: null,
      role: null,
      canManage: false,
    };
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("id, legal_name, trading_name")
    .eq("id", businessId)
    .maybeSingle();

  return {
    mode: "business" as const,
    businessId,
    businessName: business?.trading_name?.trim() || business?.legal_name || "Business Kebu",
    role: membership.role as string,
    canManage: canManageBusinessMailRole(membership.role),
  };
}

export async function assertMailboxSendAccess(
  supabase: SupabaseClient,
  userId: string,
  mailboxId: string,
) {
  const { data: mailbox } = await supabase
    .from("mailboxes")
    .select("id, owner_user_id, business_id, mailbox_type, address, display_name, is_active")
    .eq("id", mailboxId)
    .eq("is_active", true)
    .maybeSingle();

  if (!mailbox) return null;

  if (mailbox.mailbox_type === "personal") {
    return mailbox.owner_user_id === userId && mailbox.business_id === null ? mailbox : null;
  }

  if (!mailbox.business_id) return null;

  const { data: membership } = await supabase
    .from("business_members")
    .select("role")
    .eq("business_id", mailbox.business_id)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  return canManageBusinessMailRole(membership?.role) ? mailbox : null;
}
