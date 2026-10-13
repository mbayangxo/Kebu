import { describe, expect, it, vi } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
import { experienceModelConfigured, requestExperienceModel } from "@/lib/create/experience-model-gateway";
import { referenceAnalysisSchema, sitePlanSchema, validateReferenceAnalysis, experiencePlanTransaction } from "@/lib/create/experience-engine";
import { REFERENCE_ANALYSIS_INSTRUCTION, SITE_PLAN_INSTRUCTION } from "@/lib/create/experience-prompts";
import { emptyDocument } from "./helpers";
import { compileExperienceDna } from "@/lib/create/experience-dna";
describe.skipIf(process.env.KEBU_VERIFY_EXPERIENCE_PROVIDER !== "1")("Explicit real-provider experience verification", () => {
  it("produces grounded evidence and valid original native content using production prompts", async () => {
    expect(experienceModelConfigured(), "Configure ANTHROPIC_API_KEY securely in the server environment before this explicit check.").toBe(true);
    const excerpt = "Kebu: Build for everyone. Empower Africans with more. Kebu helps people build and operate websites.";
    const analysis = await requestExperienceModel(referenceAnalysisSchema, REFERENCE_ANALYSIS_INSTRUCTION, { label: "Kebu statement", excerpt }); validateReferenceAnalysis(analysis.output, excerpt);
    const document = emptyDocument(); document.meta.documentSchemaVersion = "kcd-1";
    const scope = { kind: "site" as const, replace: true as const }, dna = { version: 1 as const, goal: "Explain website creation", audience: "People building their first website", visitorAction: "Understand the product", experience: "Clear confident editorial typography", references: [], pages: [{ slug: "home", title: "Home", purpose: "Explain the statement without invented prices or claims" }] };
    const result = await requestExperienceModel(sitePlanSchema, SITE_PLAN_INSTRUCTION, { scope, direction: compileExperienceDna(dna), brandBrain: null, current: document, reviewedReferences: [{ label: "Kebu statement", excerpt, analysis: analysis.output }] });
    const transaction = experiencePlanTransaction(document, result.output, scope, null); expect(result.inputTokens).toBeGreaterThan(0); expect(result.outputTokens).toBeGreaterThan(0); expect(transaction.origin).toBe("ai");
    mkdirSync("evidence/3i/engine/real-provider", { recursive: true }); writeFileSync("evidence/3i/engine/real-provider/result.json", JSON.stringify({ analysis, result, transaction }, null, 2));
  }, 100000);
});
