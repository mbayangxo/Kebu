import { NextResponse } from "next/server";
import { requireUser, logCreate } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import { projectShopOpened, withShopOpened } from "@/lib/create/site-shop";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/**
 * Open Shop for this website project — separate from the site itself.
 * Persists seo.commerce.shopOpened. Does not auto-add products to the website.
 */
export async function POST(req: Request, { params }: Params) {
  const limited = builderRateLimit(req);
  if (limited) return limited;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id } = await params;

  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid project id." }, { status: 400 });
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id, owner_id, title, seo")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  if (projectShopOpened(project.seo)) {
    return NextResponse.json({
      ok: true,
      alreadyOpen: true,
      shopOpened: true,
      shopUrl: `/shop/${id}`,
    });
  }

  const nextSeo = withShopOpened(project.seo, String(project.title ?? "My website"));
  const { error } = await supabase
    .from("projects")
    .update({ seo: nextSeo, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error) {
    logCreate("shop.open_failed", { userId: user.id, projectId: id, message: error.message });
    return NextResponse.json({ error: "Could not open shop." }, { status: 500 });
  }

  logCreate("shop.opened", { userId: user.id, projectId: id });
  return NextResponse.json({
    ok: true,
    alreadyOpen: false,
    shopOpened: true,
    shopUrl: `/shop/${id}`,
    shopOpenedAt: nextSeo.commerce?.shopOpenedAt ?? null,
  });
}

export async function GET(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id } = await params;

  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid project id." }, { status: 400 });
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id, seo")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  return NextResponse.json({
    shopOpened: projectShopOpened(project.seo),
    shopUrl: `/shop/${id}`,
  });
}
