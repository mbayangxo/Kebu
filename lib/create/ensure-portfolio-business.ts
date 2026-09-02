import type { SupabaseClient } from "@supabase/supabase-js";
import { generatePublicKebuId } from "@/lib/kebu-id/public-id";

/** Portfolio owner needs a business row to attach May Lecor / K-Direction projects. */
export async function ensurePortfolioOwnerBusiness(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ businessId: string } | { error: string; detail?: string }> {
  const { data: memberships, error: memErr } = await supabase
    .from("business_members")
    .select("business_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1);

  if (memErr) {
    return {
      error: memErr.message.includes("does not exist")
        ? "Business tables missing. Apply migrations 005–007 and 018."
        : "Could not load businesses.",
      detail: memErr.message,
    };
  }

  if (memberships?.[0]?.business_id) {
    return { businessId: memberships[0].business_id };
  }

  let publicId = generatePublicKebuId("SN");
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: business, error: bizErr } = await supabase
      .from("businesses")
      .insert({
        public_kebu_id: publicId,
        legal_name: "May Lecor & K-Direction",
        trading_name: "Portfolio",
        country_code: "SN",
        category: "creative",
        description: "Kebu portfolio holder for May Lecor and K-Direction sites.",
        lifecycle_status: "draft",
        verification_level: 1,
        registration_status: "draft",
        created_by: userId,
      })
      .select("id")
      .single();

    if (!bizErr && business?.id) {
      const { error: memberErr } = await supabase.from("business_members").insert({
        business_id: business.id,
        user_id: userId,
        role: "founder",
        status: "active",
      });
      if (memberErr) {
        return { error: "Could not link business membership.", detail: memberErr.message };
      }
      return { businessId: business.id };
    }

    if (bizErr?.code === "23505" && bizErr.message.includes("public_kebu_id")) {
      publicId = generatePublicKebuId("SN");
      continue;
    }

    return {
      error: bizErr?.message.includes("does not exist")
        ? "Business tables missing. Apply migrations 005–007 and 018."
        : "Could not create portfolio business.",
      detail: bizErr?.message,
    };
  }

  return { error: "Could not allocate Kebu ID for portfolio business." };
}
