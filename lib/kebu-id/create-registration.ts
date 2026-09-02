import type { SupabaseClient } from "@supabase/supabase-js";
import { generatePublicKebuId } from "@/lib/kebu-id/public-id";
import {
  documentsComplete,
  hasGovRegistrationCerts,
  hasWestAfricaTradeDocs,
} from "@/lib/kebu-id/business-documents";
import { hasKebuOfficialRecord } from "@/lib/kebu-id/kebu-business-record";
import {
  calculateBusinessReadiness,
  infoCompleteFromProfile,
  REGISTRATION_TIMELINE,
} from "@/lib/kebu-id/readiness";
import type { RegisterBusinessInput } from "@/lib/kebu-id/registration-schema";
import { SAFE_REGISTRATION_FIELDS } from "@/lib/kebu-id/registration-schema";

type AuthUser = { id: string };

export async function createRegisteredBusiness(opts: {
  supabase: SupabaseClient;
  user: AuthUser;
  input: RegisterBusinessInput;
  idempotencyKey: string;
}): Promise<
  | { ok: true; business: Record<string, unknown>; idempotent: boolean }
  | { ok: false; status: number; error: string; detail?: string; issues?: unknown }
> {
  const { supabase, user, input, idempotencyKey } = opts;

  const { data: existingKey } = await supabase
    .from("business_create_idempotency")
    .select("business_id")
    .eq("user_id", user.id)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (existingKey?.business_id) {
    const { data: existingBiz } = await supabase
      .from("businesses")
      .select(SAFE_REGISTRATION_FIELDS)
      .eq("id", existingKey.business_id)
      .maybeSingle();
    if (existingBiz) {
      return { ok: true, business: existingBiz, idempotent: true };
    }
  }

  let publicId = generatePublicKebuId(input.countryCode);
  let business: Record<string, unknown> | null = null;

  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await supabase
      .from("businesses")
      .insert({
        public_kebu_id: publicId,
        legal_name: input.legalName,
        trading_name: input.tradingName ?? null,
        country_code: input.countryCode,
        region: input.region,
        category: input.category,
        description: input.description,
        business_email: input.businessEmail,
        business_phone: input.businessPhone,
        website: input.website ?? null,
        legal_structure: input.legalStructure,
        registration_status: "draft",
        lifecycle_status: "draft",
        verification_level: 1,
        created_by: user.id,
      })
      .select(SAFE_REGISTRATION_FIELDS)
      .single();

    if (!error && data) {
      business = data as Record<string, unknown>;
      break;
    }
    if (error?.code === "23505" && error.message.includes("public_kebu_id")) {
      publicId = generatePublicKebuId(input.countryCode);
      continue;
    }
    return {
      ok: false,
      status: 500,
      error: missingTable(error?.message) ?? "Could not create business.",
      detail: error?.message,
    };
  }

  if (!business?.id) {
    return { ok: false, status: 500, error: "Could not allocate a unique Kebu ID." };
  }

  const businessId = String(business.id);

  const { error: kebuIdErr } = await supabase.from("kebu_ids").insert({
    business_id: businessId,
    public_kebu_id: String(business.public_kebu_id),
  });
  if (kebuIdErr) {
    await supabase.from("businesses").delete().eq("id", businessId);
    return { ok: false, status: 500, error: "Could not issue Kebu ID ledger row.", detail: kebuIdErr.message };
  }

  const { error: memberError } = await supabase.from("business_members").insert({
    business_id: businessId,
    user_id: user.id,
    role: "founder",
    status: "active",
  });
  if (memberError) {
    await supabase.from("businesses").delete().eq("id", businessId);
    return { ok: false, status: 500, error: "Could not create founder membership.", detail: memberError.message };
  }

  const { error: ownerError } = await supabase.from("business_owners").insert({
    business_id: businessId,
    full_name: input.founderName,
    email: input.founderEmail,
    ownership_percent: input.ownershipPercent,
    is_primary_founder: true,
    user_id: user.id,
  });
  if (ownerError) {
    await supabase.from("businesses").delete().eq("id", businessId);
    return { ok: false, status: 500, error: "Could not create founder owner record.", detail: ownerError.message };
  }

  const { error: statusHistErr } = await supabase.from("business_status_history").insert({
    business_id: businessId,
    from_status: null,
    to_status: "draft",
    actor_user_id: user.id,
    note: "Business registration draft created",
  });
  if (statusHistErr) {
    await supabase.from("businesses").delete().eq("id", businessId);
    return { ok: false, status: 500, error: "Could not write status history.", detail: statusHistErr.message };
  }

  const profile = {
    legalName: input.legalName,
    tradingName: input.tradingName,
    countryCode: input.countryCode,
    region: input.region,
    category: input.category,
    description: input.description,
    businessEmail: input.businessEmail,
    businessPhone: input.businessPhone,
    website: input.website,
    legalStructure: input.legalStructure,
    founderName: input.founderName,
    founderEmail: input.founderEmail,
    ownershipPercent: input.ownershipPercent,
  };
  const infoComplete = infoCompleteFromProfile(profile);

  const progressRows = REGISTRATION_TIMELINE.map((step) => {
    const complete =
      step.stepKey === "business_created" ||
      (step.stepKey === "business_information_complete" && infoComplete);
    return {
      business_id: businessId,
      step_key: step.stepKey,
      label: step.label,
      sort_order: step.sortOrder,
      is_complete: complete,
      completed_at: complete ? new Date().toISOString() : null,
    };
  });

  const { error: progressErr } = await supabase.from("registration_progress").insert(progressRows);
  if (progressErr) {
    await supabase.from("businesses").delete().eq("id", businessId);
    return { ok: false, status: 500, error: "Could not seed registration progress.", detail: progressErr.message };
  }

  const readiness = calculateBusinessReadiness({
    ...profile,
    registrationDocumentsComplete: false,
  });
  const { error: scoreErr } = await supabase.from("business_readiness_scores").insert({
    business_id: businessId,
    score_value: readiness.scoreValue,
    score_band: readiness.scoreBand,
    confidence_level: readiness.confidenceLevel,
    model_version: readiness.modelVersion,
    explanation: readiness.explanation,
    missing_items: readiness.missingItems,
    helping_factors: readiness.helpingFactors,
    limiting_factors: readiness.limitingFactors,
    previous_score_id: null,
  });
  if (scoreErr) {
    await supabase.from("businesses").delete().eq("id", businessId);
    return { ok: false, status: 500, error: "Could not store readiness score.", detail: scoreErr.message };
  }

  // If info complete, move registration_status to preparing (append history)
  if (infoComplete) {
    await supabase
      .from("businesses")
      .update({ registration_status: "preparing" })
      .eq("id", businessId);
    await supabase.from("business_status_history").insert({
      business_id: businessId,
      from_status: "draft",
      to_status: "preparing",
      actor_user_id: user.id,
      note: "Profile information complete — preparing for later government steps",
    });
    business = { ...business, registration_status: "preparing" };
  }

  const { error: auditError } = await supabase.from("business_audit_logs").insert({
    business_id: businessId,
    actor_user_id: user.id,
    action: "business.registration_draft_created",
    metadata: {
      public_kebu_id: business.public_kebu_id,
      country_code: input.countryCode,
      legal_structure: input.legalStructure,
      readiness_score: readiness.scoreValue,
    },
  });
  if (auditError) {
    await supabase.from("businesses").delete().eq("id", businessId);
    return { ok: false, status: 500, error: "Could not write audit log.", detail: auditError.message };
  }

  const { error: idemError } = await supabase.from("business_create_idempotency").insert({
    user_id: user.id,
    idempotency_key: idempotencyKey,
    business_id: businessId,
  });
  if (idemError?.code === "23505") {
    const { data: raced } = await supabase
      .from("business_create_idempotency")
      .select("business_id")
      .eq("user_id", user.id)
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();
    if (raced?.business_id) {
      const { data: racedBiz } = await supabase
        .from("businesses")
        .select(SAFE_REGISTRATION_FIELDS)
        .eq("id", raced.business_id)
        .maybeSingle();
      if (racedBiz) {
        if (racedBiz.id !== businessId) {
          await supabase.from("businesses").delete().eq("id", businessId);
        }
        return { ok: true, business: racedBiz, idempotent: true };
      }
    }
  }

  return { ok: true, business, idempotent: false };
}

