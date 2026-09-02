import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** List uploaded site assets for the project media library. */
export async function GET(_req: Request, { params }: Params) {
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

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const { data: assets, error } = await supabase
    .from("website_assets")
    .select("id, url, kind, alt, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(48);

  if (error) {
    return NextResponse.json(
      {
        error: error.message.includes("does not exist")
          ? "Assets table missing. Apply migration 008."
          : "Could not load assets.",
        detail: error.message,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ assets: assets ?? [] });
}
