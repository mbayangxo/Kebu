import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** List all digital download records for a merchant's project. */
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

  const { data, error } = await supabase
    .from("shop_digital_downloads")
    .select(
      "id, order_id, product_id, file_name, expires_at, download_count, max_downloads, created_at",
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json(
      {
        error: error.message?.includes("does not exist")
          ? "Apply migration 098_digital_product_downloads.sql."
          : "Could not load downloads.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ downloads: data ?? [] });
}
