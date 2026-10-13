import { describe, expect, it, vi } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { benchmarkSourceHash } from "../../scripts/check-3j-gate.mjs";
vi.mock("server-only", () => ({}));
import { requestExperienceModel, experienceModelConfigured } from "@/lib/create/experience-model-gateway";
import { referenceAnalysisSchema, sitePlanSchema, validateReferenceAnalysis, experiencePlanTransaction } from "@/lib/create/experience-engine";
import { REFERENCE_ANALYSIS_INSTRUCTION, SITE_PLAN_INSTRUCTION } from "@/lib/create/experience-prompts";
import { compileExperienceDna } from "@/lib/create/experience-dna";
import { prepareBuilderTransaction } from "@/lib/create/kcd-write-boundary";
import { createKcdPublishedSnapshot } from "@/lib/create/kcd-published-snapshot";
import { document, profile, plan, images } from "./fixtures/3j-maylecor";
import { maylecorAboutMayBlocks } from "@/lib/create/maylecor-about-bio";
import { compileBrandBrain } from "@/lib/create/brand-brain";

describe.skipIf(process.env.KEBU_VERIFY_3J_PROVIDER !== "1")("3J actual May Lècor provider gate", () => {
  it("uses production prompts and real token usage with the supplied owner reference", async () => {
    expect(experienceModelConfigured(), "Missing server ANTHROPIC_API_KEY; explicit verification must fail, never substitute a fixture.").toBe(true);
    const excerpt = maylecorAboutMayBlocks().map(block => `${block.heading}\n${block.body}`).join("\n\n");
    const analysis = await requestExperienceModel(referenceAnalysisSchema, REFERENCE_ANALYSIS_INSTRUCTION, { label: "Supplied May Lècor biography", excerpt });
    validateReferenceAnalysis(analysis.output, excerpt);
    const initial = document(), brand = profile(), scope = { kind: "site" as const, replace: true as const };
    const direction = compileExperienceDna({ version: 1, goal: "Build an editable May Lècor artist portfolio", audience: "Music, dance and fashion audiences", visitorAction: "Explore the supplied biography and approved photos", experience: "Expressive editorial hierarchy with independently editable collage assets and readable phone layouts", references: [], pages: plan().pages.map(({ slug, title, purpose }) => ({ slug, title, purpose })) });
    const result = await requestExperienceModel(sitePlanSchema, SITE_PLAN_INSTRUCTION, { scope, direction, brandBrain: compileBrandBrain(brand.profile), current: initial, reviewedReferences: [{ label: "Supplied May Lècor biography", excerpt, analysis: analysis.output }], approvedImagery: images, constraints: "No invented prices, tracks, embeds, booking details or external destinations. Preserve full supplied biography and all five desired pages; explicitly warn about missing music/contact destinations." });
    expect(result.inputTokens).toBeGreaterThan(0); expect(result.outputTokens).toBeGreaterThan(0);
    expect(result.output.pages.map(page => page.slug)).toEqual(["home", "about", "music", "photos", "contact"]);
    const transaction = experiencePlanTransaction(initial, result.output, scope, brand);
    const prepared = prepareBuilderTransaction(initial, transaction);
    if (!prepared.ok) throw Error(prepared.error.message);
    const content = Object.values(prepared.prediction.document.nodes).filter(node => node.type === "text").map(node => String(node.props.text)).join("\n").replace(/\s+/g, " ");
    for (const block of maylecorAboutMayBlocks()) expect(content).toContain(block.body.replace(/\s+/g, " "));
    mkdirSync("evidence/3j/real-provider", { recursive: true });
    const outputHash = createHash("sha256").update(JSON.stringify(result.output)).digest("hex");
    writeFileSync("evidence/3j/real-provider/result.json", JSON.stringify({ provenance: "real-provider", sourceHash: benchmarkSourceHash(), outputHash, analysis, result, transaction, snapshot: createKcdPublishedSnapshot(prepared.prediction.document), manualQualitySignoff: "pending" }, null, 2));
  }, 180000);
});
