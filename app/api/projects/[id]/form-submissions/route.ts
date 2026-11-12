import { z } from "zod";
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

  if (!z.string().uuid().safeParse(projectId).success) return NextResponse.json({ error: "Invalid project." }, { status: 400 });

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, title")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (projectError) return NextResponse.json({ error: "Could not load project." }, { status: 503 });
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  const url = new URL(req.url);
  const sectionId = url.searchParams.get("sectionId");
  const paging = z.object({ limit: z.coerce.number().int().min(1).max(100), offset: z.coerce.number().int().min(0).max(100000) }).safeParse({ limit: url.searchParams.get("limit") ?? 50, offset: url.searchParams.get("offset") ?? 0 });
  if (!paging.success || (sectionId && !z.string().uuid().safeParse(sectionId).success)) return NextResponse.json({ error: "Invalid message filters." }, { status: 400 });
  const { limit, offset } = paging.data;

  let query = supabase
    .from("project_form_submissions")
    .select("id, section_id, form_name, payload, submitter_email, submitter_name, submitter_phone, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(offset, offset + limit);

  if (sectionId) query = query.eq("section_id", sectionId);

  const { data: submissions, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: error.message?.includes("does not exist") ? "Contact inbox storage is not available. Contact support." : "Could not load submissions." },
      { status: 500 },
    );
  }

  const rows = submissions ?? [];
  return NextResponse.json({ projectTitle: project.title, submissions: rows.slice(0, limit), nextOffset: rows.length > limit ? offset + limit : null }, { headers: { "Cache-Control": "private, no-store" } });
}
