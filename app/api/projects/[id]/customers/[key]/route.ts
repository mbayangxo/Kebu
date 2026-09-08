import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { getShopCustomerProfile } from "@/lib/shop/customer-profiles";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string; key: string }> };

/** One customer profile + transaction history for this shop. */
export async function GET(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: projectId, key: rawKey } = await params;

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  let customerKey = decodeURIComponent(rawKey || "");
  // Allow e%3Aemail or e:email
  if (!customerKey.startsWith("e:") && !customerKey.startsWith("p:")) {
    return NextResponse.json({ error: "Invalid customer key." }, { status: 400 });
  }

  const result = await getShopCustomerProfile(supabase, {
    projectId,
    customerKey,
  });

  if (result.error && !result.profile) {
    return NextResponse.json(
      {
        error: result.error.includes("054")
          ? "Apply 054_shop_fulfillment_customers.sql for customer profiles."
          : result.error,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ profile: result.profile });
}
