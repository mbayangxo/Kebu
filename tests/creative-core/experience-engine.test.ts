import { describe, expect, it } from "vitest";
import { z } from "zod";
import { emptyDocument, PAGE_A, PAGE_B, node, uuidFor } from "./helpers";
import { documentVersions, experiencePlanTransaction, experienceScopeLocked, referenceAnalysisSchema, sameSource, sitePlanSchema, validateReferenceAnalysis } from "@/lib/create/experience-engine";
import { prepareBuilderTransaction } from "@/lib/create/kcd-write-boundary";
import { expectFor, type NodeId, type Transaction } from "@/lib/creative-core";
import { newBrandBrain } from "@/lib/create/brand-brain";
import { OperationCoordinator } from "@/lib/create/kcd-operation-coordinator";

const doc = () => { const value = emptyDocument(); value.meta.documentSchemaVersion = "kcd-1"; return value; };
export const nativePlan = () => ({ version: 1, summary: "An original editorial introduction", warnings: ["Supply verified business details before publishing"], pages: [{ slug: "home", title: "Home", purpose: "Introduce the work", nodes: [{ type: "section", parent: null, rationale: "Clear introductory hierarchy", props: { paddingY: "lg" } }, { type: "text", parent: 0, rationale: "Legible first message", props: { text: "Selected photography", variant: "heading", fontSize: 48 }, overrides: { mobile: { fontSize: 28 } }, a11y: { headingLevel: 1 } }] }] });
describe("Experience engine native contracts", () => {
  it("exports serializable provider schemas and grounded exact evidence", () => {
    expect(z.toJSONSchema(sitePlanSchema).type).toBe("object"); expect(z.toJSONSchema(referenceAnalysisSchema).type).toBe("object");
    const analysis = { version: 1, observations: [{ evidence: "Selected photography", observation: "The excerpt foregrounds photography", inference: false }], uncertainties: [] };
    expect(validateReferenceAnalysis(analysis, "Selected photography for artists")).toEqual(analysis);
    expect(() => validateReferenceAnalysis(analysis, "A different excerpt")).toThrow(/exact quote/);
    expect(referenceAnalysisSchema.safeParse({ ...analysis, version: 2 }).success).toBe(false);
  });
  it("assigns identities and preserves native hierarchy, device properties and exact history", () => {
    const document = doc(), tx = experiencePlanTransaction(document, nativePlan(), { kind: "page", pageId: PAGE_A, replace: false }, null);
    const applied = prepareBuilderTransaction(document, tx); expect(applied.ok).toBe(true); if (!applied.ok) throw Error(applied.error.message);
    const nodes = Object.values(applied.prediction.document.nodes), root = nodes.find(n => n.type === "section")!, text = nodes.find(n => n.type === "text")!;
    expect(text.parentId).toBe(root.id); expect(text.overrides.mobile).toEqual({ fontSize: 28 }); expect(tx.origin).toBe("ai");
    const undo = prepareBuilderTransaction(applied.prediction.document, { txId: crypto.randomUUID(), origin: "user", label: "Undo plan", ops: applied.prediction.inverse, expect: expectFor(applied.prediction.document, applied.prediction.inverse) });
    expect(undo.ok && Object.keys(undo.prediction.document.nodes)).toEqual([]);
  });
  it("rejects future/foreign types, invented identities and forward parents", () => {
    const plan = nativePlan(); expect(sitePlanSchema.safeParse({ ...plan, version: 2 }).success).toBe(false);
    expect(sitePlanSchema.safeParse({ ...plan, extra: true }).success).toBe(false);
    expect(sitePlanSchema.safeParse({ ...plan, pages: [{ ...plan.pages[0], nodes: [{ ...plan.pages[0].nodes[0], type: "legacy-section:hero" }] }] }).success).toBe(false);
    const forward = structuredClone(plan); forward.pages[0].nodes[1].parent = 1;
    expect(() => experiencePlanTransaction(doc(), forward, { kind: "site", replace: true }, null)).toThrow(/before/);
    const identities = structuredClone(plan); Object.assign(identities.pages[0].nodes[0].props, { childOrder: [uuidFor(9)] });
    expect(() => experiencePlanTransaction(doc(), identities, { kind: "site", replace: true }, null)).toThrow(/identities/);
  });
  it("rejects invented media and nested rich links; approves owned imagery with alternatives", () => {
    const document = doc(), profile = { id: uuidFor(7), revision: 1, profile: newBrandBrain() }; profile.profile.brand.approvedImagery = [{ url: "/approved.png" }];
    const plan = nativePlan(); Object.assign(plan.pages[0].nodes[1].props, { text: "Selected", runs: [{ text: "Selected", href: "https://invented.test" }] });
    expect(() => experiencePlanTransaction(document, plan, { kind: "site", replace: true }, profile)).toThrow(/verified/);
    const image = { ...nativePlan(), pages: [{ ...nativePlan().pages[0], nodes: [nativePlan().pages[0].nodes[0], { type: "image", parent: 0, rationale: "Approved work", props: { src: "/invented.png" }, a11y: { alt: "Selected work" } }] }] };
    expect(() => experiencePlanTransaction(document, image, { kind: "site", replace: true }, profile)).toThrow(/approved/);
    image.pages[0].nodes[1].props = { src: "/approved.png" }; expect(experiencePlanTransaction(document, image, { kind: "site", replace: true }, profile).ops).toHaveLength(2);
  });
  it("honors palette/motion bounds and protected replacement subtrees", () => {
    const document = doc(), root = uuidFor(21) as NodeId, child = uuidFor(22) as NodeId;
    document.nodes[root] = node({ id: root, type: "section", pageId: PAGE_A, orderKey: "V" }); document.nodes[child] = node({ id: child, type: "text", pageId: PAGE_A, orderKey: "V", parentId: root, props: { text: "Keep" }, locked: true });
    expect(experienceScopeLocked(document, { kind: "page", pageId: PAGE_A, replace: true })).toBe(true);
    expect(() => experiencePlanTransaction(document, nativePlan(), { kind: "section", nodeId: root, replace: true }, null)).toThrow(/Unlock/);
    const profile = { id: uuidFor(7), revision: 1, profile: newBrandBrain() }; profile.profile.motion.enabled = true; profile.profile.motion.maxDuration = 100; profile.profile.motion.maxDistance = 8;
    const tx = experiencePlanTransaction(doc(), nativePlan(), { kind: "site", replace: true }, profile), inserted = tx.ops.find(op => op.op === "insertNode"); expect(inserted?.op === "insertNode" && inserted.node.motion).toMatchObject({ duration: 100, distance: 8 });
    const badColor = nativePlan(); Object.assign(badColor.pages[0].nodes[1].props, { color: "#123456" }); expect(() => experiencePlanTransaction(doc(), badColor, { kind: "site", replace: true }, profile)).toThrow(/palette/);
  });
  it("reuses matching page identity and creates desired pages before removing obsolete ones", () => {
    const document = doc(); document.pages.push({ ...document.pages[0], id: PAGE_B, slug: "old", title: "Old", orderKey: "k" });
    const plan = nativePlan(); plan.pages.push({ ...nativePlan().pages[0], slug: "work", title: "Work" });
    const tx = experiencePlanTransaction(document, plan, { kind: "site", replace: true }, null), result = prepareBuilderTransaction(document, tx);
    expect(result.ok).toBe(true); if (!result.ok) throw Error(result.error.message);
    expect(result.prediction.document.pages.map(p => p.slug)).toEqual(["home", "work"]); expect(result.prediction.document.pages[0].id).toBe(PAGE_A);
    expect(() => experiencePlanTransaction(document, plan, { kind: "page", pageId: PAGE_A, replace: true }, null)).toThrow(/selected/);
  });
  it("retains exact AI transaction identity through uncertain retry and Undo/Redo", async () => {
    const document = doc(), tx = experiencePlanTransaction(document, nativePlan(), { kind: "site", replace: true }, null);
    let server = document, uncertain = true; const sent: Transaction[] = [];
    const coordinator = new OperationCoordinator(document, async candidate => { sent.push(candidate); if (uncertain) { uncertain = false; throw Error("Uncertain"); } const result = prepareBuilderTransaction(server, candidate); if (!result.ok) return result; server = result.prediction.document; return { ok: true, versions: result.prediction.versions, removed: result.prediction.removed, nodes: Object.values(server.nodes).filter(n => result.prediction.versions[n.id]), pages: server.pages.filter(p => result.prediction.versions[p.id]), removedPages: result.prediction.removedPages ?? [] }; });
    const completion = coordinator.submitReviewed(tx); await coordinator.flush(); expect(coordinator.status).toBe("queued"); await coordinator.flush(); await completion;
    expect(sent[0]).toEqual(sent[1]); expect(sent[0].txId).toBe(tx.txId); expect(coordinator.history.canUndo).toBe(true);
    await coordinator.travel("undo"); expect(Object.values(server.nodes)).toHaveLength(0); await coordinator.travel("redo"); expect(Object.values(server.nodes)).toHaveLength(2);
  });
  it("includes all page/node versions in source equality", () => {
    const document = doc(), source = { dnaRevision: 1, bindingRevision: 0, profileId: null, profileRevision: 0, versions: documentVersions(document) };
    expect(sameSource(source, structuredClone(source))).toBe(true); expect(sameSource(source, { ...source, dnaRevision: 2 })).toBe(false);
    document.nodes[uuidFor(9) as NodeId] = node({ id: uuidFor(9) as NodeId, type: "section", pageId: PAGE_A, orderKey: "V" }); expect(sameSource(source, { ...source, versions: documentVersions(document) })).toBe(false);
  });
});
