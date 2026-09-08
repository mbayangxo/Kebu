import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/opportunity/admin";
import { parsePressKitBody } from "@/lib/business/press-kit";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ publicId: string }> };

/** Public electronic press kit — only published kits. */
export async function GET(_req: Request, { params }: Params) {
  const { publicId: raw } = await params;
  const publicId = (raw || "").trim().toLowerCase();
  if (!publicId.startsWith("kit_")) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const admin = createServiceClient();
  if (!admin) {
    return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
  }

  const { data: kit, error } = await admin
    .from("business_press_kits")
    .select(
      "id, public_id, title, status, kit, published_at, artist_id, business_id",
    )
    .eq("public_id", publicId)
    .maybeSingle();

  if (error || !kit || kit.status !== "published") {
    return NextResponse.json({ error: "Press kit not found." }, { status: 404 });
  }

  const { data: artist } = await admin
    .from("business_artists")
    .select(
      "stage_name, legal_name, bio_short, hometown, genres, social_links, portrait_url, cover_url, public_id, status",
    )
    .eq("id", kit.artist_id)
    .maybeSingle();

  if (!artist || artist.status === "archived") {
    return NextResponse.json({ error: "Artist not available." }, { status: 404 });
  }

  const { data: business } = await admin
    .from("businesses")
    .select("name, trading_name, public_kebu_id")
    .eq("id", kit.business_id)
    .maybeSingle();

  const body = parsePressKitBody(kit.kit);

  let mediaRows: {
    public_id: string;
    kind: string;
    platform: string;
    title: string;
    url: string;
    thumbnail_url: string;
    caption: string;
  }[] = [];
  const mediaRes = await admin
    .from("business_artist_media")
    .select("public_id, kind, platform, title, url, thumbnail_url, caption")
    .eq("artist_id", kit.artist_id)
    .eq("status", "published")
    .order("sort_order", { ascending: true })
    .limit(12);
  if (!mediaRes.error) {
    mediaRows = mediaRes.data ?? [];
  }

  return NextResponse.json({
    kit: {
      publicId: kit.public_id,
      title: kit.title,
      publishedAt: kit.published_at,
      ...body,
      artist: {
        stageName: artist.stage_name,
        legalName: artist.legal_name,
        bioShort: artist.bio_short,
        hometown: artist.hometown,
        genres: artist.genres,
        socialLinks: artist.social_links,
        portraitUrl: artist.portrait_url,
        coverUrl: artist.cover_url,
        publicId: artist.public_id,
        publicPath: artist.status === "active" ? `/a/${artist.public_id}` : null,
      },
      media: mediaRows.map((m) => ({
        publicId: m.public_id,
        kind: m.kind,
        platform: m.platform,
        title: m.title,
        url: m.url,
        thumbnailUrl: m.thumbnail_url,
        caption: m.caption,
      })),
      agency: {
        name: business?.trading_name || business?.name || "Agency",
        kebuId: business?.public_kebu_id ?? null,
      },
    },
  });
}
