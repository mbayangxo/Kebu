import "server-only";
import { after, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/opportunity/admin";
import { advanceCreativeGeneration } from "./engine";
import { generationProvider } from "./provider";
import { browserConfiguration } from "./browser";
import type { GenerationRun } from "./contracts";
export const privateHeaders = { "Cache-Control": "private, no-store", "Vary": "Cookie" };
export function generationView(run: GenerationRun) {
  const { brief, direction, report, error, repairs, calls, maxCalls } = run.data;
  return { id: run.id, target_kind: run.target_kind, target_id: run.target_id, state: run.state, phase: run.phase, revision: run.revision, created_at: run.created_at, updated_at: run.updated_at,
    data: { brief, direction, report, error, repairs, calls, maxCalls, hasCandidate: Boolean(run.data.candidate), pages: ((run.data.candidate as { document?: { pages?: {id:string;name?:string;title?:string}[] } } | undefined)?.document?.pages ?? []).map(page => ({ id: page.id, name: page.name ?? page.title ?? "Page" })), previousReports: run.data.history.map(item => item.report) } };
}
export type GenerationView = ReturnType<typeof generationView>;
export function generationReadiness() {
  const provider = generationProvider();
  return { configured: provider.configured && provider.supportsVision && Boolean(browserConfiguration()) };
}
export function scheduleGeneration(id: string) {
  after(async () => { const admin = createServiceClient(); if (!admin) return; try { await advanceCreativeGeneration(admin, id); } catch { console.error("creative_generation_stage_unconfirmed", { runId: id }); } });
}
export async function boundedGenerationJson(req: Request) {
  const reader = req.body?.getReader(); if (!reader) throw new Error("Input required");
  const chunks: Uint8Array[] = []; let bytes = 0;
  try { for (;;) { const item = await reader.read(); if (item.done) break; bytes += item.value.byteLength; if (bytes > 96_000) { await reader.cancel(); throw new Error("Input too large"); } chunks.push(item.value); } } finally { reader.releaseLock(); }
  const body = new Uint8Array(bytes); let offset = 0; for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(body));
}
export function unavailableGeneration() { return NextResponse.json({ error: "Generation is unavailable in this environment. Your saved work is kept." }, { status: 503, headers: privateHeaders }); }
