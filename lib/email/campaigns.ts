import { createServiceClient } from "@/lib/opportunity/admin";
import { sendCampaignEmail } from "@/lib/email/send-campaign";

export type CampaignSendResult = {
  sent: number;
  failed: number;
  skipped: number;
};

/** Send campaign to all active subscribers via Resend. */
export async function deliverCampaign(opts: {
  campaignId: string;
  businessId: string;
  fromEmail: string;
  replyTo?: string;
}): Promise<CampaignSendResult | { error: string }> {
  const admin = createServiceClient();
  if (!admin) return { error: "Server database client unavailable." };

  const { campaignId, businessId, fromEmail, replyTo } = opts;

  const { data: campaign } = await admin
    .from("business_email_campaigns")
    .select("id, subject, body_html, body_text, from_name, status")
    .eq("id", campaignId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (!campaign) return { error: "Campaign not found." };
  if (campaign.status === "sent") return { error: "Campaign already sent." };

  if (!process.env.RESEND_API_KEY) {
    return { error: "Email sending is not configured on this server (RESEND_API_KEY)." };
  }

  await admin
    .from("business_email_campaigns")
    .update({ status: "sending", updated_at: new Date().toISOString() })
    .eq("id", campaignId);

  const { data: subscribers } = await admin
    .from("business_email_subscribers")
    .select("id, email, name")
    .eq("business_id", businessId)
    .is("unsubscribed_at", null);

  const list = subscribers ?? [];
  let sent = 0;
  let failed = 0;

  for (const sub of list) {
    const ok = await sendCampaignEmail({
      to: sub.email,
      from: fromEmail,
      replyTo,
      subject: campaign.subject,
      html: campaign.body_html,
      text: campaign.body_text || undefined,
      fromName: campaign.from_name || undefined,
    });

    const status = ok ? "sent" : "failed";
    if (ok) sent += 1;
    else failed += 1;

    await admin.from("business_email_campaign_recipients").upsert(
      {
        campaign_id: campaignId,
        subscriber_id: sub.id,
        status,
        error_message: ok ? null : "Resend delivery failed",
        sent_at: ok ? new Date().toISOString() : null,
      },
      { onConflict: "campaign_id,subscriber_id" },
    );
  }

  await admin
    .from("business_email_campaigns")
    .update({
      status: failed === list.length && list.length > 0 ? "failed" : "sent",
      recipient_count: sent,
      sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", campaignId);

  return { sent, failed, skipped: 0 };
}
