import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { getAiMeterStatus } from "@/lib/billing/ai-metering";
import { directionSchema, repairSchema, visualReviewSchema, type GenerationRun, type PipelineState, type PipelinePhase, type QualityReport } from "./contracts";
import { generationProvider, validateGenerationInput, type ProviderResult, type ReviewImage } from "./provider";
import { loadGenerationTarget, candidateSchema, buildCandidate, repairCandidate } from "./targets";
import { inspectCandidate, combineVisualIssues } from "./browser";
import { generationHash } from "./hash";

export interface PipelineServices {
  source(): Promise<unknown>;
  request<T extends z.ZodType>(schema: T, instruction: string, data: unknown, images?: ReviewImage[]): Promise<ProviderResult<z.output<T>>>;
  inspect(run: GenerationRun): Promise<QualityReport>;
  images(report: QualityReport): Promise<ReviewImage[]>;
}
export async function advanceGenerationStage(input: GenerationRun, services: PipelineServices): Promise<{ state: PipelineState; phase: PipelinePhase; data: GenerationRun["data"] }> {
  const run = structuredClone(input), data = run.data;
  if (generationHash(await services.source()) !== generationHash(data.source)) return { state: "needs_rebase", phase: run.phase, data: { ...data, error: "Your saved work changed. Start a fresh request; newer edits are kept." } };
  if (run.phase !== "checking" && data.calls >= data.maxCalls) throw new Error("The AI attempt budget was reached.");
  if (run.phase === "repairing" && (data.repairs >= data.brief.maxRepairs || !data.report || data.report.issues.length === 0 || !data.report.issues.every(issue => issue.repairable))) throw new Error("This candidate requires human review.");
  const common = { brief: data.brief, direction: data.direction, document: data.base, reference: data.reference, brandProfile: data.profile, savedDirection: data.savedDirection };
  if (run.phase === "planning") {
    const result = await services.request(directionSchema, "Propose a distinctive, coherent creative direction for this brief. Work within the supplied facts/assets. Explain copy requiring review. Do not change the document. For Studio use editable pages/layers, including documents, slides, carousels and stickers.", common);
    data.direction = result.output; data.usage.push({ model: result.model, inputTokens: result.inputTokens, outputTokens: result.outputTokens });
    return { state: "awaiting_approval", phase: "generating", data };
  }
  if (run.phase === "generating") {
    const instruction = run.target_kind === "builder"
      ? "Generate a complete native website plan using section/group/text/image/video primitives. Keep the home page and the approved page addresses. Each child's parent is the earlier node's zero-based index; root sections have parent=null. Use only saved media and existing or actual generated page links. Design all phone/tablet/desktop states deliberately. Respect locked content and attached brand direction. Do not invent testimonials, business facts or quotes. Return the native plan, not code or HTML."
      : "Generate a complete editable Studio document with pages and layers for the requested output. Preserve locked artwork and requested existing text. Use original composition and typography; align to the approved direction. Use only media already present. Page and layer IDs must be unique alphanumeric/underscore/hyphen strings. Retain the existing document version 2 schema and native limits (20 pages,64layers/page). For documents/e-books paginate supplied content, keep text editable and never invent citations or quotations. For stickers use a transparent background when requested. Top-level dimensions/layers must mirror the first page. Return document.";
    const result = await services.request(candidateSchema(run.target_kind), instruction, common);
    data.candidate = buildCandidate(run, result.output); data.usage.push({ model: result.model, inputTokens: result.inputTokens, outputTokens: result.outputTokens });
    return { state: "queued", phase: "checking", data };
  }
  if (run.phase === "checking") {
    data.report = await services.inspect(run); data.reviewBatch = 0;
    return { state: "queued", phase: data.report.status === "incomplete" ? "checking" : "reviewing", data };
  }
  if (run.phase === "reviewing") {
    if (!data.report) throw new Error("The browser report is unavailable.");
    const images = await services.images(data.report);
    if (!images.length) throw new Error("Private visual evidence is unavailable.");
    const result = await services.request(visualReviewSchema, "Inspect the supplied actual rendered candidate screenshots. Identify clipping, illegible text, unintended overlap and layout inconsistency. Intentional image/text overlays and decorative layering are allowed. Return specific issues, using page/object IDs from DATA where known. Do not invent element identities. Mark content/factual/link/media issues as repairable=false. Do not infer that interactions worked from images; deterministic results in DATA remain authoritative.", { brief: data.brief, direction: data.direction, document: data.candidate, browserReport: data.report }, images);
    data.usage.push({ model: result.model, inputTokens: result.inputTokens, outputTokens: result.outputTokens }); data.report = combineVisualIssues(data.report, result.output.issues);
    data.reviewBatch = (data.reviewBatch ?? 0) + 1;
    const pages = (data.candidate as { document: { pages: unknown[] } }).document.pages.length;
    if (data.reviewBatch < Math.ceil(pages / 2)) return { state: "queued", phase: "reviewing", data };
    if (data.report.status === "pass") return { state: "ready", phase: run.phase, data };
    const repairable = data.report.issues.length > 0 && data.report.issues.every(issue => issue.repairable);
    return { state: repairable && data.repairs < data.brief.maxRepairs ? "queued" : "needs_attention", phase: repairable && data.repairs < data.brief.maxRepairs ? "repairing" : run.phase, data };
  }
  const result = await services.request(repairSchema, "Repair only the reported presentation problems with a small set of changes. Never change text, URLs, media, object/page identity, locks, order, ownership, forms or business claims. For Studio keys: x,y,width,height,fontSize,lineHeight,letterSpacing,color,fill,opacity,cornerRadius,textAlign; device=base. For Builder keys: fontSize,lineHeight,letterSpacing,align,gap,padding,paddingY,width,wrap,columns,minHeightVh,color,background; device=base/mobile/tablet. Use exact page/object IDs from the candidate. Do not resize a page or change locked artwork.", { candidate: data.candidate, report: data.report });
  if (data.report) data.history.push({ candidate: data.candidate, report: data.report });
  data.candidate = repairCandidate(run, result.output); data.repairs++; delete data.report; data.reviewBatch = 0; data.usage.push({ model: result.model, inputTokens: result.inputTokens, outputTokens: result.outputTokens });
  return { state: "queued", phase: "checking", data };
}

