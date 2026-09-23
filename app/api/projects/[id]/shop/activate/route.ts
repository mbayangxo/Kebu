import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import { assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";
import { defaultSectionProps } from "@/lib/create/section-defaults";
import { mergeSiteCommerce } from "@/lib/create/site-commerce";
import { siteSeoSchema } from "@/lib/create/site-seo";
import { syncProjectChromeNavFromPages } from "@/lib/create/site-chrome";

export const dynamic = "force-dynamic";
type Params = { params: Promise<{ id: string }> };

/**
 * Idempotently activates commerce for a site and guarantees a real Shop page backed by the
 * products section. Repeated calls never create duplicate pages/sections.
 */
export async function POST(req: Request, { params }: Params) {
  const limited = builderRateLimit(req);
  if (limited) return limited;
  const originBlocked = assertSameOriginMutation(req);
  if (originBlocked) return originBlocked;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: projectId } = await params;

  if (!projectId || !/^[0-9a-f-]{36}$/i.test(projectId)) {
    return NextResponse.json({ error: "Invalid project id." }, { status: 400 });
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id, owner_id, seo")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  const currentSeo =
    project.seo && typeof project.seo === "object" ? (project.seo as Record<string, unknown>) : {};
  const currentCommerce = mergeSiteCommerce(currentSeo.commerce);
  const commerce = mergeSiteCommerce({
    ...currentCommerce,
    shopOpened: true,
    shopOpenedAt: currentCommerce.shopOpenedAt || new Date().toISOString(),
  });

  const { data: pageRows, error: pagesError } = await supabase
    .from("project_pages")
    .select("id, slug, title, sort_order")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true });
  if (pagesError) {
    return NextResponse.json({ error: "Could not inspect site pages.", detail: pagesError.message }, { status: 500 });
  }

  let shopPage = pageRows?.find((page) => page.slug === "shop") ?? null;
  let createdPage = false;
  if (!shopPage) {
    if ((pageRows?.length ?? 0) >= 12) {
      return NextResponse.json(
        { error: "Your site already has the maximum number of pages. Remove a page before activating Shop." },
        { status: 400 },
      );
    }
    const nextOrder = pageRows?.length ? Math.max(...pageRows.map((page) => page.sort_order ?? 0)) + 1 : 0;
    const { data: inserted, error } = await supabase
      .from("project_pages")
      .insert({ project_id: projectId, slug: "shop", title: "Shop", sort_order: nextOrder })
      .select("id, slug, title, sort_order")
      .single();
    if (error || !inserted) {
      return NextResponse.json({ error: "Could not create the Shop page.", detail: error?.message }, { status: 500 });
    }
    shopPage = inserted;
    createdPage = true;
  }

  const { data: productSections, error: sectionReadError } = await supabase
    .from("project_sections")
    .select("id")
    .eq("page_id", shopPage.id)
    .eq("section_type", "products")
    .limit(1);
  if (sectionReadError) {
    if (createdPage) await supabase.from("project_pages").delete().eq("id", shopPage.id);
    return NextResponse.json({ error: "Could not inspect the Shop page.", detail: sectionReadError.message }, { status: 500 });
  }

  if (!productSections?.length) {
    const { data: siblings } = await supabase
      .from("project_sections")
      .select("sort_order")
      .eq("page_id", shopPage.id)
      .order("sort_order", { ascending: true });
    const nextOrder = siblings?.length ? Math.max(...siblings.map((row) => row.sort_order ?? 0)) + 1 : 0;
    const { error } = await supabase.from("project_sections").insert({
      page_id: shopPage.id,
      section_type: "products",
      sort_order: nextOrder,
      props: defaultSectionProps("products"),
    });
    if (error) {
      if (createdPage) await supabase.from("project_pages").delete().eq("id", shopPage.id);
      return NextResponse.json({ error: "Could not create the Shop gallery.", detail: error.message }, { status: 500 });
    }
  }

  const seo = siteSeoSchema.parse({ ...currentSeo, commerce });
  const { error: updateError } = await supabase
    .from("projects")
    .update({ seo, updated_at: new Date().toISOString() })
    .eq("id", projectId)
    .eq("owner_id", user.id);
  if (updateError) {
    if (createdPage) await supabase.from("project_pages").delete().eq("id", shopPage.id);
    return NextResponse.json({ error: "Could not activate Shop.", detail: updateError.message }, { status: 500 });
  }

  try {
    await syncProjectChromeNavFromPages(supabase as never, projectId);
  } catch {
    // Activation is still valid; navigation sync can be retried by normal page editing.
  }

  return NextResponse.json({
    activated: true,
    commerce,
    shopPage: { id: shopPage.id, slug: shopPage.slug, title: shopPage.title },
  });
}
