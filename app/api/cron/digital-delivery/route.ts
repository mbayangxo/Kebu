import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/opportunity/admin";
import { requireCronSecret } from "@/lib/api-guard";
import { emailDownloadLink, type DownloadRow } from "@/lib/shop/digital-downloads";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

type EmailJob = DownloadRow & {
  recipient_email: string; shop_name: string; product_name: string;
  notification_lease_id: string;
};

/** Durable paid delivery. No secret means no access, including development. */
export async function GET(req: NextRequest) {
  const denied = requireCronSecret(req, { required: true });
  if (denied) return denied;
  const admin = createServiceClient();
  const from = process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM;
  if (!admin || !from || !process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "Digital delivery is not configured." }, { status: 503 });
  }
  const { data, error } = await admin.rpc("claim_shop_digital_emails", { p_limit: 5 });
  if (error || !Array.isArray(data)) {
    return NextResponse.json({ error: "Could not claim delivery queue." }, { status: 503 });
  }
  let sent = 0, failed = 0;
  for (const job of data as EmailJob[]) {
    try {
      const ok = await emailDownloadLink({
        to: job.recipient_email, from, shopName: job.shop_name, productName: job.product_name,
        downloadUrl: `${(process.env.NEXT_PUBLIC_APP_URL || "https://kebu.app").replace(/\/$/, "")}/api/dl/${job.token}`,
        expiresAt: job.expires_at, maxDownloads: job.max_downloads,
        idempotencyKey: `digital-delivery/${job.id}`,
      });
      if (!ok) { failed++; continue; }
      const ack = await admin.from("shop_digital_downloads")
        .update({ notification_sent_at: new Date().toISOString() })
        .eq("id", job.id).eq("notification_lease_id", job.notification_lease_id)
        .select("id");
      if (ack.error || ack.data?.length !== 1) failed++;
      else sent++;
    } catch { failed++; }
  }
  return NextResponse.json({ ok: failed === 0, claimed: data.length, sent, failed }, { status: failed ? 503 : 200 });
}
