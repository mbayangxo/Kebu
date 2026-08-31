import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import {
  billingDevBypassEnabled,
  getActiveSiteSubscription,
  projectHasLiveHosting,
} from "@/lib/billing/subscriptions";
import { SITE_HOSTING_BILLING_LABEL, SITE_HOSTING_DESCRIPTION, SITE_HOSTING_MONTHLY_USD } from "@/lib/billing/pricing";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** Billing status for a website project (JOKO hosting). */
export async function GET(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id } = await params;

  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid project id." }, { status: 400 });
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id, owner_id, title, status, subdomain")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const active = await getActiveSiteSubscription(supabase, id, user.id);
  const canPublish = await projectHasLiveHosting(supabase, id, user.id);

  return NextResponse.json({
    projectId: id,
    provider: "joko",
    monthlyUsd: SITE_HOSTING_MONTHLY_USD,
    label: SITE_HOSTING_BILLING_LABEL,
    description: SITE_HOSTING_DESCRIPTION,
    devBypass: billingDevBypassEnabled(),
    canPublish,
    subscription: active
      ? {
          id: active.id,
          status: active.status,
          periodEnd: active.period_end,
          amountUsdCents: active.amount_usd_cents,
        }
      : null,
  });
}
