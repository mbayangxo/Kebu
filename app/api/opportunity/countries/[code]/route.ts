import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { countryCodeParamSchema, SAFE_COUNTRY_FIELDS } from "@/lib/opportunity/country-schema";
import { OPPORTUNITY_TRUST_LABELS } from "@/lib/opportunity/trust-labels";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ code: string }> };

/** Public country profile + separate AI analyses. */
export async function GET(_req: Request, { params }: Params) {
  const { code: raw } = await params;
  const parsed = countryCodeParamSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid country code." }, { status: 400 });
  }
  const code = parsed.data;

  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from("country_profiles")
    .select(SAFE_COUNTRY_FIELDS)
    .eq("country_code", code)
    .eq("publish_status", "published")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      {
        error: error.message.includes("does not exist")
          ? "Apply migrations 001 and 009."
          : "Could not load country.",
        detail: error.message,
      },
      { status: 500 }
    );
  }

  if (!profile) {
    return NextResponse.json({ error: "Country not found." }, { status: 404 });
  }

  const { data: analyses } = await supabase
    .from("country_ai_analyses")
    .select("id, country_code, label, prompt_summary, analysis_markdown, model_version, confidence, created_at")
    .eq("country_code", code)
    .order("created_at", { ascending: false })
    .limit(5);

  return NextResponse.json({
    verified: profile,
    aiAnalyses: analyses ?? [],
    labels: {
      verified: OPPORTUNITY_TRUST_LABELS.curated,
      verifiedDetail: OPPORTUNITY_TRUST_LABELS.curatedDetail,
      ai_generated: OPPORTUNITY_TRUST_LABELS.ai_generated,
      estimated: OPPORTUNITY_TRUST_LABELS.estimated,
      requires_validation: OPPORTUNITY_TRUST_LABELS.requires_validation,
    },
  });
}
