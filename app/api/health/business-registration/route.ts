import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const REQUIRED_TABLES = [
  "businesses",
  "business_members",
  "kebu_ids",
  "business_owners",
  "registration_progress",
  "business_readiness_scores",
  "business_create_idempotency",
  "business_audit_logs",
] as const;

/** Safe deploy check — confirms business registration schema is present. */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || url.includes("placeholder") || !serviceKey) {
    return NextResponse.json({
      ok: false,
      error: "Supabase not configured (URL + SUPABASE_SERVICE_ROLE_KEY required).",
      apply: "supabase/migrations/APPLY_MIGRATIONS_005_007.sql",
    });
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  const checks: Record<string, "ok" | "missing"> = {};
  for (const table of REQUIRED_TABLES) {
    const { error } = await supabase.from(table).select("*", { head: true, count: "exact" });
    checks[table] =
      error && (error.message.includes("does not exist") || error.code === "42P01") ? "missing" : "ok";
  }

  const { error: logoErr } = await supabase.from("businesses").select("logo_url", { head: true });
  const logoColumnOk = !logoErr || !logoErr.message.includes("logo_url");

  const missing = Object.entries(checks)
    .filter(([, v]) => v === "missing")
    .map(([k]) => k);
  const ok = missing.length === 0 && logoColumnOk;

  return NextResponse.json({
    ok,
    tables: checks,
    logoUrlColumn: logoColumnOk ? "ok" : "missing",
    apply: ok ? null : "Paste supabase/migrations/APPLY_MIGRATIONS_005_007.sql in Supabase SQL Editor and Run.",
    verifySql: "select tablename from pg_tables where schemaname='public' and tablename like 'business%' order by 1;",
  });
}
