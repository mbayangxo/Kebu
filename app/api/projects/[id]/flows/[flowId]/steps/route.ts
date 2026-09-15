import { NextResponse } from "next/server";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string; flowId: string }> };

const stepSchema = z.object({
  sort_order: z.number().int().min(0).optional(),
  delay_hours: z.number().int().min(0).max(8760),
  subject: z.string().trim().max(200),
  body_html: z.string().trim().max(50000).default(""),
  body_text: z.string().trim().max(20000).default(""),
});

async function resolveFlowOwned(supabase: SupabaseClient, userId: string, projectId: string, flowId: string) {
  const { data: project } = await supabase
    .from("projects")
    .select("id, business_id")
    .eq("id", projectId)
    .eq("owner_id", userId)
    .maybeSingle();

  if (!project?.business_id) return null;

  const { data: flow } = await supabase
    .from("email_flows")
    .select("id")
    .eq("id", flowId)
    .eq("business_id", project.business_id)
    .maybeSingle();

  return flow ?? null;
}

/** List steps for a flow. */
export async function GET(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: projectId, flowId } = await params;

  const flow = await resolveFlowOwned(supabase, user.id, projectId, flowId);
  if (!flow) return NextResponse.json({ error: "Flow not found." }, { status: 404 });

  const { data, error } = await supabase
    .from("email_flow_steps")
    .select("id, flow_id, sort_order, delay_hours, subject, body_html, body_text, created_at, updated_at")
    .eq("flow_id", flowId)
    .order("sort_order", { ascending: true });

  if (error) return NextResponse.json({ error: "Could not load steps." }, { status: 500 });

  return NextResponse.json({ steps: data ?? [] });
}

/** Add a step to a flow. */
export async function POST(req: Request, { params }: Params) {
  const limited = builderRateLimit(req);
  if (limited) return limited;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: projectId, flowId } = await params;

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = stepSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid step.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const flow = await resolveFlowOwned(supabase, user.id, projectId, flowId);
  if (!flow) return NextResponse.json({ error: "Flow not found." }, { status: 404 });

  // Auto-assign sort_order if not provided (append to end)
  let sortOrder = parsed.data.sort_order;
  if (sortOrder === undefined) {
    const { count } = await supabase
      .from("email_flow_steps")
      .select("id", { count: "exact", head: true })
      .eq("flow_id", flowId);
    sortOrder = count ?? 0;
  }

  const { data, error } = await supabase
    .from("email_flow_steps")
    .insert({
      flow_id: flowId,
      sort_order: sortOrder,
      delay_hours: parsed.data.delay_hours,
      subject: parsed.data.subject,
      body_html: parsed.data.body_html,
      body_text: parsed.data.body_text,
    })
    .select("id, flow_id, sort_order, delay_hours, subject, body_html, body_text, created_at, updated_at")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Could not create step.", detail: error?.message }, { status: 500 });
  }

  return NextResponse.json({ step: data }, { status: 201 });
}
