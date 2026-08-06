import { NextResponse } from "next/server";
import { requireUser, logCreate } from "@/lib/create/auth";
import { SAFE_BUSINESS_FIELDS } from "@/lib/kebu-id/schemas";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** Load one business by internal UUID — members only. */
export async function GET(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id } = await params;

  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid business id." }, { status: 400 });
  }

  const { data: membership } = await supabase
    .from("business_members")
    .select("role, status")
    .eq("business_id", id)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!membership) {
    // Do not reveal whether the UUID exists
    return NextResponse.json({ error: "Business not found." }, { status: 404 });
  }

  const { data: business, error } = await supabase
    .from("businesses")
    .select(SAFE_BUSINESS_FIELDS)
    .eq("id", id)
    .maybeSingle();

  if (error || !business) {
    logCreate("business.get_failed", { userId: user.id, businessId: id, message: error?.message });
    return NextResponse.json({ error: "Business not found." }, { status: 404 });
  }

  return NextResponse.json({
    business,
    membership: { role: membership.role, status: membership.status },
  });
}
