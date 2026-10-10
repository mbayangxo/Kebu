import { NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";
import { builderRateLimit } from "@/lib/api-guard";
import { authorizeExperienceProject } from "@/lib/create/experience-dna-access";
import { referenceInputSchema, referenceReviewInputSchema, planInputSchema, referenceAnalysisSchema, sitePlanSchema, experiencePlanTransaction, experienceScopeLocked, scopePage, sameSource, validateReferenceAnalysis } from "@/lib/create/experience-engine";
import { experienceProposalSchema, type ExperienceProposal } from "@/lib/create/experience-proposal";
import { assertExperienceModelInput, experienceModelConfigured, requestExperienceModel } from "@/lib/create/experience-model-gateway";
import { ExperienceContextError, loadExperienceContext } from "@/lib/create/experience-engine-context";
import { createServiceClient } from "@/lib/opportunity/admin";
import { getAiMeterStatus } from "@/lib/billing/ai-metering";
import { compileBrandBrain } from "@/lib/create/brand-brain";
import { compileExperienceDna } from "@/lib/create/experience-dna";
import { REFERENCE_ANALYSIS_INSTRUCTION, SITE_PLAN_INSTRUCTION } from "@/lib/create/experience-prompts";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
type Params = { params: Promise<{ id: string }> };
const inputSchema = z.union([referenceInputSchema, referenceReviewInputSchema, planInputSchema]);
async function readInput(req: Request) {
  const reader = req.body?.getReader(); if (!reader) throw new Error("Missing input.");
  let size = 0; const chunks: Uint8Array[] = [];
  try { for (;;) { const { value, done } = await reader.read(); if (done) break; size += value.byteLength; if (size > 65536) { await reader.cancel(); throw new Error("Input too large."); } chunks.push(value); } }
  finally { reader.releaseLock(); }
  const buffer = new Uint8Array(size); let offset = 0; chunks.forEach(chunk => { buffer.set(chunk, offset); offset += chunk.byteLength; });
  return inputSchema.parse(JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(buffer)));
}
export async function GET(_req: Request, { params }: Params) {
  const id = (await params).id, gate = await authorizeExperienceProject(id); if ("error" in gate) return gate.error;
  const result = await gate.supabase.from("project_experience_proposals").select("id,payload").eq("project_id", id).eq("owner_id", gate.user.id).order("created_at", { ascending: false }).limit(24);
  if (result.error) return NextResponse.json({ error: "Could not load saved proposals. Retry." }, { status: 503 });
  try {
    const proposals = (result.data ?? []).map(row => { const proposal = experienceProposalSchema.parse(row.payload); if (proposal.id !== row.id || proposal.projectId !== id) throw new Error("Invalid proposal"); return proposal; });
    return NextResponse.json({ configured: experienceModelConfigured(), proposals }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "Saved proposals are incompatible. Your saved site is kept." }, { status: 422 }); }
}
export async function POST(req: Request, { params }: Params) {
  const origin = assertSameOriginMutation(req); if (origin) return origin;
  const limited = builderRateLimit(req); if (limited) return limited;
  const id = (await params).id, gate = await authorizeExperienceProject(id); if ("error" in gate) return gate.error;
  let input: z.infer<typeof inputSchema>;
  try { input = await readInput(req); } catch { return NextResponse.json({ error: "Invalid or oversized generation input." }, { status: 400 }); }
  if (input.kind === "review") {
    try {
      const original = await gate.supabase.from("project_experience_proposals").select("payload").eq("id", input.proposalId).eq("project_id", id).eq("owner_id", gate.user.id).eq("kind", "reference").maybeSingle();
      if (original.error || !original.data) return NextResponse.json({ error: "Reference proposal unavailable." }, { status: 404 });
      const previous = experienceProposalSchema.parse(original.data.payload);
      if (previous.kind !== "reference" || previous.projectId !== id || previous.id !== input.proposalId) throw new Error("Incompatible reference");
      const proposal = experienceProposalSchema.parse({ ...previous, id: crypto.randomUUID(), createdAt: new Date().toISOString(), reviewedFrom: previous.id, analysis: validateReferenceAnalysis(input.analysis, previous.excerpt) });
      const service = createServiceClient(); if (!service) throw new Error("Proposal storage unavailable");
      const saved = await service.from("project_experience_proposals").insert({ id: proposal.id, project_id: id, owner_id: gate.user.id, kind: "reference", payload: proposal });
      if (saved.error) throw new Error("Could not save reference review");
      return NextResponse.json({ proposal }, { headers: { "Cache-Control": "no-store" } });
    } catch { return NextResponse.json({ error: "Could not confirm the reviewed observations. Reload proposals; the original source is kept." }, { status: 503 }); }
  }
  if (!experienceModelConfigured()) return NextResponse.json({ error: "AI generation is not configured. Your saved direction and site are kept." }, { status: 503 });
  const service = createServiceClient(); if (!service) return NextResponse.json({ error: "AI metering is unavailable. Your site is unchanged." }, { status: 503 });
  try {
    const context = input.kind === "plan" ? await loadExperienceContext(gate.supabase, id, gate.user.id) : null;
    let focusedPageId = null;
    if (context && input.kind === "plan") {
      try {
        focusedPageId = scopePage(context.document, input.scope);
        if (experienceScopeLocked(context.document, input.scope)) return NextResponse.json({ error: "Unlock content in this replacement scope before generating." }, { status: 400 });
      } catch { return NextResponse.json({ error: "Choose an existing native page or section before generating." }, { status: 400 }); }
    }
    let analyses: ExperienceProposal[] = [];
    if (input.kind === "plan" && input.analysisIds.length) {
      const rows = await gate.supabase.from("project_experience_proposals").select("id,payload").eq("project_id", id).eq("owner_id", gate.user.id).eq("kind", "reference").in("id", input.analysisIds);
      if (rows.error || rows.data?.length !== input.analysisIds.length) throw new Error("Selected references unavailable.");
      analyses = rows.data.map(row => { const proposal = experienceProposalSchema.parse(row.payload); if (proposal.id !== row.id || !input.analysisIds.includes(row.id) || proposal.kind !== "reference" || proposal.projectId !== id) throw new Error("Incompatible reference"); return proposal; });
    }
    const scopedDocument = context && focusedPageId ? { ...context.document, nodes: Object.fromEntries(Object.entries(context.document.nodes).filter(([, node]) => node.pageId === focusedPageId)) } : context?.document;
    const modelData = input.kind === "reference" ? { label: input.label, excerpt: input.excerpt } : { scope: input.scope, direction: compileExperienceDna(context!.record.dna!), brandBrain: context!.profile ? compileBrandBrain(context!.profile.profile) : null, current: scopedDocument, reviewedReferences: analyses };
    try { assertExperienceModelInput(modelData); } catch { return NextResponse.json({ error: "This request is too large. Choose a smaller scope or shorter source text." }, { status: 400 }); }
    const meter = await getAiMeterStatus(gate.supabase, gate.user.id);
    if ("error" in meter) return NextResponse.json({ error: "AI usage is unavailable. Retry." }, { status: 503 });
    const proposalId = crypto.randomUUID();
    const reserve = await service.rpc("reserve_experience_generation", { p_owner: gate.user.id, p_project: id, p_id: proposalId, p_limit: meter.limit, p_kind: input.kind });
    if (reserve.error) return NextResponse.json({ error: "Could not reserve AI usage. Your site is unchanged." }, { status: 503 });
    if (reserve.data !== true) return NextResponse.json({ error: "Your monthly AI allowance is used. Wait until next month or review your plan." }, { status: 402 });
    const common = { id: proposalId, projectId: id, createdAt: new Date().toISOString() };
    let proposal: ExperienceProposal;
    if (input.kind === "reference") {
      const result = await requestExperienceModel(referenceAnalysisSchema, REFERENCE_ANALYSIS_INSTRUCTION, modelData, req.signal);
      proposal = { ...common, kind: "reference", model: result.model, usage: { inputTokens: result.inputTokens, outputTokens: result.outputTokens }, label: input.label, excerpt: input.excerpt, analysis: validateReferenceAnalysis(result.output, input.excerpt) };
    } else {
      const current = context!;
      const result = await requestExperienceModel(sitePlanSchema, SITE_PLAN_INSTRUCTION, modelData, req.signal);
      const fresh = await loadExperienceContext(gate.supabase, id, gate.user.id);
      if (!sameSource(current.source, fresh.source)) return NextResponse.json({ error: "Site or direction changed while generating. Generate a fresh plan." }, { status: 409 });
      if (input.scope.kind === "site" && JSON.stringify(result.output.pages.map(page => page.slug)) !== JSON.stringify(current.record.dna!.pages.map(page => page.slug))) throw new Error("The proposal omitted or reordered desired pages");
      const transaction = experiencePlanTransaction(current.document, result.output, input.scope, current.profile, proposalId);
      proposal = { ...common, kind: "plan", model: result.model, usage: { inputTokens: result.inputTokens, outputTokens: result.outputTokens }, source: current.source, scope: input.scope, analysisIds: input.analysisIds, plan: result.output, transaction };
    }
    proposal = experienceProposalSchema.parse(proposal);
    const saved = await service.from("project_experience_proposals").insert({ id: proposal.id, project_id: id, owner_id: gate.user.id, kind: proposal.kind, payload: proposal });
    if (saved.error) throw new Error("Proposal persistence failed");
    return NextResponse.json({ proposal }, { headers: { "Cache-Control": "no-store" } });
  } catch (failure) {
    if (failure instanceof ExperienceContextError) return NextResponse.json({ error: failure.message }, { status: failure.status });
    return NextResponse.json({ error: "The proposal could not be completed or saved. Reload proposals before requesting again. Your site is unchanged; a reserved attempt may have used one AI allowance." }, { status: 503 });
  }
}