function seoHasLogo(seo: unknown): boolean {
  if (!seo || typeof seo !== "object") return false;
  const row = seo as Record<string, unknown>;
  const favicon = typeof row.faviconUrl === "string" ? row.faviconUrl.trim() : "";
  const og = typeof row.ogImageUrl === "string" ? row.ogImageUrl.trim() : "";
  return Boolean(favicon || og);
}

async function gatherBusinessActivitySignals(
  supabase: SupabaseClient,
  businessId: string,
): Promise<{
  hasSiteLogo: boolean;
  siteProductCount: number;
  createAssetCount: number;
}> {
  const { data: linkedProjects } = await supabase
    .from("projects")
    .select("seo")
    .eq("business_id", businessId);

  const hasSiteLogo = (linkedProjects ?? []).some((p) => seoHasLogo(p.seo));

  const { count: productCount } = await supabase
    .from("project_products")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .eq("is_active", true);

  const { count: designCount } = await supabase
    .from("create_designs")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId);

  return {
    hasSiteLogo,
    siteProductCount: productCount ?? 0,
    createAssetCount: designCount ?? 0,
  };
}

export async function recalculateAndStoreReadiness(opts: {
  supabase: SupabaseClient;
  businessId: string;
}): Promise<{ ok: true; score: Record<string, unknown> } | { ok: false; error: string }> {
  const { supabase, businessId } = opts;

  const { data: business, error: bErr } = await supabase
    .from("businesses")
    .select(SAFE_REGISTRATION_FIELDS)
    .eq("id", businessId)
    .maybeSingle();
  if (bErr || !business) return { ok: false, error: bErr?.message ?? "Business not found" };

  const { data: owners } = await supabase
    .from("business_owners")
    .select("full_name, email, ownership_percent, is_primary_founder")
    .eq("business_id", businessId)
    .eq("is_primary_founder", true)
    .limit(1);

  const founder = owners?.[0];

  const { data: docRows } = await supabase
    .from("business_documents")
    .select("document_type")
    .eq("business_id", businessId);
  const uploadedDocTypes = [...new Set((docRows ?? []).map((d) => d.document_type))];
  const registrationDocumentsComplete = documentsComplete(uploadedDocTypes);

  const { data: publishedSites } = await supabase
    .from("projects")
    .select("id")
    .eq("business_id", businessId)
    .eq("project_type", "website")
    .not("published_at", "is", null)
    .limit(1);

  const kebuOfficialRecordGenerated = await hasKebuOfficialRecord(supabase, businessId);

  const activity = await gatherBusinessActivitySignals(supabase, businessId);

  const readiness = calculateBusinessReadiness({
    legalName: business.legal_name,
    tradingName: business.trading_name,
    countryCode: business.country_code,
    region: business.region,
    category: business.category,
    description: business.description,
    businessEmail: business.business_email,
    businessPhone: business.business_phone,
    website: business.website,
    legalStructure: business.legal_structure,
    founderName: founder?.full_name,
    founderEmail: founder?.email,
    ownershipPercent: founder ? Number(founder.ownership_percent) : null,
    registrationDocumentsComplete,
    hasPublishedWebsite: (publishedSites?.length ?? 0) > 0,
    kebuOfficialRecordGenerated,
    hasGovRegistrationCerts: hasGovRegistrationCerts(uploadedDocTypes),
    hasWestAfricaTradeDocs: hasWestAfricaTradeDocs(uploadedDocTypes),
    hasSiteLogo: activity.hasSiteLogo,
    siteProductCount: activity.siteProductCount,
    createAssetCount: activity.createAssetCount,
  });

  const { data: prev } = await supabase
    .from("business_readiness_scores")
    .select("id, score_value")
    .eq("business_id", businessId)
    .order("calculated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: score, error: sErr } = await supabase
    .from("business_readiness_scores")
    .insert({
      business_id: businessId,
      score_value: readiness.scoreValue,
      score_band: readiness.scoreBand,
      confidence_level: readiness.confidenceLevel,
      model_version: readiness.modelVersion,
      explanation: readiness.explanation,
      missing_items: readiness.missingItems,
      helping_factors: readiness.helpingFactors,
      limiting_factors: readiness.limitingFactors,
      previous_score_id: prev?.id ?? null,
    })
    .select(
      "id, score_value, score_band, confidence_level, model_version, explanation, missing_items, helping_factors, limiting_factors, calculated_at, previous_score_id"
    )
    .single();

  if (sErr || !score) return { ok: false, error: sErr?.message ?? "Score insert failed" };

  // Sync information_complete progress step
  const complete = infoCompleteFromProfile({
    legalName: business.legal_name,
    tradingName: business.trading_name,
    countryCode: business.country_code,
    region: business.region,
    category: business.category,
    description: business.description,
    businessEmail: business.business_email,
    businessPhone: business.business_phone,
    website: business.website,
    legalStructure: business.legal_structure,
    founderName: founder?.full_name,
    founderEmail: founder?.email,
    ownershipPercent: founder ? Number(founder.ownership_percent) : null,
  });

  await supabase
    .from("registration_progress")
    .update({
      is_complete: complete,
      completed_at: complete ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("business_id", businessId)
    .eq("step_key", "business_information_complete");

  return { ok: true, score };
}

export async function loadRegistrationDocumentsComplete(
  supabase: SupabaseClient,
  businessId: string,
): Promise<boolean> {
  const { data: docRows } = await supabase
    .from("business_documents")
    .select("document_type")
    .eq("business_id", businessId);
  const uploadedDocTypes = [...new Set((docRows ?? []).map((d) => d.document_type))];
  return documentsComplete(uploadedDocTypes);
}

function missingTable(message?: string) {
  if (!message) return null;
  if (message.includes("does not exist") || message.includes("42P01")) {
    if (message.includes("logo_url")) {
      return "Business profile column missing. Re-run APPLY_MIGRATIONS_005_007.sql (includes logo_url) or apply migration 025.";
    }
    return "Business registration tables missing. Apply supabase/migrations/APPLY_MIGRATIONS_005_007.sql in Supabase SQL Editor, then retry.";
  }
  return null;
}
