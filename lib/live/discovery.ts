import { createAdminClient } from "@/lib/supabase/admin";

/** Real, currently-live broadcast count for the Live Rooms tile — no fabricated activity signal. */
export async function liveBroadcastCount(): Promise<number | null> {
  const db = createAdminClient();
  const { count, error } = await db.from("kebu_live_broadcasts").select("id", { count: "exact", head: true })
    .is("ended_at", null).gt("expires_at", new Date().toISOString());
  return error ? null : count ?? 0;
}
