import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/opportunity/admin";
import { artistPublicPath } from "@/lib/business/press-kit";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ publicId: string }> };

/** Public artist page — active artists only + published media. */
export async function GET(_req: Request, { params }: Params) {
  const { publicId: raw } = await params;
  const publicId = (raw || "").trim().toLowerCase();
  if (!publicId.startsWith("art_")) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const admin = createServiceClient();
  if (!admin) {
    return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
  }

  const { data: artist, error } = await admin
    .from("business_artists")
    .select(
      "id, public_id, stage_name, legal_name, bio_short, hometown, genres, social_links, portrait_url, cover_url, status, business_id",
    )
    .eq("public_id", publicId)
    .maybeSingle();

  if (error || !artist || artist.status !== "active") {
    return NextResponse.json({ error: "Artist not found." }, { status: 404 });
  }

  const { data: business } = await admin
    .from("businesses")
    .select("name, trading_name, public_kebu_id")
    .eq("id", artist.business_id)
    .maybeSingle();

  const { data: media } = await admin
    .from("business_artist_media")
    .select(
      "public_id, kind, platform, title, url, thumbnail_url, caption, sort_order, published_at",
    )
    .eq("artist_id", artist.id)
    .eq("status", "published")
    .order("sort_order", { ascending: true })
    .order("published_at", { ascending: false })
    .limit(40);

  // Media table may not exist yet (058 not applied) — still return artist.
  const mediaList = media ?? [];

  const { data: kit } = await admin
    .from("business_press_kits")
    .select("public_id, title, status")
    .eq("artist_id", artist.id)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({
    artist: {
      publicId: artist.public_id,
      path: artistPublicPath(artist.public_id),
      stageName: artist.stage_name,
      legalName: artist.legal_name,
      bioShort: artist.bio_short,
      hometown: artist.hometown,
      genres: artist.genres,
      socialLinks: artist.social_links,
      portraitUrl: artist.portrait_url,
      coverUrl: artist.cover_url,
      agency: {
        name: business?.trading_name || business?.name || "Agency",
        kebuId: business?.public_kebu_id ?? null,
      },
      pressKitPath: kit?.public_id ? `/k/${kit.public_id}` : null,
      pressKitTitle: kit?.title ?? null,
      media: mediaList.map((m) => ({
        publicId: m.public_id,
        kind: m.kind,
        platform: m.platform,
        title: m.title,
        url: m.url,
        thumbnailUrl: m.thumbnail_url,
        caption: m.caption,
        publishedAt: m.published_at,
      })),
    },
  });
}
