import { NextResponse } from "next/server";
import { requireUser, logCreate } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import { assertBusinessManager } from "@/lib/business/assert-manager";
import { pressKitPublicPath } from "@/lib/business/press-kit";
import {
  createArtistCampaignSchema,
  newCampaignPublicId,
  updateArtistCampaignSchema,
} from "@/lib/business/artist-campaigns";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id: businessId } = await params;
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const { data: mem } = await supabase
    .from("business_members")
    .select("role")
    .eq("business_id", businessId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  if (!mem) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("business_artist_campaigns")
    .select(
      "id, public_id, artist_id, press_kit_id, title, objective, brief, status, channels, starts_on, ends_on, created_at, updated_at",
    )
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json(
      {
        error: error.message.includes("does not exist")
          ? "Artist campaigns missing. Apply 057_business_artist_campaigns.sql."
          : "Could not load campaigns.",
      },
      { status: 500 },
    );
  }

  const campaigns = data ?? [];
  const artistIds = [...new Set(campaigns.map((c) => c.artist_id))];
  const kitIds = [
    ...new Set(campaigns.map((c) => c.press_kit_id).filter(Boolean) as string[]),
  ];

  const artistsById: Record<string, { stage_name: string }> = {};
  if (artistIds.length) {
    const { data: artists } = await supabase
      .from("business_artists")
      .select("id, stage_name")
      .in("id", artistIds);
    for (const a of artists ?? []) artistsById[a.id] = { stage_name: a.stage_name };
  }

  const kitsById: Record<string, { title: string; public_id: string; status: string }> = {};
  if (kitIds.length) {
    const { data: kits } = await supabase
      .from("business_press_kits")
      .select("id, title, public_id, status")
      .in("id", kitIds);
    for (const k of kits ?? []) {
      kitsById[k.id] = { title: k.title, public_id: k.public_id, status: k.status };
    }
  }

  return NextResponse.json({
    campaigns: campaigns.map((c) => {
      const kit = c.press_kit_id ? kitsById[c.press_kit_id] : null;
      return {
        ...c,
        artistName: artistsById[c.artist_id]?.stage_name ?? "Artist",
        pressKit: kit
          ? {
              id: c.press_kit_id,
              title: kit.title,
              status: kit.status,
              publicPath:
                kit.status === "published" ? pressKitPublicPath(kit.public_id) : null,
            }
          : null,
      };
    }),
  });
}

export async function POST(req: Request, { params }: Params) {
  const limited = builderRateLimit(req);
  if (limited) return limited;

  const { id: businessId } = await params;
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  if (!(await assertBusinessManager(supabase, businessId, user.id))) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = createArtistCampaignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid campaign." },
      { status: 400 },
    );
  }

  const input = parsed.data;

  const { data: artist } = await supabase
    .from("business_artists")
    .select("id")
    .eq("id", input.artistId)
    .eq("business_id", businessId)
    .maybeSingle();
  if (!artist) {
    return NextResponse.json({ error: "Artist not found on this business." }, { status: 404 });
  }

  if (input.pressKitId) {
    const { data: kit } = await supabase
      .from("business_press_kits")
      .select("id")
      .eq("id", input.pressKitId)
      .eq("business_id", businessId)
      .eq("artist_id", input.artistId)
      .maybeSingle();
    if (!kit) {
      return NextResponse.json(
        { error: "Press kit must belong to this artist on this business." },
        { status: 400 },
      );
    }
  }

  const { data, error } = await supabase
    .from("business_artist_campaigns")
    .insert({
      business_id: businessId,
      artist_id: input.artistId,
      press_kit_id: input.pressKitId ?? null,
      public_id: newCampaignPublicId(),
      title: input.title,
      objective: input.objective ?? "",
      brief: input.brief ?? "",
      status: input.status ?? "draft",
      channels: input.channels ?? [],
      starts_on: input.startsOn ?? null,
      ends_on: input.endsOn ?? null,
      created_by: user.id,
    })
    .select(
      "id, public_id, artist_id, press_kit_id, title, objective, brief, status, channels, starts_on, ends_on, created_at",
    )
    .single();

  if (error || !data) {
    return NextResponse.json(
      {
        error: error?.message?.includes("does not exist")
          ? "Apply 057_business_artist_campaigns.sql."
          : error?.message || "Could not create campaign.",
      },
      { status: 500 },
    );
  }

  logCreate("business.artist_campaign_created", {
    userId: user.id,
    businessId,
    campaignId: data.id,
    artistId: input.artistId,
  });

  return NextResponse.json({ campaign: data });
}

export async function PATCH(req: Request, { params }: Params) {
  const limited = builderRateLimit(req);
  if (limited) return limited;

  const { id: businessId } = await params;
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  if (!(await assertBusinessManager(supabase, businessId, user.id))) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = updateArtistCampaignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid update." },
      { status: 400 },
    );
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (parsed.data.title !== undefined) patch.title = parsed.data.title;
  if (parsed.data.objective !== undefined) patch.objective = parsed.data.objective;
  if (parsed.data.brief !== undefined) patch.brief = parsed.data.brief;
  if (parsed.data.status !== undefined) patch.status = parsed.data.status;
  if (parsed.data.channels !== undefined) patch.channels = parsed.data.channels;
  if (parsed.data.pressKitId !== undefined) patch.press_kit_id = parsed.data.pressKitId;
  if (parsed.data.startsOn !== undefined) patch.starts_on = parsed.data.startsOn;
  if (parsed.data.endsOn !== undefined) patch.ends_on = parsed.data.endsOn;

  if (parsed.data.pressKitId) {
    const { data: existing } = await supabase
      .from("business_artist_campaigns")
      .select("artist_id")
      .eq("id", parsed.data.campaignId)
      .eq("business_id", businessId)
      .maybeSingle();
    if (!existing) {
      return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
    }
    const { data: kit } = await supabase
      .from("business_press_kits")
      .select("id")
      .eq("id", parsed.data.pressKitId)
      .eq("business_id", businessId)
      .eq("artist_id", existing.artist_id)
      .maybeSingle();
    if (!kit) {
      return NextResponse.json(
        { error: "Press kit must belong to this campaign’s artist." },
        { status: 400 },
      );
    }
  }

  const { data, error } = await supabase
    .from("business_artist_campaigns")
    .update(patch)
    .eq("id", parsed.data.campaignId)
    .eq("business_id", businessId)
    .select(
      "id, public_id, artist_id, press_kit_id, title, objective, brief, status, channels, starts_on, ends_on, updated_at",
    )
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || "Could not update campaign." },
      { status: 500 },
    );
  }

  logCreate("business.artist_campaign_updated", {
    userId: user.id,
    businessId,
    campaignId: data.id,
    status: data.status,
  });

  return NextResponse.json({ campaign: data });
}
