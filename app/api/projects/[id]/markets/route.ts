import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** Merchant: get market configuration (stored in seo.markets). */
export async function GET(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: projectId } = await params;

  const { data: project, error } = await supabase
    .from("projects")
    .select("id, seo")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (error || !project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const seo = (project.seo && typeof project.seo === "object" ? project.seo : {}) as Record<string, unknown>;
  const markets = seo.markets && typeof seo.markets === "object" ? seo.markets : {};

  return NextResponse.json({ settings: { markets } });
}

/** Merchant: save market configuration (stores in seo.markets). */
export async function PATCH(req: Request, { params }: Params) {
  const limited = builderRateLimit(req);
  if (limited) return limited;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: projectId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const markets = (body && typeof body === "object" && "markets" in body)
    ? (body as { markets: unknown }).markets
    : null;

  if (!markets || typeof markets !== "object") {
    return NextResponse.json({ error: "markets object required." }, { status: 400 });
  }

  const { data: project, error } = await supabase
    .from("projects")
    .select("id, seo")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (error || !project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const currentSeo = (project.seo && typeof project.seo === "object" ? project.seo : {}) as Record<string, unknown>;
  const nextSeo = { ...currentSeo, markets };

  const { error: updateError } = await supabase
    .from("projects")
    .update({ seo: nextSeo, updated_at: new Date().toISOString() })
    .eq("id", projectId)
    .eq("owner_id", user.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
