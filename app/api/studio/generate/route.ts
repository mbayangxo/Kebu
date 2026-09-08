import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { aiRateLimit } from "@/lib/api-guard";
import {
  generateStudioCampaignWithAi,
  studioGenerateBriefSchema,
} from "@/lib/studio/ai-generate";

export const dynamic = "force-dynamic";

/** List recent Studio AI generation runs (history). */
export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const { data, error } = await supabase
    .from("studio_generation_runs")
    .select("id, prompt, business_name, used_ai, fallback, design_ids, created_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json(
      {
        error: error.message?.includes("does not exist")
          ? "Studio generation history missing. Apply migration 070."
          : "Could not load generation history.",
        runs: [],
      },
      { status: error.message?.includes("does not exist") ? 503 : 500 },
    );
  }

  return NextResponse.json({ runs: data ?? [] });
}

/**
 * Studio S4: prompt → AI (or honest fallback) → create_designs rows → history run.
 */
export async function POST(req: NextRequest) {
  const limited = aiRateLimit(req);
  if (limited) return limited;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const parsed = studioGenerateBriefSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Describe your campaign in a short sentence (min 8 characters)." }, { status: 400 });
  }

  const generated = await generateStudioCampaignWithAi(parsed.data);
  if (!generated.ok) {
    return NextResponse.json({ error: generated.error }, { status: 400 });
  }

  const rows = generated.designs.map((d) => ({
    owner_id: user.id,
    business_id: null as string | null,
    design_type: d.designType,
    title: d.title,
    canvas: d.canvas,
  }));

  const { data: designs, error: insertError } = await supabase
    .from("create_designs")
    .insert(rows)
    .select("id, title, design_type, canvas, created_at, updated_at");

  if (insertError || !designs?.length) {
    return NextResponse.json(
      { error: insertError?.message ?? "Could not save generated designs." },
      { status: 500 },
    );
  }

  const designIds = designs.map((d) => d.id as string);
  const { data: run, error: runError } = await supabase
    .from("studio_generation_runs")
    .insert({
      owner_id: user.id,
      prompt: parsed.data.prompt,
      business_name: parsed.data.businessName ?? "",
      used_ai: generated.usedAi,
      fallback: Boolean(generated.fallback),
      design_ids: designIds,
      meta: {
        designCount: designIds.length,
        creationMode: parsed.data.creationMode ?? "create_for_me",
        brand: {
          primaryColor: parsed.data.primaryColor ?? null,
          accentColor: parsed.data.accentColor ?? null,
          backgroundColor: parsed.data.backgroundColor ?? null,
        },
      },
    })
    .select("id, prompt, business_name, used_ai, fallback, design_ids, created_at")
    .single();

  if (runError) {
    /* Designs already saved — return them with honest history warning */
    return NextResponse.json({
      designs,
      run: null,
      usedAi: generated.usedAi,
      fallback: Boolean(generated.fallback),
      historyWarning: runError.message?.includes("does not exist")
        ? "Designs saved. Apply migration 070 to keep generation history."
        : "Designs saved but history row failed.",
    });
  }

  return NextResponse.json({
    designs,
    run,
    usedAi: generated.usedAi,
    fallback: Boolean(generated.fallback),
  });
}
