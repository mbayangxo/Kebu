import { z } from "zod";
import { builderTransactionSchema } from "@/lib/create/kcd-transaction-schema";
import { experienceScopeSchema, experienceSourceSchema, referenceAnalysisSchema, sitePlanSchema } from "./experience-engine";
const common = { id: z.string().uuid(), projectId: z.string().uuid(), createdAt: z.string().datetime(), model: z.string().min(1).max(120), usage: z.strictObject({ inputTokens: z.number().int().nonnegative(), outputTokens: z.number().int().nonnegative() }).optional() };
export const experienceProposalSchema = z.discriminatedUnion("kind", [
  z.strictObject({ ...common, kind: z.literal("reference"), label: z.string().min(1).max(120), excerpt: z.string().min(1).max(16000), analysis: referenceAnalysisSchema, reviewedFrom: z.string().uuid().optional() }),
  z.strictObject({ ...common, kind: z.literal("plan"), source: experienceSourceSchema, scope: experienceScopeSchema, analysisIds: z.array(z.string().uuid()).max(12), plan: sitePlanSchema, transaction: builderTransactionSchema }),
]).refine(item => item.kind !== "plan" || item.transaction.txId === item.id && item.transaction.origin === "ai", "A reviewed plan must retain its AI transaction identity.");
export type ExperienceProposal = z.infer<typeof experienceProposalSchema>;
export const experienceProposalResponseSchema = z.strictObject({ configured: z.boolean(), proposals: z.array(experienceProposalSchema).max(24) });
