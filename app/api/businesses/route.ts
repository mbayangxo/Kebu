import { NextResponse } from "next/server";
import { requireUser, logCreate } from "@/lib/create/auth";
import { createRegisteredBusiness } from "@/lib/kebu-id/create-registration";
import { registerBusinessSchema, SAFE_REGISTRATION_FIELDS } from "@/lib/kebu-id/registration-schema";

export const dynamic = "force-dynamic";

function missingTableMessage(message?: string) {
  if (message?.includes("does not exist") || message?.includes("42P01") || message?.includes("column")) {
    return "Business registration tables missing. Apply supabase/migrations/005–007 in Supabase.";
  }
  return null;
}

/** List businesses where the user is an active member. */
export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const { data: memberships, error: memErr } = await supabase
    .from("business_members")
    .select("business_id, role, status")
    .eq("user_id", user.id)
    .eq("status", "active");

  if (memErr) {
    logCreate("business.list_memberships_failed", { userId: user.id, message: memErr.message });
    return NextResponse.json(
      { error: missingTableMessage(memErr.message) ?? "Could not load memberships.", detail: memErr.message },
      { status: 500 }
    );
  }

  const ids = (memberships ?? []).map((m) => m.business_id);
  if (ids.length === 0) {
    return NextResponse.json({ businesses: [] });
  }

  const { data, error } = await supabase
    .from("businesses")
    .select(SAFE_REGISTRATION_FIELDS)
    .in("id", ids)
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: missingTableMessage(error.message) ?? "Could not load businesses.", detail: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ businesses: data ?? [] });
}

/** Register a draft business (wizard) — UUID, Kebu ID, founder, owners, progress, readiness, audit. */
export async function POST(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const idempotencyKey = req.headers.get("idempotency-key")?.trim() ?? "";
  if (idempotencyKey.length < 8 || idempotencyKey.length > 128) {
    return NextResponse.json(
      { error: "Idempotency-Key header required (8–128 characters)." },
      { status: 400 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // Reject client-supplied scores
  if (body && typeof body === "object" && ("scoreValue" in body || "score" in body || "readinessScore" in body)) {
    return NextResponse.json(
      { error: "Score values cannot be submitted from the browser." },
      { status: 400 }
    );
  }

  const parsed = registerBusinessSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const result = await createRegisteredBusiness({
    supabase,
    user,
    input: parsed.data,
    idempotencyKey,
  });

  if (!result.ok) {
    logCreate("business.registration_failed", { userId: user.id, error: result.error, detail: result.detail });
    return NextResponse.json(
      { error: result.error, detail: result.detail, issues: result.issues },
      { status: result.status }
    );
  }

  logCreate("business.registration_draft_created", {
    userId: user.id,
    businessId: result.business.id,
    publicKebuId: result.business.public_kebu_id,
    idempotent: result.idempotent,
  });

  return NextResponse.json(
    { business: result.business, idempotent: result.idempotent },
    { status: result.idempotent ? 200 : 201 }
  );
}
