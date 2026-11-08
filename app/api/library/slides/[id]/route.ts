import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import { assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";
import { blankSlide, deckPatchSchema, newSlideId } from "@/lib/slides/schema";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/**
 * Real read, gated by Postgres RLS (user-scoped client) -- same trust
 * boundary library_nodes and sheet_bodies already use. A node that exists
 * but isn't shared with the caller, and one that doesn't exist at all, are
 * indistinguishable by design.
 */
export async function GET(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase } = auth;
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Invalid deck id." }, { status: 400 });
  }

  const { data: node, error: nodeError } = await supabase
    .from("library_nodes")
    .select("id, title, kind")
    .eq("id", id)
    .eq("kind", "slide")
    .maybeSingle();
  if (nodeError || !node) {
    return NextResponse.json({ error: "Deck not found." }, { status: 404 });
  }

  const { data: body } = await supabase
    .from("slide_bodies")
    .select("slides, width, height, updated_at")
    .eq("id", id)
    .maybeSingle();

  const slides = Array.isArray(body?.slides) && body.slides.length ? body.slides : [blankSlide(newSlideId())];
  return NextResponse.json({
    id: node.id,
    title: node.title,
    width: body?.width ?? 1920,
    height: body?.height ?? 1080,
    slides,
    updatedAt: body?.updated_at ?? null,
  });
}

/**
 * Real write, upserting the body row -- a brand-new deck has a library_nodes
 * row but no slide_bodies row yet (first save creates it). RLS enforces
 * owner-or-editor for both insert and update; a viewer-only share's write is
 * rejected by Postgres itself.
 */
export async function PATCH(req: Request, { params }: Params) {
  const limited = builderRateLimit(req);
  if (limited) return limited;
  const originBlocked = assertSameOriginMutation(req);
  if (originBlocked) return originBlocked;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase } = auth;
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Invalid deck id." }, { status: 400 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = deckPatchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid deck update.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const { data: node, error: nodeError } = await supabase
    .from("library_nodes")
    .select("id")
    .eq("id", id)
    .eq("kind", "slide")
    .maybeSingle();
  if (nodeError || !node) {
    return NextResponse.json({ error: "Deck not found." }, { status: 404 });
  }

  const patch: Record<string, unknown> = { id, slides: parsed.data.slides };
  if (parsed.data.width !== undefined) patch.width = parsed.data.width;
  if (parsed.data.height !== undefined) patch.height = parsed.data.height;

  const { data: saved, error } = await supabase
    .from("slide_bodies")
    .upsert(patch, { onConflict: "id" })
    .select("updated_at")
    .single();

  if (error || !saved) {
    return NextResponse.json({ error: "Could not save deck." }, { status: 403 });
  }

  return NextResponse.json({ ok: true, updatedAt: saved.updated_at });
}
