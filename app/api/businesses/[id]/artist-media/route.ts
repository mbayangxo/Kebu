import { NextResponse } from "next/server";
import { requireUser, logCreate } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import { assertBusinessManager } from "@/lib/business/assert-manager";
import {
  createArtistMediaSchema,
  inferPlatformFromUrl,
  newMediaPublicId,
  updateArtistMediaSchema,
} from "@/lib/business/artist-media";

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
    .from("business_artist_media")
    .select(
      "id, public_id, artist_id, campaign_id, kind, platform, title, url, thumbnail_url, caption, status, sort_order, published_at, created_at, updated_at",
    )
    .eq("business_id", businessId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json(
      {
        error: error.message.includes("does not exist")
          ? "Artist media missing. Apply 058_business_artist_media.sql."
          : "Could not load media.",
      },
      { status: 500 },
    );
  }

  const rows = data ?? [];
  const artistIds = [...new Set(rows.map((r) => r.artist_id))];
  const artistsById: Record<string, string> = {};
  if (artistIds.length) {
    const { data: artists } = await supabase
      .from("business_artists")
      .select("id, stage_name")
      .in("id", artistIds);
    for (const a of artists ?? []) artistsById[a.id] = a.stage_name;
  }

  return NextResponse.json({
    media: rows.map((r) => ({
      ...r,
      artistName: artistsById[r.artist_id] ?? "Artist",
    })),
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

  const parsed = createArtistMediaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid media." },
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

  if (input.campaignId) {
    const { data: camp } = await supabase
      .from("business_artist_campaigns")
      .select("id")
      .eq("id", input.campaignId)
      .eq("business_id", businessId)
      .eq("artist_id", input.artistId)
      .maybeSingle();
    if (!camp) {
      return NextResponse.json(
        { error: "Campaign must belong to this artist on this business." },
        { status: 400 },
      );
    }
  }

  const status = input.status ?? "draft";
  const platform = input.platform ?? inferPlatformFromUrl(input.url);

  const { data, error } = await supabase
    .from("business_artist_media")
    .insert({
      business_id: businessId,
      artist_id: input.artistId,
      campaign_id: input.campaignId ?? null,
      public_id: newMediaPublicId(),
      kind: input.kind ?? "reel",
      platform,
      title: input.title,
      url: input.url,
      thumbnail_url: input.thumbnailUrl ?? "",
      caption: input.caption ?? "",
      status,
      sort_order: input.sortOrder ?? 0,
      published_at: status === "published" ? new Date().toISOString() : null,
      created_by: user.id,
    })
    .select(
      "id, public_id, artist_id, campaign_id, kind, platform, title, url, thumbnail_url, caption, status, sort_order, published_at, created_at",
    )
    .single();

  if (error || !data) {
    return NextResponse.json(
      {
        error: error?.message?.includes("does not exist")
          ? "Apply 058_business_artist_media.sql."
          : error?.message || "Could not create media.",
      },
      { status: 500 },
    );
  }

  logCreate("business.artist_media_created", {
    userId: user.id,
    businessId,
    mediaId: data.id,
    artistId: input.artistId,
    kind: data.kind,
  });

  return NextResponse.json({ media: data });
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

  const parsed = updateArtistMediaSchema.safeParse(body);
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
  if (parsed.data.url !== undefined) {
    patch.url = parsed.data.url;
    if (parsed.data.platform === undefined) {
      patch.platform = inferPlatformFromUrl(parsed.data.url);
    }
  }
  if (parsed.data.platform !== undefined) patch.platform = parsed.data.platform;
  if (parsed.data.kind !== undefined) patch.kind = parsed.data.kind;
  if (parsed.data.thumbnailUrl !== undefined) patch.thumbnail_url = parsed.data.thumbnailUrl;
  if (parsed.data.caption !== undefined) patch.caption = parsed.data.caption;
  if (parsed.data.sortOrder !== undefined) patch.sort_order = parsed.data.sortOrder;
  if (parsed.data.campaignId !== undefined) patch.campaign_id = parsed.data.campaignId;
  if (parsed.data.status !== undefined) {
    patch.status = parsed.data.status;
    if (parsed.data.status === "published") {
      patch.published_at = new Date().toISOString();
    }
  }

  if (parsed.data.campaignId) {
    const { data: existing } = await supabase
      .from("business_artist_media")
      .select("artist_id")
      .eq("id", parsed.data.mediaId)
      .eq("business_id", businessId)
      .maybeSingle();
    if (!existing) {
      return NextResponse.json({ error: "Media not found." }, { status: 404 });
    }
    const { data: camp } = await supabase
      .from("business_artist_campaigns")
      .select("id")
      .eq("id", parsed.data.campaignId)
      .eq("business_id", businessId)
      .eq("artist_id", existing.artist_id)
      .maybeSingle();
    if (!camp) {
      return NextResponse.json(
        { error: "Campaign must belong to this media’s artist." },
        { status: 400 },
      );
    }
  }

  const { data, error } = await supabase
    .from("business_artist_media")
    .update(patch)
    .eq("id", parsed.data.mediaId)
    .eq("business_id", businessId)
    .select(
      "id, public_id, artist_id, campaign_id, kind, platform, title, url, thumbnail_url, caption, status, sort_order, published_at, updated_at",
    )
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || "Could not update media." },
      { status: 500 },
    );
  }

  logCreate("business.artist_media_updated", {
    userId: user.id,
    businessId,
    mediaId: data.id,
    status: data.status,
  });

  return NextResponse.json({ media: data });
}
