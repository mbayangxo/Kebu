import { NextRequest, NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/api-guard";
import { createClient } from "@supabase/supabase-js";
import { recordPlatformCronRun } from "@/lib/platform/cron-runs";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

type CheckResult = {
  subdomain: string;
  ok: boolean;
  status?: number;
  error?: string;
  checkedAt: string;
};

/** Daily probe of published sites — set CRON_SECRET and call from Vercel Cron. */
export async function GET(req: NextRequest) {
  const denied = requireCronSecret(req);
  if (denied) return denied;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: "Supabase service credentials missing." },
      { status: 503 },
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const startedAt = new Date();

  const { data: deployments, error } = await supabase
    .from("deployments")
    .select("subdomain, published_at")
    .eq("status", "live")
    .order("published_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results: CheckResult[] = [];
  const checkedAt = new Date().toISOString();

  for (const row of deployments ?? []) {
    const subdomain = row.subdomain as string;
    const url = `${appUrl}/sites/${subdomain}`;
    try {
      const res = await fetch(url, { method: "HEAD", redirect: "follow", signal: AbortSignal.timeout(12_000) });
      const ok = res.ok;
      results.push({ subdomain, ok, status: res.status, checkedAt });
      await supabase.from("site_health_checks").upsert(
        {
          subdomain,
          ok,
          http_status: res.status,
          error_message: ok ? null : `HTTP ${res.status}`,
          checked_at: checkedAt,
        },
        { onConflict: "subdomain" },
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : "Check failed";
      results.push({ subdomain, ok: false, error: message, checkedAt });
      await supabase.from("site_health_checks").upsert(
        {
          subdomain,
          ok: false,
          http_status: null,
          error_message: message,
          checked_at: checkedAt,
        },
        { onConflict: "subdomain" },
      );
    }
  }

  const failed = results.filter((r) => !r.ok).length;
  const summary = {
    checked: results.length,
    failed,
    note: "Apply migration 014 before first run.",
  };
  await recordPlatformCronRun(supabase, {
    jobName: "site-health",
    status: failed > 0 ? (results.length === failed ? "error" : "partial") : "ok",
    startedAt,
    summary,
  });
  return NextResponse.json({
    ...summary,
    results,
  });
}
