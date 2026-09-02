import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { recalculateAndStoreReadiness } from "@/lib/kebu-id/create-registration";
import { generateKebuBusinessRecord } from "@/lib/kebu-id/kebu-business-record";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

async function assertFounder(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>,
  userId: string,
  businessId: string,
) {
  const { data: membership } = await supabase
    .from("business_members")
    .select("role, status")
    .eq("business_id", businessId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (!membership || !["founder", "administrator"].includes(membership.role)) {
    return null;
  }
  return membership;
}

/** Generate or refresh the official Kebu Business Record (permanent ID snapshot). */
export async function POST(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: businessId } = await params;

  if (!businessId || !/^[0-9a-f-]{36}$/i.test(businessId)) {
    return NextResponse.json({ error: "Invalid business id." }, { status: 400 });
  }

  const membership = await assertFounder(supabase, user.id, businessId);
  if (!membership) {
    return NextResponse.json({ error: "Business not found." }, { status: 404 });
  }

  const result = await generateKebuBusinessRecord({
    supabase,
    businessId,
    userId: user.id,
  });

  if (!result.ok) {
    const needsMigration =
      result.error.includes("business_kebu_records") || result.error.includes("does not exist");
    return NextResponse.json(
      {
        error: needsMigration
          ? "Apply migration 021_kebu_business_records.sql in Supabase first."
          : "Could not generate Kebu record.",
        detail: result.error,
      },
      { status: needsMigration ? 503 : 500 },
    );
  }

  const scoreResult = await recalculateAndStoreReadiness({ supabase, businessId });

  return NextResponse.json({
    recordId: result.recordId,
    downloadUrl: result.downloadUrl,
    snapshot: result.snapshot,
    readiness: scoreResult.ok ? scoreResult.score : null,
  });
}

/** Latest Kebu record metadata for this business. */
export async function GET(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: businessId } = await params;

  if (!businessId || !/^[0-9a-f-]{36}$/i.test(businessId)) {
    return NextResponse.json({ error: "Invalid business id." }, { status: 400 });
  }

  const { data: membership } = await supabase
    .from("business_members")
    .select("role")
    .eq("business_id", businessId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: "Business not found." }, { status: 404 });
  }

  const { data: record, error } = await supabase
    .from("business_kebu_records")
    .select("id, record_version, public_kebu_id, generated_at, storage_path")
    .eq("business_id", businessId)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      {
        error: error.message.includes("does not exist")
          ? "Apply migration 021_kebu_business_records.sql in Supabase."
          : "Could not load record.",
        detail: error.message,
      },
      { status: 500 },
    );
  }

  if (!record) {
    return NextResponse.json({ record: null });
  }

  const { data: signed } = await supabase.storage
    .from("business-documents")
    .createSignedUrl(record.storage_path, 3600);

  return NextResponse.json({
    record: {
      ...record,
      downloadUrl: signed?.signedUrl ?? null,
    },
  });
}
