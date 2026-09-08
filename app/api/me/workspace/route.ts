import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/create/auth";
import {
  resolveAccountContext,
  workspacePatchSchema,
  type WorkspaceBusiness,
} from "@/lib/account/workspace-context";

export const dynamic = "force-dynamic";

const BUSINESS_SELECT =
  "id, public_kebu_id, legal_name, trading_name, lifecycle_status";

async function loadBusinessesForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<WorkspaceBusiness[]> {
  const { data: memberships } = await supabase
    .from("business_members")
    .select("business_id, role")
    .eq("user_id", userId)
    .eq("status", "active");

  const businessIds = (memberships ?? []).map((m) => m.business_id);
  if (businessIds.length === 0) return [];

  const roleByBusiness = new Map((memberships ?? []).map((m) => [m.business_id, m.role]));

  const { data: bizRows } = await supabase
    .from("businesses")
    .select(BUSINESS_SELECT)
    .in("id", businessIds)
    .neq("lifecycle_status", "archived");

  return (bizRows ?? []).map((b) => ({
    id: b.id,
    publicKebuId: b.public_kebu_id,
    name: b.trading_name?.trim() || b.legal_name,
    role: roleByBusiness.get(b.id) ?? "member",
  }));
}

/** Personal vs Business Kebu workspace context — server-persisted. */
export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const businesses = await loadBusinessesForUser(supabase, user.id);

  const { data: profileRow, error } = await supabase
    .from("user_profiles")
    .select("active_business_id")
    .eq("id", user.id)
    .maybeSingle();

  if (error?.message?.includes("active_business_id")) {
    return NextResponse.json({
      context: resolveAccountContext({ activeBusinessId: null, businesses }),
      migrationRequired: "061_account_workspace_context",
    });
  }

  const context = resolveAccountContext({
    activeBusinessId: profileRow?.active_business_id ?? null,
    businesses,
  });

  return NextResponse.json({ context });
}

/** Switch between Personal Kebu and a Business Kebu workspace. */
export async function PATCH(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = workspacePatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const businesses = await loadBusinessesForUser(supabase, user.id);
  const activeBusinessId =
    parsed.data.mode === "personal"
      ? null
      : businesses.some((b) => b.id === parsed.data.businessId)
        ? parsed.data.businessId
        : null;

  if (parsed.data.mode === "business" && !activeBusinessId) {
    return NextResponse.json({ error: "You are not a member of that business." }, { status: 403 });
  }

  const { error } = await supabase
    .from("user_profiles")
    .update({ active_business_id: activeBusinessId, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error?.message?.includes("active_business_id")) {
    return NextResponse.json(
      { error: "Apply migration 061 (account workspace context)." },
      { status: 503 },
    );
  }

  if (error) {
    return NextResponse.json({ error: "Could not save workspace context." }, { status: 500 });
  }

  const context = resolveAccountContext({ activeBusinessId, businesses });

  return NextResponse.json({ ok: true, context });
}
