import { NextResponse } from "next/server";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string; flowId: string }> };

const patchSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  status: z.enum(["draft", "active", "paused"]).optional(),
  from_email: z.string().trim().email().max(254).optional(),
  from_name: z.string().trim().max(120).optional(),
  reply_to: z.string().trim().email().max(254).optional().nullable(),
});

async function resolveFlow(supabase: SupabaseClient, userId: string, projectId: string, flowId: string) {
  const { data: project } = await supabase
    .from("projects")
    .select("id, business_id")
    .eq("id", projectId)
    .eq("owner_id", userId)
    .maybeSingle();

  if (!project?.business_id) return null;

  const { data: flow } = await supabase
    .from("email_flows")
    .select("id, business_id, name, trigger_type, status, from_email, from_name, reply_to")
    .eq("id", flowId)
    .eq("business_id", project.business_id)
    .maybeSingle();

  return flow ?? null;
}

/** Get a single flow with its steps. */
export async function GET(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: projectId, flowId } = await params;

  const flow = await resolveFlow(supabase, user.id, projectId, flowId);
  if (!flow) return NextResponse.json({ error: "Flow not found." }, { status: 404 });

  const { data: steps } = await supabase
    .from("email_flow_steps")
    .select("id, flow_id, sort_order, delay_hours, subject, body_html, body_text, created_at, updated_at")
    .eq("flow_id", flowId)
    .order("sort_order", { ascending: true });

  return NextResponse.json({ flow, steps: steps ?? [] });
}

/** Update flow name / status / sender. */
export async function PATCH(req: Request, { params }: Params) {
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

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const flow = await resolveFlow(supabase, user.id, projectId, flowId);
  if (!flow) return NextResponse.json({ error: "Flow not found." }, { status: 404 });

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.status !== undefined) updates.status = parsed.data.status;
  if (parsed.data.from_email !== undefined) updates.from_email = parsed.data.from_email;
  if (parsed.data.from_name !== undefined) updates.from_name = parsed.data.from_name;
  if ("reply_to" in parsed.data) updates.reply_to = parsed.data.reply_to ?? null;

  const { data, error } = await supabase
    .from("email_flows")
    .update(updates)
    .eq("id", flowId)
    .select("id, name, trigger_type, status, from_email, from_name, reply_to, updated_at")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Could not update flow.", detail: error?.message }, { status: 500 });
  }

  return NextResponse.json({ flow: data });
}

/** Delete a flow (cascades steps + enrollments). */
export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: projectId, flowId } = await params;

  const flow = await resolveFlow(supabase, user.id, projectId, flowId);
  if (!flow) return NextResponse.json({ error: "Flow not found." }, { status: 404 });

  const { error } = await supabase.from("email_flows").delete().eq("id", flowId);
  if (error) {
    return NextResponse.json({ error: "Could not delete flow.", detail: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
