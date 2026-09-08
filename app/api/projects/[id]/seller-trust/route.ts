import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { assertShopProjectAccess } from "@/lib/shop/shop-project-access";
import { resolveSellerTrust } from "@/lib/shop/seller-trust";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** Honest seller trust snapshot for Shop admin (Kebu ID + AfriID — not Opportunity entitlement). */
export async function GET(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id } = await params;

  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid project id." }, { status: 400 });
  }

  const access = await assertShopProjectAccess(supabase, {
    userId: user.id,
    email: user.email,
    projectId: id,
    action: "seller_trust",
  });
  if (!access) {
    return NextResponse.json({ error: "Project not found or access denied." }, { status: 404 });
  }

  const trust = await resolveSellerTrust(access.db, { projectId: id, userId: user.id });
  return NextResponse.json({ sellerTrust: trust });
}
