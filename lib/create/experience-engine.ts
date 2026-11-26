import { z } from "zod";
import { buildIndex, canonicalStringify, compareOrder, evenlySpacedKeys, expectFor, isSpatialLocked, keysBetween, nodeA11ySchema, type KcdDocument, type NodeId, type PageId, type Op, type Transaction } from "@/lib/creative-core";
import { sectionPropsSchema, groupPropsSchema, textPropsSchema, imagePropsSchema, videoPropsSchema } from "@/lib/creative-core/primitives";
import { prepareBuilderTransaction } from "./kcd-write-boundary";
import type { BrandBrainRecord } from "./brand-brain";

const note = (max: number) => z.string().trim().min(1).max(max);
export const referenceInputSchema = z.strictObject({ kind: z.literal("reference"), label: note(120), excerpt: note(16000) });
export const referenceAnalysisSchema = z.strictObject({ version: z.literal(1), observations: z.array(z.strictObject({ evidence: note(600), observation: note(600), inference: z.boolean() })).min(1).max(12), uncertainties: z.array(note(500)).max(12) });
export type ReferenceAnalysis = z.infer<typeof referenceAnalysisSchema>;
export const referenceReviewInputSchema = z.strictObject({ kind: z.literal("review"), proposalId: z.string().uuid(), analysis: referenceAnalysisSchema });
export function validateReferenceAnalysis(input: unknown, excerpt: string): ReferenceAnalysis {
  const analysis = referenceAnalysisSchema.parse(input);
  if (analysis.observations.some(item => !excerpt.includes(item.evidence))) throw new Error("Every observation needs an exact quote from the supplied source.");
  return analysis;
}
export const experienceScopeSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("site"), replace: z.literal(true) }),
  z.strictObject({ kind: z.literal("page"), pageId: z.string().uuid(), replace: z.boolean() }),
  z.strictObject({ kind: z.literal("section"), nodeId: z.string().uuid(), replace: z.boolean() }),
]);
export type ExperienceScope = z.infer<typeof experienceScopeSchema>;
export const planInputSchema = z.strictObject({ kind: z.literal("plan"), scope: experienceScopeSchema, analysisIds: z.array(z.string().uuid()).max(12).refine(ids => new Set(ids).size === ids.length, "Select each reference once.") });
const placement = { parent: z.number().int().min(0).max(99).nullable(), rationale: note(400), a11y: nodeA11ySchema.optional() };
function overrides<T extends z.ZodType>(schema: T) { return z.strictObject({ tablet: schema.optional(), mobile: schema.optional() }).optional(); }
export const plannedNodeSchema = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("section"), ...placement, props: sectionPropsSchema, overrides: overrides(sectionPropsSchema) }),
  z.strictObject({ type: z.literal("group"), ...placement, props: groupPropsSchema, overrides: overrides(groupPropsSchema) }),
  z.strictObject({ type: z.literal("text"), ...placement, props: textPropsSchema, overrides: overrides(textPropsSchema.partial()) }),
  z.strictObject({ type: z.literal("image"), ...placement, props: imagePropsSchema, overrides: overrides(imagePropsSchema.partial()) }),
  z.strictObject({ type: z.literal("video"), ...placement, props: videoPropsSchema, overrides: overrides(videoPropsSchema.partial()) }),
]);
export const sitePlanSchema = z.strictObject({ version: z.literal(1), summary: note(1500), warnings: z.array(note(500)).max(12), pages: z.array(z.strictObject({ slug: note(60).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), title: note(120), purpose: note(1000), nodes: z.array(plannedNodeSchema).min(1).max(100) })).min(1).max(20) });
export type SitePlan = z.infer<typeof sitePlanSchema>;
export const experienceSourceSchema = z.strictObject({ dnaRevision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER), bindingRevision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER), profileId: z.string().uuid().nullable(), profileRevision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER), versions: z.record(z.string().uuid(), z.number().int().positive()) });
export type ExperienceSource = z.infer<typeof experienceSourceSchema>;
export function documentVersions(document: KcdDocument): Record<string, number> { return Object.fromEntries([...document.pages.map(page => [page.id, page.layoutVersion]), ...Object.values(document.nodes).map(node => [node.id, node.version])]); }
export const sameSource = (a: ExperienceSource, b: ExperienceSource) => canonicalStringify(a) === canonicalStringify(b);

