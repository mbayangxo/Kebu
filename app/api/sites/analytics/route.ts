import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/opportunity/admin";
import { publicSiteRateLimit } from "@/lib/api-guard";
import {
  deviceFromUserAgent,
  siteAnalyticsIngestSchema,
} from "@/lib/create/site-analytics";

export const dynamic = "force-dynamic";

/**
 * Public beacon for live sites — records pageviews, vitals, and client errors.
 * Does not accept client-chosen project ids (resolved from published subdomain).
 */
export async function POST(req: Request) {
  const limited = publicSiteRateLimit(req);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = siteAnalyticsIngestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid event.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const service = createServiceClient();
  if (!service) {
    return NextResponse.json({ error: "Analytics not configured." }, { status: 503 });
  }

  const { data: project } = await service
    .from("projects")
    .select("id, subdomain, published_at")
    .eq("subdomain", parsed.data.subdomain)
    .eq("project_type", "website")
    .not("published_at", "is", null)
    .maybeSingle();

  if (!project?.id) {
    return NextResponse.json({ error: "Site not found." }, { status: 404 });
  }

  const ua = req.headers.get("user-agent") ?? "";
  const device = parsed.data.device ?? deviceFromUserAgent(ua);

  const { error } = await service.from("site_analytics_events").insert({
    project_id: project.id,
    subdomain: parsed.data.subdomain,
    event_type: parsed.data.eventType,
    path: parsed.data.path || "/",
    device,
    metric_name: parsed.data.metricName ?? null,
    metric_value: parsed.data.metricValue ?? null,
    message: parsed.data.message ?? null,
    meta: parsed.data.meta ?? {},
  });

  if (error) {
    if (error.message?.includes("does not exist")) {
      return NextResponse.json(
        { error: "Analytics table missing. Apply migration 032_site_analytics.sql." },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "Could not record event." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
