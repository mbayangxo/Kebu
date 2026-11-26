import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { loadExperienceContext } from "@/lib/create/experience-engine-context";
import { experiencePlanTransaction, sitePlanSchema, type ExperienceSource } from "@/lib/create/experience-engine";
import { prepareBuilderTransaction } from "@/lib/create/kcd-write-boundary";
import { expectFor, type KcdDocument, type NodeId, type Op, type Transaction, canonicalStringify, isSpatialLocked } from "@/lib/creative-core";
import { canvasDocumentSchema, type CanvasDocument } from "@/lib/studio/canvas-document";
import { loadActiveWorkspaceScope } from "@/lib/account/server-workspace";
import { resolveStudioDesignAccess } from "@/lib/studio/design-access";
import type { BrandBrainRecord } from "@/lib/create/brand-brain";
import { generationHash } from "./hash";
import type { GenerationRun, GenerationTarget, Repair } from "./contracts";

export type Candidate = { document: KcdDocument | CanvasDocument; transaction?: Transaction; proposal?: Record<string, unknown> };
export async function loadGenerationTarget(db: SupabaseClient, kind: GenerationTarget, id: string, actor: string, enforceWorkspace = false) {
  if (kind === "builder") {
    const context = await loadExperienceContext(db, id, actor);
    return { base: context.document, source: context.source, profile: context.profile, savedDirection: context.record.dna };
  }
  const access = await resolveStudioDesignAccess(db, { designId: id, userId: actor });
  if (!access?.canEdit) throw new Error("Editing access is no longer available.");
  const { data, error } = await db.from("create_designs").select("canvas,updated_at,business_id").eq("id", id).single();
  if (error || !data) throw new Error("The saved design is unavailable.");
  if (enforceWorkspace && (await loadActiveWorkspaceScope(db, actor)).activeBusinessId !== (data.business_id ?? null)) throw new Error("Switch to this design’s workspace before generating.");
  if (data.business_id) {
    const member = await db.from("business_members").select("id").eq("business_id", data.business_id).eq("user_id", actor).eq("status", "active").maybeSingle();
    if (member.error || !member.data) throw new Error("Business editing access is no longer available.");
  }
  return { base: canvasDocumentSchema.parse(data.canvas), source: { canvas: data.canvas, updatedAt: data.updated_at }, profile: null, savedDirection: null };
}
export const studioCandidateSchema = z.strictObject({ document: canvasDocumentSchema });
export function candidateSchema(kind: GenerationTarget) { return kind === "builder" ? sitePlanSchema : studioCandidateSchema; }

