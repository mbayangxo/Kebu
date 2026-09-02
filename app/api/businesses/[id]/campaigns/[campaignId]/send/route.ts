import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { deliverCampaign } from "@/lib/email/campaigns";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string; campaignId: string }> };

/** Send a draft campaign to all active subscribers. */
export async function POST(_req: Request, { params }: Params) {
  const { id: businessId, campaignId } = await params;
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const { data: membership } = await supabase
    .from("business_members")
    .select("role")
    .eq("business_id", businessId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!membership || !["founder", "administrator", "store_manager"].includes(membership.role)) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("business_email, trading_name, legal_name")
    .eq("id", businessId)
    .maybeSingle();

  const replyTo = business?.business_email ?? user.email ?? undefined;
  const fromEmail = process.env.NOTIFY_FROM_EMAIL || process.env.CAMPAIGN_FROM_EMAIL;
  if (!fromEmail) {
    return NextResponse.json(
      {
        error:
          "Outbound email is not configured. Set NOTIFY_FROM_EMAIL (verified domain in Resend) and RESEND_API_KEY on the server.",
      },
      { status: 503 },
    );
  }

  const result = await deliverCampaign({
    campaignId,
    businessId,
    fromEmail,
    replyTo: replyTo || undefined,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, ...result });
}
