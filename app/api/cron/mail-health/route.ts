import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/opportunity/admin";
import { requireCronSecret } from "@/lib/api-guard";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const blocked = requireCronSecret(req);
  if (blocked) return blocked;

  const service = createServiceClient();
  if (!service) return NextResponse.json({ error: "Service database client unavailable." }, { status: 503 });

  const oneHourAgo = new Date(Date.now() - 60 * 60_000).toISOString();
  const { data: reputation } = await service.rpc("evaluate_mail_domain_reputation");
  const [{ data: providers }, { count: failed }, { count: retrying }] = await Promise.all([
    service.from("mail_provider_health").select("*"),
    service.from("mail_delivery_jobs").select("id", { count: "exact", head: true })
      .eq("status", "failed").gte("updated_at", oneHourAgo),
    service.from("mail_delivery_jobs").select("id", { count: "exact", head: true })
      .eq("status", "retry"),
  ]);

  for (const provider of providers ?? []) {
    if (Number(provider.consecutive_failures ?? 0) >= 5) {
      const { data: existing } = await service.from("mail_operational_alerts")
        .select("id")
        .eq("alert_type", "provider_unhealthy")
        .eq("provider", provider.provider)
        .is("resolved_at", null)
        .limit(1)
        .maybeSingle();
      if (!existing) {
        await service.from("mail_operational_alerts").insert({
          severity: "critical",
          alert_type: "provider_unhealthy",
          provider: provider.provider,
          message: "Mail provider health is degraded.",
          metadata: { consecutiveFailures: provider.consecutive_failures },
        });
      }
    }
  }

  if ((failed ?? 0) >= 10) {
    const { data: existing } = await service.from("mail_operational_alerts")
      .select("id")
      .eq("alert_type", "delivery_failure_spike")
      .is("resolved_at", null)
      .limit(1)
      .maybeSingle();
    if (!existing) {
      await service.from("mail_operational_alerts").insert({
        severity: "critical",
        alert_type: "delivery_failure_spike",
        message: "Mail delivery failures exceeded the hourly threshold.",
        metadata: { failedLastHour: failed },
      });
    }
  }

  return NextResponse.json({
    ok: true,
    providers: providers ?? [],
    failedLastHour: failed ?? 0,
    retrying: retrying ?? 0,
    reputation: reputation ?? [],
  });
}
