import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { projectUsesKdirectionLayout } from "@/lib/create/kdirection-local-assets";
import { upgradeKdirectionPortfolioProject } from "@/lib/create/upgrade-portfolio-kdirection";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** Repair K-Direction → Wix canvas + local collage (fixes black builder from Wix CDN 403). */
export async function POST(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: projectId } = await params;

  const { data: project } = await supabase
    .from("projects")
    .select("id, owner_id, description")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const { data: pages } = await supabase.from("project_pages").select("id").eq("project_id", projectId);
  const pageIds = (pages ?? []).map((p) => p.id);
  let sectionTypes: string[] = [];
  if (pageIds.length) {
    const { data: sections } = await supabase
      .from("project_sections")
      .select("section_type")
      .in("page_id", pageIds);
    sectionTypes = (sections ?? []).map((s) => s.section_type);
  }

  if (!projectUsesKdirectionLayout(project.description, sectionTypes)) {
    return NextResponse.json({ error: "Not a K-Direction layout project." }, { status: 403 });
  }

  const result = await upgradeKdirectionPortfolioProject(supabase, projectId);
  return NextResponse.json(result);
}
