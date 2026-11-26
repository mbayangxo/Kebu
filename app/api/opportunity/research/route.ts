import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";

export const dynamic = "force-dynamic";

const createProjectSchema = z.object({
  title: z.string().trim().min(1).max(160),
  question: z.string().max(2000).default(""),
});

const patchProjectSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(160).optional(),
  question: z.string().max(2000).optional(),
  notes: z.string().max(30000).optional(),
});

const addSourceSchema = z.object({
  action: z.literal("source"),
  projectId: z.string().uuid(),
  label: z.string().trim().min(1).max(240),
  sourceUrl: z.string().url().max(2000),
  sourceName: z.string().max(240).default(""),
  trustLabel: z.string().max(80).default("user_saved"),
  note: z.string().max(5000).default(""),
  opportunityId: z.string().max(160).nullable().optional(),
});

export async function GET(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const projectId = new URL(req.url).searchParams.get("projectId");

  if (projectId) {
    const { data: project, error } = await supabase
      .from("opportunity_research_projects")
      .select("*")
      .eq("id", projectId)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (error || !project) return NextResponse.json({ error: "Research project not found." }, { status: 404 });

    const { data: sources } = await supabase
      .from("opportunity_research_sources")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    return NextResponse.json({ project, sources: sources ?? [] });
  }

  const { data, error } = await supabase
    .from("opportunity_research_projects")
    .select("id, title, question, notes, created_at, updated_at")
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message.includes("opportunity_research_projects") ? "Apply Opportunity Research Lab migration." : "Could not load research." }, { status: 500 });
  return NextResponse.json({ projects: data ?? [] });
}

export async function POST(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }

  const sourceParsed = addSourceSchema.safeParse(body);
  if (sourceParsed.success) {
    const { data, error } = await supabase
      .from("opportunity_research_sources")
      .insert({
        project_id: sourceParsed.data.projectId,
        added_by: user.id,
        label: sourceParsed.data.label,
        source_url: sourceParsed.data.sourceUrl,
        source_name: sourceParsed.data.sourceName,
        trust_label: sourceParsed.data.trustLabel,
        note: sourceParsed.data.note,
        opportunity_id: sourceParsed.data.opportunityId ?? null,
      })
      .select("*")
      .single();
    return error ? NextResponse.json({ error: "Could not save source." }, { status: 500 }) : NextResponse.json({ source: data }, { status: 201 });
  }

  const parsed = createProjectSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid research project." }, { status: 400 });
  const { data, error } = await supabase
    .from("opportunity_research_projects")
    .insert({ owner_id: user.id, title: parsed.data.title, question: parsed.data.question })
    .select("*")
    .single();
  return error ? NextResponse.json({ error: "Could not create research project." }, { status: 500 }) : NextResponse.json({ project: data }, { status: 201 });
}

export async function PATCH(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  const parsed = patchProjectSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid update." }, { status: 400 });
  const patch = { ...parsed.data, id: undefined, updated_at: new Date().toISOString() } as Record<string, unknown>;
  delete patch.id;
  const mapped: Record<string, unknown> = { updated_at: patch.updated_at };
  if (parsed.data.title !== undefined) mapped.title = parsed.data.title;
  if (parsed.data.question !== undefined) mapped.question = parsed.data.question;
  if (parsed.data.notes !== undefined) mapped.notes = parsed.data.notes;
  const { data, error } = await supabase
    .from("opportunity_research_projects")
    .update(mapped)
    .eq("id", parsed.data.id)
    .eq("owner_id", user.id)
    .select("*")
    .single();
  return error ? NextResponse.json({ error: "Could not save research." }, { status: 500 }) : NextResponse.json({ project: data });
}
