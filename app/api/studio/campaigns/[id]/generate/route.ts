import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import {
  BRAND_DNA_SELECT,
  rowToBrandDna,
} from "@/lib/studio/brand-dna";
import {
  CAMPAIGN_SELECT,
  generateCampaignDesignPack,
  rowToCampaign,
} from "@/lib/studio/campaign-project";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/**
 * Creative Director: generate connected design pack from campaign brief + Brand DNA.
 * Persists designs and links them on the campaign project.
 */
export async function POST(_req: Request, { params }: Params) {
  const limited = builderRateLimit(_req);
  if (limited) return limited;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id } = await params;

  const { data: row, error } = await supabase
    .from("studio_campaign_projects")
    .select(CAMPAIGN_SELECT)
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (error || !row) {
    return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
  }

  const campaign = rowToCampaign(row as Record<string, unknown>);

  let dna = null;
  if (campaign.brand_kit_id) {
    const { data: kit } = await supabase
      .from("business_brand_kits")
      .select(BRAND_DNA_SELECT)
      .eq("id", campaign.brand_kit_id)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (kit) dna = rowToBrandDna(kit as Record<string, unknown>);
  } else if (campaign.business_id) {
    const { data: kit } = await supabase
      .from("business_brand_kits")
      .select(BRAND_DNA_SELECT)
      .eq("owner_id", user.id)
      .eq("business_id", campaign.business_id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (kit) dna = rowToBrandDna(kit as Record<string, unknown>);
  }

  const pack = await generateCampaignDesignPack({ campaign, dna });
  const createdIds: string[] = [];
  const designsOut: { id: string; title: string; design_type: string }[] = [];

  for (const d of pack.designs) {
    const { data: design, error: insErr } = await supabase
      .from("create_designs")
      .insert({
        owner_id: user.id,
        business_id: campaign.business_id,
        title: d.title.slice(0, 120),
        design_type: d.designType,
        canvas: d.canvas,
      })
      .select("id, title, design_type")
      .single();
    if (insErr || !design) continue;
    createdIds.push(design.id);
    designsOut.push(design);
  }

  if (!createdIds.length) {
    return NextResponse.json({ error: "Could not create designs for this campaign." }, { status: 500 });
  }

  const designIds = [...new Set([...campaign.design_ids, ...createdIds])].slice(0, 40);
  const { data: updated, error: upErr } = await supabase
    .from("studio_campaign_projects")
    .update({
      design_ids: designIds,
      brand_kit_id: campaign.brand_kit_id ?? dna?.id ?? null,
      status: campaign.status === "draft" ? "active" : campaign.status,
      meta: {
        ...campaign.meta,
        lastGeneratedAt: new Date().toISOString(),
        usedAi: pack.usedAi,
        fallback: pack.fallback,
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("owner_id", user.id)
    .select(CAMPAIGN_SELECT)
    .single();

  if (upErr || !updated) {
    return NextResponse.json(
      { error: "Designs created but campaign link failed.", designs: designsOut },
      { status: 500 },
    );
  }

  return NextResponse.json({
    campaign: rowToCampaign(updated as Record<string, unknown>),
    designs: designsOut,
    usedAi: pack.usedAi,
    fallback: pack.fallback,
    message: pack.usedAi
      ? "Creative Director pack ready — designs share one visual system."
      : "Pack created from templates + Brand DNA (AI fallback).",
  });
}
