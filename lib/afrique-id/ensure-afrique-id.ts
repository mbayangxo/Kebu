import type { SupabaseClient } from "@supabase/supabase-js";
import { generatePublicAfricanId } from "@/lib/afrique-id/public-id";
import {
  parseAfricanIdType,
  rowToAfriqueId,
  type AfricanIdType,
  type AfriqueIdRecord,
} from "@/lib/afrique-id/types";

const SELECT_COLS =
  "user_id, public_afrique_id, country_code, eligibility_status, verified_at, created_at, identity_type";

function normalizeCountryCode(input: string | null | undefined): string {
  const cc = input?.trim().toUpperCase();
  if (cc && /^[A-Z]{2}$/.test(cc)) return cc;
  return "SN";
}

/** Load or create African ID (AID) linked 1:1 to the Kebu account. */
export async function ensureAfriqueIdForUser(opts: {
  supabase: SupabaseClient;
  userId: string;
  countryCode?: string | null;
  identityType?: AfricanIdType | null;
}): Promise<{ ok: true; afriqueId: AfriqueIdRecord; created: boolean } | { ok: false; error: string }> {
  const { supabase, userId } = opts;
  const countryCode = normalizeCountryCode(opts.countryCode);
  const identityType = parseAfricanIdType(opts.identityType ?? "visitor");

  const { data: existing, error: readErr } = await supabase
    .from("afrique_ids")
    .select(SELECT_COLS)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    return { ok: true, afriqueId: rowToAfriqueId(existing), created: false };
  }

  // Column may be missing until migration 037 — retry without identity_type.
  if (readErr?.message?.includes("identity_type")) {
    const { data: legacy } = await supabase
      .from("afrique_ids")
      .select("user_id, public_afrique_id, country_code, eligibility_status, verified_at, created_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (legacy) {
      return { ok: true, afriqueId: rowToAfriqueId(legacy), created: false };
    }
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    const publicAfriqueId = generatePublicAfricanId(countryCode, identityType);
    const insertPayload: Record<string, unknown> = {
      user_id: userId,
      public_afrique_id: publicAfriqueId,
      country_code: countryCode,
      eligibility_status: "unverified",
      identity_type: identityType,
    };

    let { data, error } = await supabase
      .from("afrique_ids")
      .insert(insertPayload)
      .select(SELECT_COLS)
      .single();

    if (error?.message?.includes("identity_type")) {
      delete insertPayload.identity_type;
      const retry = await supabase
        .from("afrique_ids")
        .insert(insertPayload)
        .select("user_id, public_afrique_id, country_code, eligibility_status, verified_at, created_at")
        .single();
      data = retry.data as typeof data;
      error = retry.error;
    }

    if (!error && data) {
      return { ok: true, afriqueId: rowToAfriqueId(data), created: true };
    }
    if (error?.code === "23505") continue;
    if (error?.message?.includes("does not exist")) {
      return { ok: false, error: "Apply migrations 027 + 037 (African ID / AID)." };
    }
    return { ok: false, error: error?.message ?? "Could not create African ID." };
  }

  return { ok: false, error: "Could not allocate African ID." };
}

/** Update identity type (indigenous | visitor) — owner only; does not change eligibility. */
export async function updateAfricanIdType(opts: {
  supabase: SupabaseClient;
  userId: string;
  identityType: AfricanIdType;
}): Promise<{ ok: true; afriqueId: AfriqueIdRecord } | { ok: false; error: string; status?: number }> {
  const identityType = parseAfricanIdType(opts.identityType);
  const { data, error } = await opts.supabase
    .from("afrique_ids")
    .update({ identity_type: identityType, updated_at: new Date().toISOString() })
    .eq("user_id", opts.userId)
    .select(SELECT_COLS)
    .maybeSingle();

  if (error?.message?.includes("identity_type")) {
    return {
      ok: false,
      error: "Apply migration 037 to enable African ID types (indigenous / visitor).",
      status: 503,
    };
  }
  if (error || !data) {
    return { ok: false, error: error?.message ?? "Could not update African ID type.", status: 500 };
  }
  return { ok: true, afriqueId: rowToAfriqueId(data) };
}
