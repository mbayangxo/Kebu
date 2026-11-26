import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";
import { assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";
import { builderRateLimit } from "@/lib/api-guard";
import { controlSchema, type GenerationRun } from "@/lib/generation/contracts";
import { boundedGenerationJson, generationView, privateHeaders, scheduleGeneration, unavailableGeneration } from "@/lib/generation/api";
export const dynamic = "force-dynamic";
export const maxDuration = 120;
type Params = { params: Promise<{ id: string }> };
export async function GET(_req: Request, { params }: Params) {
  const auth = await requireUser(); if ("error" in auth) return auth.error;
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const result = await auth.supabase.from("creative_generation_runs").select("*").eq("id", id).eq("actor_id", auth.user.id).maybeSingle();
  if (result.error) return unavailableGeneration();
  if (!result.data) return NextResponse.json({ error: "Request unavailable." }, { status: 404 });
  return NextResponse.json({ run: generationView(result.data as GenerationRun) }, { headers: privateHeaders });
}
export async function POST(req: Request, { params }: Params) {
  const blocked = assertSameOriginMutation(req); if (blocked) return blocked;
  const limited = builderRateLimit(req); if (limited) return limited;
  const auth = await requireUser(); if ("error" in auth) return auth.error;
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  let input: z.infer<typeof controlSchema>;
  try { input = controlSchema.parse(await boundedGenerationJson(req)); } catch { return NextResponse.json({ error: "Invalid request action." }, { status: 400 }); }
  const loaded = await auth.supabase.from("creative_generation_runs").select("*").eq("id", id).eq("actor_id", auth.user.id).maybeSingle();
  if (loaded.error) return unavailableGeneration();
  if (!loaded.data) return NextResponse.json({ error: "Request unavailable." }, { status: 404 });
  if (input.action === "advance") { if (["queued", "working"].includes(loaded.data.state)) scheduleGeneration(id); return NextResponse.json({ scheduled: true }, { status: 202, headers: privateHeaders }); }
  if (input.action === "accept") {
    const result = await auth.supabase.rpc("accept_creative_generation", { p_id: id, p_revision: input.revision });
    if (result.error || result.data?.conflict) return NextResponse.json({ error: "Your saved document changed or this candidate is not ready. Reload status; your newer work is kept." }, { status: 409, headers: privateHeaders });
    return NextResponse.json(result.data, { headers: privateHeaders });
  }
  const result = await auth.supabase.rpc("control_creative_generation", { p_id: id, p_action: input.action, p_revision: input.action === "approve" ? input.revision : null, p_direction: input.action === "approve" ? input.direction : null });
  if (result.error || !result.data?.id) return NextResponse.json({ error: "The request changed. Reload its current status." }, { status: 409, headers: privateHeaders });
  if (input.action === "approve") scheduleGeneration(id);
  return NextResponse.json({ run: generationView(result.data as GenerationRun) }, { headers: privateHeaders });
}
