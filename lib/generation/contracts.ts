import { z } from "zod";
import { canonicalStringify } from "@/lib/creative-core";

export const targetSchema = z.enum(["builder", "studio"]);
export type GenerationTarget = z.infer<typeof targetSchema>;
export const briefSchema = z.strictObject({
  prompt: z.string().trim().min(8).max(12000),
  direction: z.string().trim().max(4000).default(""),
  output: z.enum(["website", "slides", "carousel", "portfolio", "document", "ebook", "ad", "sticker", "quote", "social", "other"]),
  mode: z.enum(["generate", "revise", "inspect"]).default("generate"),
  preserveText: z.boolean().default(false),
  pageLimit: z.number().int().min(1).max(20).default(3),
  maxRepairs: z.number().int().min(0).max(2).default(1),
}).refine(value => value.mode !== "inspect" || value.maxRepairs === 0, "Inspection-only requests do not change artwork.");
export type GenerationBrief = z.infer<typeof briefSchema>;
export const directionSchema = z.strictObject({
  summary: z.string().min(1).max(2000),
  typography: z.string().min(1).max(1000),
  composition: z.string().min(1).max(1500),
  palette: z.array(z.string().regex(/^#[0-9a-fA-F]{6}$/)).min(1).max(8),
  motion: z.string().max(1000),
  contentReview: z.array(z.string().max(500)).max(12),
});
export const issueSchema = z.strictObject({
  code: z.string().min(1).max(80), message: z.string().min(1).max(600),
  pageId: z.string().max(80).optional(), objectId: z.string().max(80).optional(),
  viewport: z.number().int().positive().optional(),
  severity: z.enum(["error", "review"]), repairable: z.boolean(),
});
export type GenerationIssue = z.infer<typeof issueSchema>;
export const visualReviewSchema = z.strictObject({ issues: z.array(issueSchema).max(40), summary: z.string().max(2000) });
export type QualityReport = {
  candidateHash: string; checker: "kebu-browser-v1"; checkedAt: string;
  status: "pass" | "fail" | "incomplete";
  issues: GenerationIssue[]; checks: string[]; viewports: number[];
  screenshots: { pageId: string; viewport: number; path: string }[];
  visualReview: "passed" | "failed" | "not_run";
};
export type PipelineState = "queued" | "working" | "awaiting_approval" | "ready" | "needs_attention" | "needs_rebase" | "cancelled" | "accepted";
export type PipelinePhase = "planning" | "generating" | "checking" | "reviewing" | "repairing";
export type PipelineData = {
  base: unknown; source: unknown; profile?: unknown; savedDirection?: unknown; reference?: unknown; brief: GenerationBrief;
  direction?: z.infer<typeof directionSchema>;
  candidate?: unknown; report?: QualityReport;
  reviewBatch?: number;
  repairs: number; calls: number; maxCalls: number;
  history: { candidate: unknown; report: QualityReport }[];
  usage: { model: string; inputTokens: number; outputTokens: number }[];
  error?: string;
};
export type GenerationRun = {
  id: string; actor_id: string; target_kind: GenerationTarget; target_id: string;
  state: PipelineState; phase: PipelinePhase; revision: number;
  lease_token: string | null; lease_until: string | null; call_started: boolean;
  data: PipelineData; created_at: string; updated_at: string;
};
export const startSchema = z.strictObject({ requestId: z.string().uuid(), brief: briefSchema, basedOnRunId: z.string().uuid().optional() });
export const controlSchema = z.discriminatedUnion("action", [
  z.strictObject({ action: z.literal("approve"), revision: z.number().int().nonnegative(), direction: directionSchema }),
  z.strictObject({ action: z.literal("cancel") }),
  z.strictObject({ action: z.literal("advance") }),
  z.strictObject({ action: z.literal("accept"), revision: z.number().int().nonnegative() }),
]);
export const repairSchema = z.strictObject({ changes: z.array(z.strictObject({
  pageId: z.string().max(80), objectId: z.string().max(80),
  key: z.string().max(40), value: z.union([z.string().max(120), z.number().finite(), z.boolean()]),
  device: z.enum(["base", "mobile", "tablet"]).default("base"),
})).max(32) });
export type Repair = z.infer<typeof repairSchema>;
export function canonicalEqual(a: unknown, b: unknown) { return canonicalStringify(a) === canonicalStringify(b); }
