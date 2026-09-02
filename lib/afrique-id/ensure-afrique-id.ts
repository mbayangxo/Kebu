import type { SupabaseClient } from "@supabase/supabase-js";
import { generatePublicAfriqueId } from "@/lib/afrique-id/public-id";
import { rowToAfriqueId, type AfriqueIdRecord } from "@/lib/afrique-id/types";

function normalizeCountryCode(input: string | null | undefined): string {
  const cc = input?.trim().toUpperCase();
  if (cc && /^[A-Z]{2}$/.test(cc)) return cc;
  return "SN";
}

/** Load or create Afrique ID linked 1:1 to the Kebu account (auth user). */
export async function ensureAfriqueIdForUser(opts: {
  supabase: SupabaseClient;
  userId: string;
  countryCode?: string | null;
}): Promise<{ ok: true; afriqueId: AfriqueIdRecord; created: boolean } | { ok: false; error: string }> {
  const { supabase, userId } = opts;
  const countryCode = normalizeCountryCode(opts.countryCode);

  const { data: existing } = await supabase
    .from("afrique_ids")
    .select("user_id, public_afrique_id, country_code, eligibility_status, verified_at, created_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    return { ok: true, afriqueId: rowToAfriqueId(existing), created: false };
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    const publicAfriqueId = generatePublicAfriqueId(countryCode);
    const { data, error } = await supabase
      .from("afrique_ids")
      .insert({
        user_id: userId,
        public_afrique_id: publicAfriqueId,
        country_code: countryCode,
        eligibility_status: "unverified",
      })
      .select("user_id, public_afrique_id, country_code, eligibility_status, verified_at, created_at")
      .single();

    if (!error && data) {
      return { ok: true, afriqueId: rowToAfriqueId(data), created: true };
    }
    if (error?.code === "23505") continue;
    if (error?.message?.includes("does not exist")) {
      return { ok: false, error: "Apply migration 027 (afrique_ids)." };
    }
    return { ok: false, error: error?.message ?? "Could not create Afrique ID." };
  }

  return { ok: false, error: "Could not allocate Afrique ID." };
}
