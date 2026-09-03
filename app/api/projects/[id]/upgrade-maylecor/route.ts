import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { projectUsesMaylecorRussianLayout } from "@/lib/create/maylecor-russian-hero";
import { upgradeMaylecorPortfolioProject } from "@/lib/create/upgrade-portfolio-maylecor";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** Repair May Lecor home → Russian cutouts + motion pages (fixes black builder). */
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

  if (!projectUsesMaylecorRussianLayout(project.description, sectionTypes)) {
    return NextResponse.json({ error: "Not a May Lecor Russian layout project." }, { status: 403 });
  }

  const result = await upgradeMaylecorPortfolioProject(supabase, projectId);
  return NextResponse.json(result);
}
