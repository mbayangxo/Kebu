import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** B2B directory — only for signed-in users with at least one business membership. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to browse B2B suppliers on Kebu." }, { status: 401 });
  }

  const { count: memberCount } = await supabase
    .from("business_members")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "active");

  if (!memberCount) {
    return NextResponse.json(
      { error: "Create a Kebu business first to access the B2B directory." },
      { status: 403 },
    );
  }

  const { data: profiles, error } = await supabase
    .from("business_b2b_profiles")
    .select(
      "business_id, headline, about, logo_url, cover_url, categories, min_order_note, contact_email, contact_phone, updated_at",
    )
    .eq("is_published", true)
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json(
      { error: error.message.includes("does not exist") ? "Apply migration 024." : "Could not load directory." },
      { status: 500 },
    );
  }

  const businessIds = (profiles ?? []).map((p) => p.business_id);
  const { data: businesses } = businessIds.length
    ? await supabase
        .from("businesses")
        .select("id, public_kebu_id, legal_name, trading_name, country_code, region, category")
        .in("id", businessIds)
    : { data: [] };

  const bizMap = new Map((businesses ?? []).map((b) => [b.id, b]));

  const listings = (profiles ?? []).map((p) => ({
    ...p,
    business: bizMap.get(p.business_id) ?? null,
  }));

  return NextResponse.json({ listings, count: listings.length });
}
