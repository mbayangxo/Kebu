import type { SupabaseClient } from "@supabase/supabase-js";

export type ActiveWorkspaceScope = {
  mode: "personal" | "business";
  activeBusinessId: string | null;
  role: string | null;
};

/**
 * Server-enforced workspace scope. A stored business is accepted only while
 * the user has an active membership. Null always means Personal Kebu.
 */
export async function loadActiveWorkspaceScope(
  supabase: SupabaseClient,
  userId: string,
): Promise<ActiveWorkspaceScope> {
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("active_business_id")
    .eq("id", userId)
    .maybeSingle();

  const businessId = profile?.active_business_id ?? null;
  if (!businessId) {
    return { mode: "personal", activeBusinessId: null, role: null };
  }

  const { data: membership } = await supabase
    .from("business_members")
    .select("business_id, role")
    .eq("business_id", businessId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (!membership) {
    return { mode: "personal", activeBusinessId: null, role: null };
  }

  return {
    mode: "business",
    activeBusinessId: businessId,
    role: membership.role ?? "member",
  };
}

export function applyBusinessScope<T extends {
  eq(column: string, value: string): T;
  is(column: string, value: null): T;
}>(query: T, businessId: string | null): T {
  return businessId ? query.eq("business_id", businessId) : query.is("business_id", null);
}
