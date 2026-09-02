import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { summarizeSiteAnalytics, type SiteAnalyticsEventRow } from "@/lib/create/site-analytics";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** Owner analytics for one site — visits, speed samples, health, runtime errors. */
export async function GET(req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: projectId } = await params;

  if (!projectId || !/^[0-9a-f-]{36}$/i.test(projectId)) {
    return NextResponse.json({ error: "Invalid project id." }, { status: 400 });
  }

  const url = new URL(req.url);
  const hours = Math.min(168, Math.max(1, Number(url.searchParams.get("hours") ?? 72) || 72));
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  const { data: project } = await supabase
    .from("projects")
    .select("id, title, subdomain, published_at, status")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const { data: eventRows, error } = await supabase
    .from("site_analytics_events")
    .select(
      "id, project_id, subdomain, event_type, path, device, metric_name, metric_value, message, meta, created_at",
    )
    .eq("project_id", projectId)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(2000);

  if (error) {
    return NextResponse.json(
      {
        error: error.message?.includes("does not exist")
          ? "Analytics table missing. Apply migration 032_site_analytics.sql."
          : "Could not load analytics.",
        detail: error.message,
      },
      { status: 500 },
    );
  }

  let health: {
    ok: boolean | null;
    http_status: number | null;
    error_message: string | null;
    checked_at: string | null;
  } | null = null;

  if (project.subdomain) {
    const { data: healthRow } = await supabase
      .from("site_health_checks")
      .select("ok, http_status, error_message, checked_at")
      .eq("subdomain", project.subdomain)
      .maybeSingle();
    health = healthRow ?? null;
  }

  const summary = summarizeSiteAnalytics(
    (eventRows ?? []) as SiteAnalyticsEventRow[],
    health,
    hours,
  );

  return NextResponse.json({
    project: {
      id: project.id,
      title: project.title,
      subdomain: project.subdomain,
      publishedAt: project.published_at,
      status: project.status,
    },
    summary,
  });
}
