import type { SupabaseClient } from "@supabase/supabase-js";
import { INVITE_ROLES, type InviteRole } from "@/lib/business/team-roles";

export function invitableRoles(role: string): readonly InviteRole[] {
  if (role === "founder" || role === "administrator") return INVITE_ROLES;
  if (role === "manager" || role === "store_manager")
    return ["creative", "developer", "designer", "employee", "viewer"];
  return [];
}
export async function teamMembership(
  db: SupabaseClient,
  businessId: string,
  userId: string,
) {
  const result = await db
    .from("business_members")
    .select("role")
    .eq("business_id", businessId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  return { role: result.data?.role as string | undefined, error: result.error };
}