export function mediaReferences(value: unknown): string[] {
  const found = new Set<string>();
  function walk(item: unknown) {
    if (!item || typeof item !== "object") return;
    for (const [key, child] of Object.entries(item)) {
      if (["src", "imageUrl", "videoUrl", "posterUrl", "poster", "captionsSrc", "url", "frameMediaUrl"].includes(key) && typeof child === "string" && child) found.add(child);
      else if (child && typeof child === "object") walk(child);
    }
  }
  walk(value); return [...found];
}
function textReferences(value: unknown): string[] {
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, child]) => key === "text" && typeof child === "string" ? [child] : textReferences(child));
}
export function validateCandidate(run: GenerationRun, candidate: Candidate) {
  if (run.data.brief.mode !== "inspect" && candidate.document.pages.length > run.data.brief.pageLimit) throw new Error("The candidate exceeds the requested page limit.");
  const native = candidate.document;
  const objects = run.target_kind === "studio" ? (native as CanvasDocument).pages.flatMap(page => page.layers) : Object.values((native as KcdDocument).nodes).map(node => ({ type: node.type, ...node.props }));
  for (const object of objects) {
    const media = object as { type: string; src?: string; imageUrl?: string; videoUrl?: string };
    if ((media.type === "image" && !(media.src || media.imageUrl)) || (media.type === "video" && !(media.src || media.videoUrl))) throw new Error("A media object needs an existing saved asset; empty placeholders are not generated output.");
  }
  const allowed = new Set([...mediaReferences(run.data.base), ...mediaReferences(run.data.profile)]);
  for (const url of mediaReferences(candidate.document)) if (!allowed.has(url)) throw new Error("Use only media already saved in this document.");
  if (run.data.brief.preserveText) {
    // Studio has a legacy top-level layer mirror. Count logical pages once,
    // otherwise the active-page mirror can create false missing-text errors.
    const candidateContent = run.target_kind === "studio" ? (candidate.document as CanvasDocument).pages : candidate.document;
    const sourceContent = run.target_kind === "studio" ? (run.data.base as CanvasDocument).pages : run.data.base;
    const remaining = new Map<string, number>();
    for (const text of textReferences(candidateContent)) remaining.set(text, (remaining.get(text) ?? 0) + 1);
    for (const text of textReferences(sourceContent)) {
      const count = remaining.get(text) ?? 0;
      if (count === 0) throw new Error("The proposal changed text marked for preservation.");
      remaining.set(text, count - 1);
    }
  }
  if (run.target_kind === "studio") {
    const source = canvasDocumentSchema.parse(run.data.base), next = canvasDocumentSchema.parse(candidate.document);
    const knownPages = new Set(source.pages.map(page => page.id)), knownLayers = new Set(source.pages.flatMap(page => page.layers.map(layer => layer.id)));
    const pageIds = new Set<string>(), layerIds = new Set<string>();
    for (const page of next.pages) {
      if ((!/^[a-zA-Z0-9_-]{1,40}$/.test(page.id) && !knownPages.has(page.id)) || pageIds.has(page.id)) throw new Error("Generated page IDs must be unique."); pageIds.add(page.id);
      for (const layer of page.layers) { if ((!/^[a-zA-Z0-9_-]{1,40}$/.test(layer.id) && !knownLayers.has(layer.id)) || layerIds.has(layer.id)) throw new Error("Generated object IDs must be unique."); layerIds.add(layer.id); }
    }
    for (const page of source.pages) for (const layer of page.layers.filter(item => item.locked)) {
      const retained = next.pages.find(p => p.id === page.id)?.layers.find(l => l.id === layer.id);
      if (canonicalStringify(retained ?? null) !== canonicalStringify(layer)) throw new Error("Locked artwork must remain unchanged on its original page.");
    }
  }
}
export function buildCandidate(run: GenerationRun, result: unknown): Candidate {
  if (run.target_kind === "studio") {
    const parsed = studioCandidateSchema.parse(result), doc = parsed.document;
    // The top-level legacy mirror must agree with the actual first page.
    const first = doc.pages[0];
    const candidate = { document: { ...doc, width: first.width, height: first.height, backgroundColor: first.backgroundColor, layers: first.layers } };
    validateCandidate(run, candidate); return candidate;
  }
  const base = run.data.base as KcdDocument, plan = sitePlanSchema.parse(result);
  const transaction = experiencePlanTransaction(base, plan, { kind: "site", replace: true }, (run.data.profile ?? null) as BrandBrainRecord | null, run.id);
  const checked = prepareBuilderTransaction(base, transaction);
  if (!checked.ok) throw new Error(checked.error.message);
  const candidate = { document: checked.prediction.document, transaction, proposal: {
    id: run.id, projectId: run.target_id, createdAt: new Date().toISOString(), kind: "plan", model: "generation-pipeline",
    source: run.data.source as ExperienceSource, scope: { kind: "site", replace: true }, analysisIds: [], plan, transaction,
  } };
  validateCandidate(run, candidate); return candidate;
}
const studioStyles = new Set(["x", "y", "width", "height", "fontSize", "lineHeight", "letterSpacing", "color", "fill", "opacity", "cornerRadius", "textAlign"]);
const builderStyles = new Set(["fontSize", "lineHeight", "letterSpacing", "align", "gap", "padding", "paddingY", "width", "wrap", "columns", "minHeightVh", "color", "background"]);
export function repairCandidate(run: GenerationRun, repair: Repair): Candidate {
  const current = structuredClone(run.data.candidate) as Candidate;
  if (!current?.document) throw new Error("There is no candidate to repair.");
  if (run.target_kind === "studio") {
    const doc = canvasDocumentSchema.parse(current.document);
    for (const change of repair.changes) {
      if (!studioStyles.has(change.key) || change.device !== "base") throw new Error("Automatic repair can only adjust presentation.");
      const page = doc.pages.find(item => item.id === change.pageId), layer = page?.layers.find(item => item.id === change.objectId);
      if (!layer || layer.locked) throw new Error("The repair addressed unavailable or locked artwork.");
      Object.assign(layer, { [change.key]: change.value });
    }
    const parsed = canvasDocumentSchema.parse(doc), first = parsed.pages[0];
    const result = { document: { ...parsed, width: first.width, height: first.height, backgroundColor: first.backgroundColor, layers: first.layers } };
    validateCandidate(run, result); return result;
  }
  const base = run.data.base as KcdDocument, doc = current.document as KcdDocument;
  const extra: Op[] = repair.changes.map(change => {
    const node = doc.nodes[change.objectId as NodeId];
    if (!builderStyles.has(change.key) || !node || node.pageId !== change.pageId || isSpatialLocked(doc, node.id)) throw new Error("Automatic repair can only adjust unlocked presentation.");
    return change.device === "base" ? { op: "setProp", id: node.id, path: change.key, value: change.value } : { op: "setOverride", id: node.id, device: change.device, key: change.key, value: change.value };
  });
  const ops = [...current.transaction!.ops, ...extra], tx: Transaction = { ...current.transaction!, ops, expect: expectFor(base, ops) };
  const checked = prepareBuilderTransaction(base, tx);
  if (!checked.ok) throw new Error(checked.error.message);
  const result = { document: checked.prediction.document, transaction: tx, proposal: { ...current.proposal!, transaction: tx } };
  validateCandidate(run, result); return result;
}
export function candidateFingerprint(candidate: Candidate) { return generationHash(candidate.document); }