export function scopePage(document: KcdDocument, scope: ExperienceScope): PageId | null {
  if (scope.kind === "site") return null;
  if (scope.kind === "page") {
    if (!document.pages.some(page => page.id === scope.pageId)) throw new Error("Choose an existing page.");
    return scope.pageId as PageId;
  }
  const node = document.nodes[scope.nodeId as NodeId];
  if (!node || node.type !== "section" || node.parentId !== null) throw new Error("Select an existing native section.");
  return node.pageId;
}
export function experienceScopeLocked(document: KcdDocument, scope: ExperienceScope): boolean {
  const pageId = scopePage(document, scope);
  if (scope.kind === "section" && isSpatialLocked(document, scope.nodeId as NodeId)) return true;
  if (!scope.replace) return false;
  const nodes = scope.kind === "section" ? buildIndex(document).subtree(scope.nodeId as NodeId) : Object.values(document.nodes).filter(node => scope.kind === "site" || node.pageId === pageId);
  return nodes.some(node => isSpatialLocked(document, node.id));
}

/** The model supplies content and preceding-parent indices, never permanent native identities. */
export function experiencePlanTransaction(document: KcdDocument, input: unknown, scopeInput: ExperienceScope, profile: BrandBrainRecord | null, txId = crypto.randomUUID()): Transaction {
  const scope = experienceScopeSchema.parse(scopeInput), plan = sitePlanSchema.parse(input);
  const focusedPage = scopePage(document, scope);
  if (document.meta.documentSchemaVersion !== "kcd-1") throw new Error("Open a native site before generating editable content.");
  if (experienceScopeLocked(document, scope)) throw new Error("Unlock content in this replacement scope first.");
  if (plan.pages.reduce((total, page) => total + page.nodes.length, 0) > 100) throw new Error("Choose a smaller plan: at most 100 elements per edit.");
  if (new Set(plan.pages.map(page => page.slug)).size !== plan.pages.length) throw new Error("Page addresses must be unique.");
  if (scope.kind === "site" && !plan.pages.some(page => page.slug === "home")) throw new Error("Keep a home page.");
  if (scope.kind !== "site") {
    const page = document.pages.find(page => page.id === focusedPage)!;
    if (plan.pages.length !== 1 || plan.pages[0].slug !== page.slug || plan.pages[0].title !== page.title) throw new Error("The plan must retain the selected page's address and title.");
    if (scope.kind === "section" && plan.pages[0].nodes.filter(node => node.parent === null).length !== 1) throw new Error("A section plan must contain exactly one root section.");
  }
  const assets = new Set<string>(), videos = new Set<string>(), links = new Set<string>();
  function collect(value: unknown, video = false) {
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      if (["src", "poster", "captionsSrc"].includes(key) && typeof child === "string" && child) { assets.add(child); if (video && key === "src") videos.add(child); }
      if (key === "href" && typeof child === "string" && child) links.add(child);
      if (child && typeof child === "object") collect(child, video);
    }
  }
  for (const node of Object.values(document.nodes)) { collect(node.props, node.type === "video"); collect(node.overrides, node.type === "video"); }
  for (const image of profile?.profile.brand.approvedImagery ?? []) assets.add(image.url);
  if (profile?.profile.brand.logoUrl) assets.add(profile.profile.brand.logoUrl);
  for (const slug of [...document.pages.map(page => page.slug), ...plan.pages.map(page => page.slug)]) { links.add(slug); links.add(`/${slug}`); }
  const palette = profile ? new Set([profile.profile.brand.primaryColor, profile.profile.brand.accentColor, profile.profile.brand.backgroundColor, profile.profile.brand.textColor].map(color => color.toLowerCase())) : null;
  function validateContent(value: unknown, type: string) {
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      if (key === "childOrder") throw new Error("Models cannot assign native child identities.");
      if (["src", "poster", "captionsSrc"].includes(key) && typeof child === "string" && child && (!assets.has(child) || type === "video" && key === "src" && !videos.has(child))) throw new Error("Use an approved existing media asset.");
      if (key === "href" && typeof child === "string" && child && !links.has(child)) throw new Error("Use a verified existing link or an actual site page.");
      if (["color", "background"].includes(key) && typeof child === "string" && palette && !palette.has(child.toLowerCase())) throw new Error("Use the attached brand palette.");
      if (child && typeof child === "object") validateContent(child, type);
    }
  }
  const ops: Op[] = [];
  const orderedPages = evenlySpacedKeys(plan.pages.length);
  const retained = new Set<PageId>();
  for (const [pageIndex, pagePlan] of plan.pages.entries()) {
    const existing = scope.kind === "site" ? document.pages.find(page => page.slug === pagePlan.slug) : document.pages.find(page => page.id === focusedPage);
    const pageId = existing?.id ?? crypto.randomUUID() as PageId;
    retained.add(pageId);
    if (!existing) ops.push({ op: "insertPage", page: { id: pageId, slug: pagePlan.slug, title: pagePlan.title, orderKey: orderedPages[pageIndex], deviceLayout: {} } });
    else if (scope.kind === "site") {
      if (existing.title !== pagePlan.title) ops.push({ op: "updatePage", pageId, title: pagePlan.title });
      if (existing.orderKey !== orderedPages[pageIndex]) ops.push({ op: "movePage", pageId, orderKey: orderedPages[pageIndex] });
    }
    const roots = Object.values(document.nodes).filter(node => node.pageId === pageId && node.parentId === null).sort(compareOrder);
    let before: string | null = roots.at(-1)?.orderKey ?? null, after: string | null = null;
    if (scope.kind === "section") {
      const position = roots.findIndex(node => node.id === scope.nodeId);
      before = scope.replace ? roots[position - 1]?.orderKey ?? null : roots[position].orderKey;
      after = roots[position + 1]?.orderKey ?? null;
      if (scope.replace) ops.push({ op: "removeNode", id: scope.nodeId as NodeId });
    } else if (scope.replace) {
      roots.forEach(node => ops.push({ op: "removeNode", id: node.id })); before = null;
    }
    const ids = pagePlan.nodes.map(() => crypto.randomUUID() as NodeId);
    const rootIndices = pagePlan.nodes.flatMap((node, i) => node.parent === null ? [i] : []);
    const rootKeys = keysBetween(before, after, rootIndices.length);
    const orderKeys = new Map<number, string>(rootIndices.map((index, i) => [index, rootKeys[i]]));
    for (let parent = 0; parent < pagePlan.nodes.length; parent++) {
      const children = pagePlan.nodes.flatMap((node, i) => node.parent === parent ? [i] : []);
      evenlySpacedKeys(children.length).forEach((key, i) => orderKeys.set(children[i], key));
    }
    for (const [index, node] of pagePlan.nodes.entries()) {
      if (node.parent !== null && node.parent >= index) throw new Error("Parents must appear before their children.");
      if (node.parent === null && node.type !== "section") throw new Error("Page roots must be native sections.");
      validateContent(node.props, node.type); validateContent(node.overrides, node.type);
      if (node.type === "image" && !node.a11y?.decorative && !node.a11y?.alt?.trim()) throw new Error("Give each informative image meaningful alternative text.");
      if (node.type === "video" && !node.a11y?.label?.trim()) throw new Error("Give each video an accessible label.");
      const motion = profile?.profile.motion;
      if (motion?.enabled && motion.interaction === "lift" && motion.maxDistance < 4) throw new Error("The profile's lift exceeds its distance limit.");
      ops.push({ op: "insertNode", pageId, parentId: node.parent === null ? null : ids[node.parent], orderKey: orderKeys.get(index)!, node: {
        id: ids[index], type: node.type, typeVersion: 1, props: node.props, overrides: node.overrides ?? {}, ...(node.a11y ? { a11y: node.a11y } : {}),
        ...(motion?.enabled ? { motion: { version: 1, preset: motion.entrance, trigger: "enter", duration: Math.min(500, motion.maxDuration), delay: 0, distance: Math.min(24, motion.maxDistance), easing: "ease-out", enabled: true }, ...(motion.interaction !== "none" ? { interaction: { version: 1, effect: motion.interaction, duration: Math.min(180, motion.maxDuration), easing: "ease-out" } } : {}) } : {}),
      } });
    }
  }
  if (scope.kind === "site") for (const page of document.pages) if (!retained.has(page.id)) ops.push({ op: "removePage", pageId: page.id });
  const tx: Transaction = { txId, origin: "ai", label: `Apply reviewed ${scope.kind} plan`, ops, expect: expectFor(document, ops) };
  const checked = prepareBuilderTransaction(document, tx);
  if (!checked.ok) throw new Error(checked.error.message);
  return checked.transaction;
}
