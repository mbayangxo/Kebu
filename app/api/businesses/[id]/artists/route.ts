import { NextResponse } from "next/server";
import { requireUser, logCreate } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import { assertBusinessManager } from "@/lib/business/assert-manager";
import {
  artistPublicPath,
  createArtistSchema,
  newPressPublicId,
  pressKitPublicPath,
  slugifyArtistName,
} from "@/lib/business/press-kit";

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
    .from("business_artists")
    .select(
      "id, public_id, stage_name, legal_name, slug, bio_short, hometown, genres, social_links, portrait_url, cover_url, status, created_at, updated_at",
    )
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json(
      {
        error: error.message.includes("does not exist")
          ? "Artists table missing. Apply 056_business_artists_press_kits.sql."
          : "Could not load artists.",
        detail: error.message,
      },
      { status: 500 },
    );
  }

  const artists = data ?? [];
  const artistIds = artists.map((a) => a.id);
  let kitsByArtist: Record<string, { id: string; public_id: string; title: string; status: string }[]> =
    {};

  if (artistIds.length) {
    const { data: kits } = await supabase
      .from("business_press_kits")
      .select("id, artist_id, public_id, title, status")
      .eq("business_id", businessId)
      .in("artist_id", artistIds)
      .order("created_at", { ascending: false });
    for (const k of kits ?? []) {
      const aid = k.artist_id as string;
      if (!kitsByArtist[aid]) kitsByArtist[aid] = [];
      kitsByArtist[aid]!.push({
        id: k.id,
        public_id: k.public_id,
        title: k.title,
        status: k.status,
      });
    }
  }

  return NextResponse.json({
    artists: artists.map((a) => ({
      ...a,
      publicPath: artistPublicPath(a.public_id),
      kits: (kitsByArtist[a.id] ?? []).map((k) => ({
        ...k,
        publicPath: pressKitPublicPath(k.public_id),
      })),
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

  const parsed = createArtistSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid artist." },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const slug = input.slug?.trim() || slugifyArtistName(input.stageName);
  const publicId = newPressPublicId("art");

  const { data, error } = await supabase
    .from("business_artists")
    .insert({
      business_id: businessId,
      public_id: publicId,
      stage_name: input.stageName,
      legal_name: input.legalName ?? "",
      slug,
      bio_short: input.bioShort ?? "",
      hometown: input.hometown ?? "",
      genres: input.genres ?? [],
      social_links: input.socialLinks ?? [],
      portrait_url: input.portraitUrl ?? "",
      cover_url: input.coverUrl ?? "",
      status: input.status ?? "draft",
      created_by: user.id,
    })
    .select(
      "id, public_id, stage_name, legal_name, slug, bio_short, hometown, genres, social_links, portrait_url, cover_url, status, created_at",
    )
    .single();

  if (error || !data) {
    return NextResponse.json(
      {
        error: error?.message?.includes("business_artists_slug_biz_uidx")
          ? "That slug is already used for an artist on this business."
          : error?.message?.includes("does not exist")
            ? "Apply 056_business_artists_press_kits.sql."
            : error?.message || "Could not create artist.",
      },
      { status: 500 },
    );
  }

  logCreate("business.artist_created", {
    userId: user.id,
    businessId,
    artistId: data.id,
  });

  return NextResponse.json({
    artist: {
      ...data,
      publicPath: artistPublicPath(data.public_id),
      kits: [],
    },
  });
}
