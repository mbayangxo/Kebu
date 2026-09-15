import { NextResponse } from "next/server";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string; flowId: string; stepId: string }> };

const patchSchema = z.object({
  sort_order: z.number().int().min(0).optional(),
  delay_hours: z.number().int().min(0).max(8760).optional(),
  subject: z.string().trim().max(200).optional(),
  body_html: z.string().trim().max(50000).optional(),
  body_text: z.string().trim().max(20000).optional(),
});

async function resolveStep(supabase: SupabaseClient, userId: string, projectId: string, flowId: string, stepId: string) {
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

  if (!flow) return null;

  const { data: step } = await supabase
    .from("email_flow_steps")
    .select("id, flow_id, sort_order, delay_hours, subject, body_html, body_text")
    .eq("id", stepId)
    .eq("flow_id", flowId)
    .maybeSingle();

  return step ?? null;
}

/** Update a step. */
export async function PATCH(req: Request, { params }: Params) {
  const limited = builderRateLimit(req);
  if (limited) return limited;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: projectId, flowId, stepId } = await params;

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const step = await resolveStep(supabase, user.id, projectId, flowId, stepId);
  if (!step) return NextResponse.json({ error: "Step not found." }, { status: 404 });

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (parsed.data.sort_order !== undefined) updates.sort_order = parsed.data.sort_order;
  if (parsed.data.delay_hours !== undefined) updates.delay_hours = parsed.data.delay_hours;
  if (parsed.data.subject !== undefined) updates.subject = parsed.data.subject;
  if (parsed.data.body_html !== undefined) updates.body_html = parsed.data.body_html;
  if (parsed.data.body_text !== undefined) updates.body_text = parsed.data.body_text;

  const { data, error } = await supabase
    .from("email_flow_steps")
    .update(updates)
    .eq("id", stepId)
    .select("id, flow_id, sort_order, delay_hours, subject, body_html, body_text, updated_at")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Could not update step.", detail: error?.message }, { status: 500 });
  }

  return NextResponse.json({ step: data });
}

/** Delete a step. */
export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: projectId, flowId, stepId } = await params;

  const step = await resolveStep(supabase, user.id, projectId, flowId, stepId);
  if (!step) return NextResponse.json({ error: "Step not found." }, { status: 404 });

  const { error } = await supabase.from("email_flow_steps").delete().eq("id", stepId);
  if (error) {
    return NextResponse.json({ error: "Could not delete step.", detail: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
