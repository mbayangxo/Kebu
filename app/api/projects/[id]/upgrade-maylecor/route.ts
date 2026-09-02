import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { upgradeMaylecorPortfolioProject } from "@/lib/create/upgrade-portfolio-maylecor";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** Add Music page + nav to owner May Lecor portfolio if missing. */
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

  if (!project.description?.includes("portfolio:maylecor")) {
    return NextResponse.json({ error: "Not a May Lecor portfolio project." }, { status: 403 });
  }

  const result = await upgradeMaylecorPortfolioProject(supabase, projectId);
  return NextResponse.json(result);
}
