import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/opportunity/admin";
import { assertAdminCookie } from "@/lib/admin/assert-admin-cookie";
import { listOpenFulfillmentOrders } from "@/lib/shop/joko-fulfillment";

export const dynamic = "force-dynamic";

/** Real ops queue: orders a Kebu team member still needs to physically pick up / deliver. */
export async function GET(req: Request) {
  if (!(await assertAdminCookie(req))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const admin = createServiceClient();
  if (!admin) {
    return NextResponse.json({ error: "Service client not configured." }, { status: 503 });
  }

  const view = new URL(req.url).searchParams.get("view") === "outcomes" ? "outcomes" : "active";
  const result = await listOpenFulfillmentOrders(admin, view);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 });

  return NextResponse.json({ items: result.items });
}
