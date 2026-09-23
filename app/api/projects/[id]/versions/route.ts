import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: projectId } = await params;

  if (!projectId || !/^[0-9a-f-]{36}$/i.test(projectId)) {
    return NextResponse.json({ error: "Invalid project id." }, { status: 400 });
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("website_versions")
    .select("id, version_number, label, created_at, created_by")
    .eq("project_id", projectId)
    .order("version_number", { ascending: false })
    .limit(40);

  if (error) {
    return NextResponse.json({ error: "Could not load version history." }, { status: 500 });
  }

  return NextResponse.json({ versions: data ?? [] });
}
