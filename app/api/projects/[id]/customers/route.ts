import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { listShopCustomers } from "@/lib/shop/customers";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** Merchant customer list: order buyers + newsletter/order emails for this shop. */
export async function GET(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: projectId } = await params;

  const { data: project } = await supabase
    .from("projects")
    .select("id, business_id")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const result = await listShopCustomers(supabase, {
    projectId,
    businessId: typeof project.business_id === "string" ? project.business_id : null,
  });

  if (result.error && result.customers.length === 0) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({
    customers: result.customers,
    businessLinked: Boolean(project.business_id),
    warning: result.error,
  });
}
