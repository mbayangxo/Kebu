import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { createServiceClient } from "@/lib/opportunity/admin";
import { assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";
import { shopOrderRateLimit } from "@/lib/api-guard";
import { createHelpRequest, helpRequestCreateSchema } from "@/lib/platform/help-requests";

export const dynamic = "force-dynamic";

type HelpRequestRow = {
  id: string;
  subject: string;
  body: string;
  status: string;
  source: string;
  created_at: string;
  helped_at: string | null;
};

type ReplyRow = {
  id: string;
  help_request_id: string;
  author_type: "customer" | "team";
  author_name: string;
  body: string;
  created_at: string;
};

/** The signed-in user's own help requests + their reply threads — RLS-scoped (user_id = auth.uid()). */
export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const { data: requests, error } = await supabase
    .from("help_requests")
    .select("id, subject, body, status, source, created_at, helped_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json(
      { error: error.message.includes("help_requests") ? "Apply migration 20261103140000_help_requests_cron_runs.sql." : error.message },
      { status: 500 },
    );
  }

  const rows = (requests ?? []) as HelpRequestRow[];
  const ids = rows.map((r) => r.id);
  const repliesByRequest: Record<string, ReplyRow[]> = {};
  if (ids.length) {
    const { data: replies } = await supabase
      .from("help_request_replies")
      .select("id, help_request_id, author_type, author_name, body, created_at")
      .in("help_request_id", ids)
      .order("created_at", { ascending: true });
    for (const r of (replies ?? []) as ReplyRow[]) {
      (repliesByRequest[r.help_request_id] ??= []).push(r);
    }
  }

  return NextResponse.json({
    requests: rows.map((r) => ({ ...r, replies: repliesByRequest[r.id] ?? [] })),
    accountId: user.id,
  });
}

/** Create a help request from inside a signed-in account — real account email, source: in_app. */
export async function POST(req: Request) {
  const limited = shopOrderRateLimit(req);
  if (limited) return limited;
  const csrf = assertSameOriginMutation(req);
  if (csrf) return csrf;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { user } = auth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const admin = createServiceClient();
  if (!admin) return NextResponse.json({ error: "Service unavailable." }, { status: 503 });

  // The account's authoritative name/email, not whatever a client sent —
  // mirrors the account-context enrichment the admin side also relies on.
  const { data: profile } = await admin
    .from("user_profiles")
    .select("name, email")
    .eq("id", user.id)
    .maybeSingle();

  const rec = body as Record<string, unknown>;
  const parsed = helpRequestCreateSchema.safeParse({
    name: profile?.name || (rec.name as string) || "Kebu account",
    email: profile?.email || user.email || "",
    phone: typeof rec.phone === "string" ? rec.phone : undefined,
    subject: rec.subject,
    body: rec.body,
    source: "in_app",
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Please fill subject and message." }, { status: 400 });
  }

  const created = await createHelpRequest(admin, parsed.data, user.id);
  if (!created.ok) {
    return NextResponse.json({ error: created.error }, { status: 503 });
  }

  return NextResponse.json({ ok: true, id: created.id });
}
