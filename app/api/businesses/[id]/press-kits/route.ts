import { NextResponse } from "next/server";
import { requireUser, logCreate } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import { assertBusinessManager } from "@/lib/business/assert-manager";
import {
  defaultPressKitBody,
  newPressPublicId,
  parsePressKitBody,
  pressKitPublicPath,
  updatePressKitSchema,
  upsertPressKitSchema,
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
    .from("business_press_kits")
    .select(
      "id, public_id, artist_id, title, status, kit, published_at, created_at, updated_at",
    )
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json(
      {
        error: error.message.includes("does not exist")
          ? "Press kits missing. Apply 056_business_artists_press_kits.sql."
          : "Could not load press kits.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    kits: (data ?? []).map((k) => ({
      ...k,
      kit: parsePressKitBody(k.kit),
      publicPath: pressKitPublicPath(k.public_id),
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

  const parsed = upsertPressKitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid press kit." },
      { status: 400 },
    );
  }

  const { data: artist } = await supabase
    .from("business_artists")
    .select("id, stage_name")
    .eq("id", parsed.data.artistId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (!artist) {
    return NextResponse.json({ error: "Artist not found on this business." }, { status: 404 });
  }

  const kit = parsed.data.kit ?? defaultPressKitBody(artist.stage_name);
  const status = parsed.data.status ?? "draft";
  const publicId = newPressPublicId("kit");

  const { data, error } = await supabase
    .from("business_press_kits")
    .insert({
      business_id: businessId,
      artist_id: artist.id,
      public_id: publicId,
      title: parsed.data.title,
      status,
      kit,
      published_at: status === "published" ? new Date().toISOString() : null,
      created_by: user.id,
    })
    .select("id, public_id, artist_id, title, status, kit, published_at, created_at")
    .single();

  if (error || !data) {
    return NextResponse.json(
      {
        error: error?.message?.includes("does not exist")
          ? "Apply 056_business_artists_press_kits.sql."
          : error?.message || "Could not create press kit.",
      },
      { status: 500 },
    );
  }

  logCreate("business.press_kit_created", {
    userId: user.id,
    businessId,
    kitId: data.id,
    artistId: artist.id,
  });

  return NextResponse.json({
    kit: {
      ...data,
      kit: parsePressKitBody(data.kit),
      publicPath: pressKitPublicPath(data.public_id),
    },
  });
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

  const parsed = updatePressKitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid update." },
      { status: 400 },
    );
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (parsed.data.title) patch.title = parsed.data.title;
  if (parsed.data.kit) patch.kit = parsed.data.kit;
  if (parsed.data.status) {
    patch.status = parsed.data.status;
    if (parsed.data.status === "published") {
      patch.published_at = new Date().toISOString();
    }
  }

  const { data, error } = await supabase
    .from("business_press_kits")
    .update(patch)
    .eq("id", parsed.data.kitId)
    .eq("business_id", businessId)
    .select("id, public_id, artist_id, title, status, kit, published_at, updated_at")
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || "Could not update press kit." },
      { status: 500 },
    );
  }

  logCreate("business.press_kit_updated", {
    userId: user.id,
    businessId,
    kitId: data.id,
    status: data.status,
  });

  return NextResponse.json({
    kit: {
      ...data,
      kit: parsePressKitBody(data.kit),
      publicPath: pressKitPublicPath(data.public_id),
    },
  });
}
