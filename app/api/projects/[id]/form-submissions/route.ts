import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** List form submissions for a project (merchant). */
export async function GET(req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: projectId } = await params;

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  const url = new URL(req.url);
  const sectionId = url.searchParams.get("sectionId");
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 50)));

  let query = supabase
    .from("project_form_submissions")
    .select("id, section_id, form_name, payload, submitter_email, submitter_name, submitter_phone, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (sectionId) query = query.eq("section_id", sectionId);

  const { data: submissions, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: error.message?.includes("does not exist") ? "Apply migration 064." : "Could not load submissions." },
      { status: 500 },
    );
  }

  return NextResponse.json({ submissions: submissions ?? [] });
}
