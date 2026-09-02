import { NextResponse } from "next/server";
import { requireUser, logCreate } from "@/lib/create/auth";
import { recalculateAndStoreReadiness } from "@/lib/kebu-id/create-registration";
import { SAFE_REGISTRATION_FIELDS } from "@/lib/kebu-id/registration-schema";
import { z } from "zod";

import { isValidLegalStructure } from "@/lib/kebu-id/countries";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const founderUpdateSchema = z.object({
  tradingName: z.string().trim().max(160).optional().nullable(),
  description: z.string().trim().min(20).max(1000).optional(),
  businessEmail: z.string().trim().email().max(254).optional(),
  businessPhone: z.string().trim().min(5).max(40).optional(),
  website: z.string().trim().url().max(300).optional().nullable().or(z.literal("")),
  legalStructure: z.string().trim().min(1).max(80).optional(),
});

/** Load business dashboard payload — members only. */
export async function GET(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id } = await params;

  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid business id." }, { status: 400 });
  }

  const { data: membership } = await supabase
    .from("business_members")
    .select("role, status")
    .eq("business_id", id)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: "Business not found." }, { status: 404 });
  }

  const { data: business, error } = await supabase
    .from("businesses")
    .select(SAFE_REGISTRATION_FIELDS)
    .eq("id", id)
    .maybeSingle();

  if (error || !business) {
    logCreate("business.get_failed", { userId: user.id, businessId: id, message: error?.message });
    return NextResponse.json({ error: "Business not found." }, { status: 404 });
  }

  const [{ data: members }, { data: owners }, { data: progress }, { data: statusHistory }, { data: scores }, { data: websiteProjects }] =
    await Promise.all([
      supabase
        .from("business_members")
        .select("id, user_id, role, status, created_at")
        .eq("business_id", id)
        .order("created_at", { ascending: true }),
      supabase
        .from("business_owners")
        .select("id, full_name, email, ownership_percent, is_primary_founder")
        .eq("business_id", id),
      supabase
        .from("registration_progress")
        .select("step_key, label, sort_order, is_complete, completed_at")
        .eq("business_id", id)
        .order("sort_order", { ascending: true }),
      supabase
        .from("business_status_history")
        .select("id, from_status, to_status, note, created_at")
        .eq("business_id", id)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("business_readiness_scores")
        .select(
          "id, score_value, score_band, confidence_level, model_version, explanation, missing_items, helping_factors, limiting_factors, calculated_at, previous_score_id"
        )
        .eq("business_id", id)
        .order("calculated_at", { ascending: false })
        .limit(10),
      supabase
        .from("projects")
        .select("id, title, status, subdomain, published_at, updated_at")
        .eq("business_id", id)
        .eq("project_type", "website")
        .order("updated_at", { ascending: false }),
    ]);

  const latestScore = scores?.[0] ?? null;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";

  const websites = (websiteProjects ?? []).map((project) => {
    const previewPath = project.subdomain ? `/sites/${project.subdomain}` : null;
    return {
      ...project,
      editorUrl: `/create/${project.id}`,
      previewPath,
      liveUrl: previewPath ? (appUrl ? `${appUrl}${previewPath}` : previewPath) : null,
      plannedKebuAfrica: project.subdomain ? `${project.subdomain}.kebu.africa` : null,
      appPreviewUrl: previewPath && appUrl ? `${appUrl}${previewPath}` : null,
    };
  });

  return NextResponse.json({
    business,
    membership: { role: membership.role, status: membership.status },
    members: members ?? [],
    owners: owners ?? [],
    registrationProgress: progress ?? [],
    statusHistory: statusHistory ?? [],
    readiness: latestScore,
    readinessHistory: scores ?? [],
    websiteProjects: websites,
    placeholders: {
      website: business.website,
      store: null,
      governmentConnector: "mock_placeholder_not_live",
    },
  });
}

/** Founder/admin may update allowed profile fields; score recalculated server-side. */
export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id } = await params;

  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid business id." }, { status: 400 });
  }

  const { data: membership } = await supabase
    .from("business_members")
    .select("role, status")
    .eq("business_id", id)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!membership || !["founder", "administrator"].includes(membership.role)) {
    return NextResponse.json({ error: "Business not found." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (body && typeof body === "object") {
    const banned = ["scoreValue", "score", "readinessScore", "verification_level", "lifecycle_status", "registration_status", "public_kebu_id"];
    for (const key of banned) {
      if (key in body) {
        return NextResponse.json({ error: `Field '${key}' cannot be set from the browser.` }, { status: 400 });
      }
    }
  }

  const parsed = founderUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("businesses")
    .select("country_code, legal_structure, registration_status")
    .eq("id", id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Business not found." }, { status: 404 });
  }

  if (parsed.data.legalStructure !== undefined) {
    const lockedStatuses = ["submitted", "under_review", "registered", "rejected"];
    if (lockedStatuses.includes(existing.registration_status)) {
      return NextResponse.json(
        { error: "Legal structure cannot be changed after submission to authorities." },
        { status: 400 }
      );
    }
    if (!isValidLegalStructure(existing.country_code, parsed.data.legalStructure)) {
      return NextResponse.json({ error: "Invalid legal structure for this country." }, { status: 400 });
    }
  }

  const patch: Record<string, unknown> = {};
  if (parsed.data.tradingName !== undefined) patch.trading_name = parsed.data.tradingName || null;
  if (parsed.data.description !== undefined) patch.description = parsed.data.description;
  if (parsed.data.businessEmail !== undefined) patch.business_email = parsed.data.businessEmail;
  if (parsed.data.businessPhone !== undefined) patch.business_phone = parsed.data.businessPhone;
  if (parsed.data.website !== undefined) {
    patch.website = parsed.data.website === "" || parsed.data.website === null ? null : parsed.data.website;
  }
  if (parsed.data.legalStructure !== undefined) {
    patch.legal_structure = parsed.data.legalStructure;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No updatable fields provided." }, { status: 400 });
  }

  const { data: business, error } = await supabase
    .from("businesses")
    .update(patch)
    .eq("id", id)
    .select(SAFE_REGISTRATION_FIELDS)
    .single();

  if (error || !business) {
    return NextResponse.json({ error: "Could not update business.", detail: error?.message }, { status: 500 });
  }

  await supabase.from("business_audit_logs").insert({
    business_id: id,
    actor_user_id: user.id,
    action: "business.profile_updated",
    metadata: { fields: Object.keys(patch) },
  });

  const scoreResult = await recalculateAndStoreReadiness({ supabase, businessId: id });

  return NextResponse.json({
    business,
    readiness: scoreResult.ok ? scoreResult.score : null,
    readinessError: scoreResult.ok ? null : scoreResult.error,
  });
}