export async function advanceCreativeGeneration(admin: SupabaseClient, id?: string) {
  const claimed = await admin.rpc("claim_creative_generation", { p_id: id ?? null });
  if (claimed.error) throw new Error("Could not claim generation work.");
  if (!claimed.data?.id) return null;
  const run = claimed.data as GenerationRun, provider = generationProvider();
  let calls = run.data.calls;
  const usage: GenerationRun["data"]["usage"] = [];
  try {
    const services: PipelineServices = {
      source: async () => (await loadGenerationTarget(admin, run.target_kind, run.target_id, run.actor_id)).source,
      request: async (schema, instruction, data, images) => {
        if (!provider.configured || !provider.supportsVision) throw new Error("Generation and visual review must be configured before starting.");
        validateGenerationInput(data, images);
        const meter = await getAiMeterStatus(admin, run.actor_id);
        if ("error" in meter) throw new Error("AI usage is unavailable. Your candidate is kept.");
        const reservation = await admin.rpc("begin_creative_generation_call", { p_id: run.id, p_token: run.lease_token, p_limit: meter.limit });
        if (reservation.error || reservation.data !== true) throw new Error("This request is cancelled, superseded, or has reached its AI allowance. Your work is kept.");
        calls++;
        const result = await provider.request(schema, instruction, data, images); usage.push({ model: result.model, inputTokens: result.inputTokens, outputTokens: result.outputTokens });
        return result;
      },
      inspect: async current => (await inspectCandidate(admin, current)).report,
      images: async report => {
        const selected = report.screenshots.filter(item => item.viewport === 390 || item.viewport === 1280).slice((run.data.reviewBatch ?? 0)*4, ((run.data.reviewBatch ?? 0)+1)*4);
        return Promise.all(selected.map(async item => {
          if (!item.path.startsWith(`${run.actor_id}/${run.id}/${report.candidateHash}/`)) throw new Error("Invalid evidence reference.");
          const result = await admin.storage.from("creative-generation-evidence").download(item.path);
          if (result.error || !result.data || result.data.size > 2_000_000) throw new Error("Visual evidence could not be loaded.");
          return { data: Buffer.from(await result.data.arrayBuffer()).toString("base64"), mediaType: "image/jpeg" as const };
        }));
      },
    };
    const result = await advanceGenerationStage(run, services);
    result.data.calls = calls;
    // Persist receipts only; never store a second copy of the model's output in usage logs.
    result.data.usage = [...run.data.usage, ...usage];
    const saved = await admin.rpc("finish_creative_generation_stage", { p_id: run.id, p_token: run.lease_token, p_state: result.state, p_phase: result.phase, p_data: result.data });
    if (saved.error) throw new Error("Could not persist the generation stage.");
    return saved.data as GenerationRun | null;
  } catch {
    const saved = await admin.rpc("finish_creative_generation_stage", { p_id: run.id, p_token: run.lease_token, p_state: "needs_attention", p_phase: run.phase,
      p_data: { ...run.data, calls, usage: [...run.data.usage, ...usage], error: "This stage could not be completed. Your saved work and previous candidate are kept. Review the report or start a new request; an AI attempt may have used allowance." } });
    if (saved.error) throw new Error("Could not confirm generation recovery. Reload status before retrying.");
    return saved.data as GenerationRun | null;
  }
}
