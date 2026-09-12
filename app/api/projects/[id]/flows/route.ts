import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const flowCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  trigger_type: z.enum(["subscribe", "order_placed", "cart_abandoned"]),
  from_email: z.string().trim().email().max(254).default(""),
  from_name: z.string().trim().max(120).default(""),
  reply_to: z.string().trim().email().max(254).optional().nullable(),
});

/** List all flows for a project's business. */
export async function GET(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: projectId } = await params;

  const { data: project } = await supabase
    .from("projects")
    .select("id, business_id")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!project?.business_id) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("email_flows")
    .select(
      "id, name, trigger_type, status, from_email, from_name, reply_to, created_at, updated_at",
    )
    .eq("business_id", project.business_id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      {
        error: error.message?.includes("does not exist")
          ? "Apply migration 097_email_automation_flows.sql."
          : "Could not load flows.",
      },
      { status: 500 },
    );
  }

  // Also fetch step counts per flow
  const flowIds = (data ?? []).map((f) => f.id as string);
  let stepCounts: Record<string, number> = {};
  if (flowIds.length > 0) {
    const { data: steps } = await supabase
      .from("email_flow_steps")
      .select("flow_id")
      .in("flow_id", flowIds);
    for (const s of steps ?? []) {
      stepCounts[s.flow_id as string] = (stepCounts[s.flow_id as string] ?? 0) + 1;
    }
  }

  return NextResponse.json({
    flows: (data ?? []).map((f) => ({ ...f, step_count: stepCounts[f.id as string] ?? 0 })),
  });
}

/** Create a new flow (starts as draft). */
export async function POST(req: Request, { params }: Params) {
  const limited = builderRateLimit(req);
  if (limited) return limited;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: projectId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = flowCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id, business_id")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!project?.business_id) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("email_flows")
    .insert({
      business_id: project.business_id,
      name: parsed.data.name,
      trigger_type: parsed.data.trigger_type,
      status: "draft",
      from_email: parsed.data.from_email,
      from_name: parsed.data.from_name,
      reply_to: parsed.data.reply_to ?? null,
      created_by: user.id,
    })
    .select("id, name, trigger_type, status, from_email, from_name, reply_to, created_at, updated_at")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Could not create flow.", detail: error?.message }, { status: 500 });
  }

  return NextResponse.json({ flow: { ...data, step_count: 0 } }, { status: 201 });
}
