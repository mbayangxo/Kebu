import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/opportunity/admin";
import { assertAdminCookie, assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";
import { HELP_REQUEST_STATUSES, type HelpRequestStatus } from "@/lib/platform/help-requests";

export const dynamic = "force-dynamic";

/**
 * Internal Kebu Record ops overview — accounts, help desk, cron health, platform totals.
 */
export async function GET(req: Request) {
  if (!assertAdminCookie(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const supabase = createServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: "Service client not configured." }, { status: 503 });
  }

  const now = Date.now();
  const dayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
  const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    businessesRes,
    publishedRes,
    domainsRes,
    deploymentsRes,
    productsRes,
    designsRes,
    recentBusinessesRes,
    accountsDay,
    accountsWeek,
    accountsMonth,
    accountsTotal,
    helpOpen,
    helpInProgress,
    helpHelped,
    helpClosed,
    helpWeek,
    helpRecent,
    healthFailed,
    healthTotal,
    healthRecentFail,
    billingPastDue,
    billingExpired,
    ordersWeek,
    aiMonth,
    cronRuns,
  ] = await Promise.all([
    supabase.from("businesses").select("id", { count: "exact", head: true }),
    supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("project_type", "website")
      .not("published_at", "is", null),
    supabase.from("site_domains").select("id, hostname, status, provider, project_id"),
    supabase.from("deployments").select("id", { count: "exact", head: true }).eq("status", "live"),
    supabase.from("project_products").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("create_designs").select("id", { count: "exact", head: true }),
    supabase
      .from("businesses")
      .select("id, public_kebu_id, legal_name, country_code, lifecycle_status, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.from("user_profiles").select("id", { count: "exact", head: true }).gte("created_at", dayAgo),
    supabase.from("user_profiles").select("id", { count: "exact", head: true }).gte("created_at", weekAgo),
    supabase.from("user_profiles").select("id", { count: "exact", head: true }).gte("created_at", monthAgo),
    supabase.from("user_profiles").select("id", { count: "exact", head: true }),
    supabase.from("help_requests").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("help_requests").select("id", { count: "exact", head: true }).eq("status", "in_progress"),
    supabase.from("help_requests").select("id", { count: "exact", head: true }).eq("status", "helped"),
    supabase.from("help_requests").select("id", { count: "exact", head: true }).eq("status", "closed"),
    supabase.from("help_requests").select("id", { count: "exact", head: true }).gte("created_at", weekAgo),
    supabase
      .from("help_requests")
      .select("id, name, email, phone, subject, status, source, created_at, helped_at, helped_by")
      .order("created_at", { ascending: false })
      .limit(30),
    supabase.from("site_health_checks").select("id", { count: "exact", head: true }).eq("ok", false),
    supabase.from("site_health_checks").select("id", { count: "exact", head: true }),
    supabase
      .from("site_health_checks")
      .select("subdomain, ok, http_status, error_message, checked_at")
      .eq("ok", false)
      .order("checked_at", { ascending: false })
      .limit(20),
    supabase.from("site_subscriptions").select("id", { count: "exact", head: true }).eq("status", "past_due"),
    supabase.from("site_subscriptions").select("id", { count: "exact", head: true }).eq("status", "expired"),
    supabase.from("shop_orders").select("id", { count: "exact", head: true }).gte("created_at", weekAgo),
    supabase.from("account_ai_usage_events").select("id", { count: "exact", head: true }).gte("created_at", monthAgo),
    supabase
      .from("platform_cron_runs")
      .select("id, job_name, status, summary, error_message, started_at, finished_at")
      .order("finished_at", { ascending: false })
      .limit(24),
  ]);

  const domains = domainsRes.data ?? [];
  const verifiedDomains = domains.filter((d) => d.status === "verified");

  const helpTableMissing =
    Boolean(helpOpen.error?.message?.includes("help_requests")) ||
    Boolean(helpRecent.error?.message?.includes("help_requests"));
  const cronTableMissing = Boolean(cronRuns.error?.message?.includes("platform_cron_runs"));

  const helpedTotal = (helpHelped.count ?? 0) + (helpClosed.count ?? 0);

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    counts: {
      businesses: businessesRes.count ?? 0,
      publishedWebsites: publishedRes.count ?? 0,
      liveDeployments: deploymentsRes.count ?? 0,
      connectedDomains: domains.length,
      verifiedDomains: verifiedDomains.length,
      catalogProducts: productsRes.count ?? 0,
      createDesigns: designsRes.count ?? 0,
    },
    accounts: {
      day: accountsDay.count ?? 0,
      week: accountsWeek.count ?? 0,
      month: accountsMonth.count ?? 0,
      total: accountsTotal.count ?? 0,
    },
    help: {
      open: helpOpen.count ?? 0,
      inProgress: helpInProgress.count ?? 0,
      helped: helpHelped.count ?? 0,
      closed: helpClosed.count ?? 0,
      helpedOrClosed: helpedTotal,
      requestsThisWeek: helpWeek.count ?? 0,
      recent: helpRecent.data ?? [],
      migrationNeeded: helpTableMissing,
    },
    health: {
      failedSites: healthFailed.count ?? 0,
      checkedSites: healthTotal.count ?? 0,
      recentFailures: healthRecentFail.data ?? [],
      billingPastDue: billingPastDue.count ?? 0,
      billingExpired: billingExpired.count ?? 0,
      shopOrdersThisWeek: ordersWeek.count ?? 0,
      aiEventsThisMonth: aiMonth.count ?? 0,
    },
    crons: {
      recent: cronRuns.data ?? [],
      migrationNeeded: cronTableMissing,
    },
    domains: domains.slice(0, 50),
    recentBusinesses: recentBusinessesRes.data ?? [],
    notes: [
      "Kebu Record = internal team portal for platform analytics and hosted assets.",
      "New accounts = user_profiles.created_at (signup).",
      "Help requests come from /contact — mark Helped when resolved.",
      "Cron rows need migration 083; site probe failures come from site_health_checks.",
      "SMS delivery in Africa can be unreliable — Shop fulfill defaults to WhatsApp.",
    ],
  });
}

/** PATCH help request status (open → in_progress → helped / closed). */
export async function PATCH(req: Request) {
  if (!assertAdminCookie(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const csrf = assertSameOriginMutation(req);
  if (csrf) return csrf;

  const supabase = createServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: "Service client not configured." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const rec = body as Record<string, unknown>;
  const id = typeof rec.id === "string" ? rec.id : "";
  const status = typeof rec.status === "string" ? rec.status : "";
  const staffNote = typeof rec.staffNote === "string" ? rec.staffNote.slice(0, 1000) : null;
  const helpedBy = typeof rec.helpedBy === "string" ? rec.helpedBy.slice(0, 120) : "admin";

  if (!id || !(HELP_REQUEST_STATUSES as readonly string[]).includes(status)) {
    return NextResponse.json({ error: "id and valid status required." }, { status: 400 });
  }

  const patch: Record<string, unknown> = {
    status: status as HelpRequestStatus,
    updated_at: new Date().toISOString(),
    staff_note: staffNote,
  };
  if (status === "helped" || status === "closed") {
    patch.helped_at = new Date().toISOString();
    patch.helped_by = helpedBy;
  }

  const { data, error } = await supabase
    .from("help_requests")
    .update(patch)
    .eq("id", id)
    .select("id, status, helped_at, helped_by")
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json(
      {
        error: error?.message?.includes("help_requests")
          ? "Apply migration 083_help_requests_cron_runs.sql."
          : "Could not update help request.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, request: data });
}
