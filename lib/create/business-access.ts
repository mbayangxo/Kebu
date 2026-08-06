import type { SupabaseClient } from "@supabase/supabase-js";

export async function assertBusinessEditor(
  supabase: SupabaseClient,
  businessId: string,
  userId: string
): Promise<{ ok: true; role: string } | { ok: false; status: number; error: string }> {
  const { data: membership } = await supabase
    .from("business_members")
    .select("role, status")
    .eq("business_id", businessId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (!membership) {
    return { ok: false, status: 404, error: "Business not found." };
  }
  if (!["founder", "administrator", "developer", "designer"].includes(membership.role)) {
    return { ok: false, status: 403, error: "You do not have permission to build websites for this business." };
  }
  return { ok: true, role: membership.role };
}
