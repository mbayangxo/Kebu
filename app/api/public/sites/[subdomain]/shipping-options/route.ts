import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/opportunity/admin";
import { listActiveShippingOptions } from "@/lib/shop/shipping-options";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ subdomain: string }> };

/** Public: the seller's real, active shipping choices for checkout. Service-role read only — no RLS bypass needed because this never writes. */
export async function GET(_req: Request, { params }: Params) {
  const { subdomain: raw } = await params;
  const subdomain = raw.trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(subdomain) || subdomain.length < 3) {
    return NextResponse.json({ error: "Invalid site address." }, { status: 400 });
  }

  const admin = createServiceClient();
  if (!admin) {
    return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
  }

  const { data: live } = await admin
    .from("deployments")
    .select("project_id")
    .eq("subdomain", subdomain)
    .eq("status", "live")
    .maybeSingle();

  if (!live?.project_id) {
    return NextResponse.json({ error: "Site is not live." }, { status: 404 });
  }

  const options = await listActiveShippingOptions(admin, live.project_id);
  return NextResponse.json({ options });
}
