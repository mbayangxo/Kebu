import type { SupabaseClient } from "@supabase/supabase-js";

export async function assertBusinessManager(
  supabase: SupabaseClient,
  businessId: string,
  userId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("business_members")
    .select("role")
    .eq("business_id", businessId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  return Boolean(
    data &&
      ["founder", "administrator", "store_manager", "manager", "creative"].includes(
        data.role,
      ),
  );
}

export function appBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  );
}
