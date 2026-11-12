import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";
import { assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";
import { aiRateLimit } from "@/lib/api-guard";
import { createServiceClient } from "@/lib/opportunity/admin";
import { targetSchema, startSchema, type GenerationRun, type PipelineData } from "@/lib/generation/contracts";
import { loadGenerationTarget } from "@/lib/generation/targets";
import { generationHash } from "@/lib/generation/hash";
import { generationView, generationReadiness, scheduleGeneration, privateHeaders, boundedGenerationJson, unavailableGeneration } from "@/lib/generation/api";
export const dynamic = "force-dynamic";
export const maxDuration = 120;
type Params = { params: Promise<{ kind: string; targetId: string }> };
export async function GET(_req: Request, { params }: Params) {
  const auth = await requireUser(); if ("error" in auth) return auth.error;
  const p = await params, kind = targetSchema.safeParse(p.kind);
  if (!kind.success || !z.string().uuid().safeParse(p.targetId).success) return NextResponse.json({ error: "Invalid creation." }, { status: 400 });
  const result = await auth.supabase.from("creative_generation_runs").select("*").eq("actor_id", auth.user.id).eq("target_kind", kind.data).eq("target_id", p.targetId).order("created_at", { ascending: false }).limit(12);
  if (result.error) return unavailableGeneration();
  return NextResponse.json({ ...generationReadiness(), runs: (result.data ?? []).map(row => generationView(row as GenerationRun)) }, { headers: privateHeaders });
}
export async function POST(req: NextRequest, { params }: Params) {
  const blocked = assertSameOriginMutation(req); if (blocked) return blocked;
  const limited = aiRateLimit(req); if (limited) return limited;
  const auth = await requireUser(); if ("error" in auth) return auth.error;
  const p = await params, kind = targetSchema.safeParse(p.kind);
  if (!kind.success || !z.string().uuid().safeParse(p.targetId).success) return NextResponse.json({ error: "Invalid creation." }, { status: 400 });
  let input: z.infer<typeof startSchema>;
  try { input = startSchema.parse(await boundedGenerationJson(req)); } catch { return NextResponse.json({ error: "Check the brief and repair limit." }, { status: 400 }); }
  if (!generationReadiness().configured) return unavailableGeneration();
  const admin = createServiceClient(); if (!admin) return unavailableGeneration();
  try {
    const target = await loadGenerationTarget(auth.supabase, kind.data, p.targetId, auth.user.id, true);
    let reference: unknown;
    if (input.basedOnRunId) {
      const previous = await auth.supabase.from("creative_generation_runs").select("*").eq("id", input.basedOnRunId).eq("actor_id", auth.user.id).eq("target_kind", kind.data).eq("target_id", p.targetId).maybeSingle();
      if (previous.error || !previous.data?.data?.candidate) return NextResponse.json({ error: "That candidate is unavailable." }, { status: 404 });
      reference = previous.data.data.candidate;
    }
    const data: PipelineData = { base: target.base, source: target.source, profile: target.profile, savedDirection: target.savedDirection, ...(reference ? { reference } : {}), brief: input.brief, repairs: 0, calls: 0,
      maxCalls: input.brief.mode === "inspect" ? Math.ceil((target.base.pages.length)/2) : 2 + Math.ceil(Math.min(input.brief.pageLimit, kind.data === "builder" ? 12 : 20)/2) * (1 + input.brief.maxRepairs) + input.brief.maxRepairs, history: [], usage: [],
      ...(input.brief.mode === "inspect" ? { candidate: { document: target.base } } : {}) };
    // A repeated request key returns its existing immutable job, even after the source advances.
    const existing = await auth.supabase.from("creative_generation_runs").select("*").eq("actor_id", auth.user.id).eq("target_kind", kind.data).eq("target_id", p.targetId).eq("request_key", input.requestId).maybeSingle();
    if (existing.error) return unavailableGeneration();
    if (existing.data) {
      const run = existing.data as GenerationRun;
      if (generationHash(run.data.brief) !== generationHash(input.brief) || generationHash(run.data.reference ?? null) !== generationHash(reference ?? null)) return NextResponse.json({ error: "This request key belongs to another brief." }, { status: 409 });
      return NextResponse.json({ run: generationView(run) }, { headers: privateHeaders });
    }
    const created = await admin.rpc("create_creative_generation", { p_actor: auth.user.id, p_kind: kind.data, p_target: p.targetId, p_key: input.requestId, p_data: data });
    if (created.error || !created.data?.id) return unavailableGeneration();
    scheduleGeneration(created.data.id);
    return NextResponse.json({ run: generationView(created.data as GenerationRun) }, { status: 202, headers: privateHeaders });
  } catch { return NextResponse.json({ error: "Save your native document and its direction, then retry. Your work is kept." }, { status: 409, headers: privateHeaders }); }
}
