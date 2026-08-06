import { NextResponse } from "next/server";
import { requireUser, logCreate } from "@/lib/create/auth";
import { generatePublicKebuId } from "@/lib/kebu-id/public-id";
import { createDraftBusinessSchema, SAFE_BUSINESS_FIELDS } from "@/lib/kebu-id/schemas";

export const dynamic = "force-dynamic";

function missingTableMessage(message?: string) {
  if (message?.includes("does not exist") || message?.includes("42P01")) {
    return "Business tables missing. Apply supabase/migrations/005_kebu_id_draft_business.sql in Supabase.";
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
    .select(SAFE_BUSINESS_FIELDS)
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

/** Create a draft business + founder membership + audit (+ idempotency). */
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

  // Idempotent replay
  const { data: existingKey } = await supabase
    .from("business_create_idempotency")
    .select("business_id")
    .eq("user_id", user.id)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (existingKey?.business_id) {
    const { data: existingBiz } = await supabase
      .from("businesses")
      .select(SAFE_BUSINESS_FIELDS)
      .eq("id", existingKey.business_id)
      .maybeSingle();

    if (existingBiz) {
      return NextResponse.json({ business: existingBiz, idempotent: true });
    }
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = createDraftBusinessSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const input = parsed.data;
  let publicId = generatePublicKebuId(input.countryCode);
  let business:
    | {
        id: string;
        public_kebu_id: string;
        legal_name: string;
        trading_name: string | null;
        country_code: string;
        category: string;
        description: string;
        lifecycle_status: string;
        verification_level: number;
        created_at: string;
        updated_at: string;
      }
    | null = null;

  // Rare collision retry on public_kebu_id
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await supabase
      .from("businesses")
      .insert({
        public_kebu_id: publicId,
        legal_name: input.legalName,
        trading_name: input.tradingName ?? null,
        country_code: input.countryCode,
        category: input.category,
        description: input.description,
        lifecycle_status: "draft",
        verification_level: 1,
        created_by: user.id,
      })
      .select(SAFE_BUSINESS_FIELDS)
      .single();

    if (!error && data) {
      business = data;
      break;
    }

    if (error?.code === "23505" && error.message.includes("public_kebu_id")) {
      publicId = generatePublicKebuId(input.countryCode);
      continue;
    }

    logCreate("business.create_failed", { userId: user.id, message: error?.message, code: error?.code });
    return NextResponse.json(
      {
        error: missingTableMessage(error?.message) ?? "Could not create business.",
        detail: error?.message,
      },
      { status: 500 }
    );
  }

  if (!business) {
    return NextResponse.json({ error: "Could not allocate a unique Kebu ID." }, { status: 500 });
  }

  const { error: memberError } = await supabase.from("business_members").insert({
    business_id: business.id,
    user_id: user.id,
    role: "founder",
    status: "active",
  });

  if (memberError) {
    await supabase.from("businesses").delete().eq("id", business.id);
    logCreate("business.member_failed", { userId: user.id, businessId: business.id, message: memberError.message });
    return NextResponse.json(
      { error: "Could not create founder membership.", detail: memberError.message },
      { status: 500 }
    );
  }

  const { error: auditError } = await supabase.from("business_audit_logs").insert({
    business_id: business.id,
    actor_user_id: user.id,
    action: "business.draft_created",
    metadata: {
      public_kebu_id: business.public_kebu_id,
      country_code: business.country_code,
      category: business.category,
    },
  });

  if (auditError) {
    logCreate("business.audit_failed", { userId: user.id, businessId: business.id, message: auditError.message });
    // Constitution requires audit — fail and cascade-delete the draft business
    await supabase.from("businesses").delete().eq("id", business.id);
    return NextResponse.json(
      { error: "Could not write audit log.", detail: auditError.message },
      { status: 500 }
    );
  }

  const { error: idemError } = await supabase.from("business_create_idempotency").insert({
    user_id: user.id,
    idempotency_key: idempotencyKey,
    business_id: business.id,
  });

  if (idemError) {
    // If duplicate key raced, return the existing business for that key
    if (idemError.code === "23505") {
      const { data: raced } = await supabase
        .from("business_create_idempotency")
        .select("business_id")
        .eq("user_id", user.id)
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();
      if (raced?.business_id) {
        const { data: racedBiz } = await supabase
          .from("businesses")
          .select(SAFE_BUSINESS_FIELDS)
          .eq("id", raced.business_id)
          .maybeSingle();
        if (racedBiz) {
          // Clean orphan from this attempt if different
          if (racedBiz.id !== business.id) {
            await supabase.from("businesses").delete().eq("id", business.id);
          }
          return NextResponse.json({ business: racedBiz, idempotent: true });
        }
      }
    }
    logCreate("business.idempotency_failed", { userId: user.id, message: idemError.message });
  }

  logCreate("business.draft_created", {
    userId: user.id,
    businessId: business.id,
    publicKebuId: business.public_kebu_id,
  });

  return NextResponse.json({ business, idempotent: false }, { status: 201 });
}
