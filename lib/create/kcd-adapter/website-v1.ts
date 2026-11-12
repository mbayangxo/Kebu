/**
 * website-v1 definitions ⇄ KcdDocument (3C freeze §10).
 *
 *   websiteV1ToDocument(def, { id })  templates, AI output, old snapshots → document. Ids are
 *                                     minted deterministically (ids.ts); UUID section ids are kept.
 *   documentToWebsiteV1(doc)          TEMPORARY bridge for code not yet on the core (AI improve,
 *                                     portfolio sync). Legacy-only documents: it refuses primitive
 *                                     or nested nodes rather than flatten them. Site chrome is
 *                                     project-level (projects.site_chrome) and not part of the
 *                                     definition — as in buildDefinitionFromProjectParts.
 */
import {
  KCD_SCHEMA_VERSION,
  buildIndex,
  evenlySpacedKeys,
  isUuid,
  legacySectionTypeOf,
  type KcdDocument,
  type KcdNode,
  type KcdPage,
  type NodeId,
} from "@/lib/creative-core";
import { AdapterError, type LiftIssue } from "./errors";
import { mintAnonymousSectionId, mintPageId, mintSectionId } from "./ids";
import {
  legacyBag,
  legacyOfDocument,
  legacyOfNode,
  legacyOfPage,
  liftLayouts,
  liftTheme,
  sameJson,
  shadowOf,
  toJson,
  writeLayouts,
  writeTheme,
  type LegacyDocumentData,
} from "./legacy";
import { selfCheck, type AdapterResult } from "./rows";
import { liftV1Section, writeV1Section } from "./sections";
import { isPlainObject } from "./stored-props";

const DEFINITION_KEYS = ["schemaVersion", "title", "theme", "seo", "pages"];
const PAGE_KEYS = ["slug", "title", "sections", "deviceLayouts"];

function extraKeys(value: Record<string, unknown>, known: readonly string[]): Record<string, unknown> | undefined {
  const extra = Object.entries(value).filter(([k]) => !known.includes(k));
  return extra.length ? Object.fromEntries(extra) : undefined;
}

function invalid(message: string): never {
  throw new AdapterError("invalid-input", message);
}

export function websiteV1ToDocument(definition: unknown, options: { id: string }): AdapterResult {
  const docId = options.id;
  if (typeof docId !== "string" || !docId) invalid("A document id is required");
  const def = toJson(definition, "Website definition");
  if (!isPlainObject(def)) invalid("Website definition must be an object");
  if (def.schemaVersion !== "website-v1") invalid(`Expected a website-v1 definition, got ${JSON.stringify(def.schemaVersion)}`);
  if (typeof def.title !== "string") invalid("title must be a string");
  if (!Array.isArray(def.pages)) invalid("pages must be an array");

  const issues: LiftIssue[] = [];
  const pages: KcdPage[] = [];
  const nodes: Record<NodeId, KcdNode> = {};
  const pageKeys = evenlySpacedKeys(def.pages.length);
  const slugs = new Set<string>();

  def.pages.forEach((rawPage: unknown, pageIndex: number) => {
    const where = `pages[${pageIndex}]`;
    if (!isPlainObject(rawPage)) invalid(`${where} must be an object`);
    const { slug, title, sections } = rawPage;
    if (typeof slug !== "string" || !slug) invalid(`${where}.slug must be a non-empty string`);
    if (typeof title !== "string") invalid(`${where}.title must be a string`);
    if (!Array.isArray(sections)) invalid(`${where}.sections must be an array`);
    if (slugs.has(slug)) throw new AdapterError("duplicate-id", `Duplicate page slug "${slug}"`);
    slugs.add(slug);
    const pageId = mintPageId(docId, slug);
    const keys = evenlySpacedKeys(sections.length);
    const legacyIds = new Map<string, string>();

    sections.forEach((rawSection: unknown, i: number) => {
      const at = `${where}.sections[${i}]`;
      if (!isPlainObject(rawSection)) invalid(`${at} must be an object`);
      const { id: legacyId, ...section } = rawSection;
      if (legacyId !== undefined && (typeof legacyId !== "string" || !legacyId)) invalid(`${at}.id must be a non-empty string`);
      const id = legacyId === undefined ? mintAnonymousSectionId(docId, slug, i) : isUuid(legacyId) ? (legacyId as NodeId) : mintSectionId(docId, legacyId);
      if (nodes[id] || (id as string) === pageId) throw new AdapterError("duplicate-id", `Duplicate section id ${JSON.stringify(legacyId ?? id)}`);
      if (typeof legacyId === "string") legacyIds.set(legacyId, id);

      const lifted = liftV1Section(section, at);
      for (const issue of lifted.issues) issues.push({ nodeId: id, ...issue });
      const unknown = legacyBag({
        id: typeof legacyId === "string" && legacyId !== id ? legacyId : undefined,
        anonymous: legacyId === undefined ? true : undefined,
        source: lifted.source,
      });
      nodes[id] = {
        id,
        type: lifted.type,
        typeVersion: 1,
        pageId,
        parentId: null,
        orderKey: keys[i],
        ...lifted.fields,
        version: 1,
        ...(unknown ? { unknown } : {}),
      };
    });

    const forward = (id: string) => legacyIds.get(id) ?? id;
    const roots = new Set(legacyIds.values());
    const layouts = shadowOf(rawPage, "deviceLayouts");
    const deviceLayout = liftLayouts(layouts.raw, forward, roots);
    const back = new Map([...legacyIds].map(([legacy, node]) => [node, legacy]));
    const probe: KcdPage = { id: pageId, slug, title, orderKey: pageKeys[pageIndex], deviceLayout, layoutVersion: 1 };
    const written = writeLayouts(probe, forward, (id) => back.get(id) ?? id, roots, "v1");
    const exact = sameJson(written.present ? { raw: written.value } : {}, layouts);
    const unknown = legacyBag({ layouts: exact ? undefined : layouts, extra: extraKeys(rawPage, PAGE_KEYS) });
    pages.push({ ...probe, ...(unknown ? { unknown } : {}) });
  });

  const theme = liftTheme(def, "theme");
  const extra = extraKeys(def, DEFINITION_KEYS);
  const legacy: LegacyDocumentData = {
    origin: "website-v1",
    ...(theme.shadow ? { theme: theme.shadow } : {}),
    ...(extra ? { extra } : {}),
  };
  const meta: Record<string, unknown> = { legacy };
  if ("seo" in def) meta.seo = def.seo;

  const document: KcdDocument = {
    schemaVersion: KCD_SCHEMA_VERSION,
    id: docId,
    kind: "site",
    title: def.title,
    tokens: theme.tokens,
    meta,
    pages,
    nodes,
  };
  return { document: selfCheck(document), issues };
}

// ── Document → website-v1 ─────────────────────────────────────────────────────

export function documentToWebsiteV1(doc: KcdDocument): Record<string, unknown> {
  for (const node of Object.values(doc.nodes)) {
    if (legacySectionTypeOf(node.type) === null) {
      throw new AdapterError("unsupported-node", `This page contains "${node.type}" elements, which website-v1 cannot represent`);
    }
    if (node.parentId !== null) throw new AdapterError("unsupported-node", `Nested element ${node.id} cannot be represented in website-v1`);
  }
  const legacy = legacyOfDocument(doc);
  const out: Record<string, unknown> = { ...(legacy?.extra ?? {}), schemaVersion: "website-v1", title: doc.title };
  const theme = writeTheme(doc);
  if (theme.present) out.theme = theme.value;
  if ("seo" in doc.meta) out.seo = doc.meta.seo;

  const index = buildIndex(doc);
  out.pages = doc.pages.map((page) => {
    const roots = index.children(page.id, null);
    const idOf = (node: KcdNode) => legacyOfNode(node).id ?? node.id;
    const forwardMap = new Map(roots.map((n) => [idOf(n), n.id as string]));
    const backMap = new Map(roots.map((n) => [n.id as string, idOf(n)]));
    const layouts = writeLayouts(
      page,
      (id) => forwardMap.get(id) ?? id,
      (id) => backMap.get(id) ?? id,
      new Set(roots.map((n) => n.id)),
      "v1",
    );
    const sections = roots.map((node) => {
      const section = writeV1Section(node);
      return legacyOfNode(node).anonymous ? section : { id: idOf(node), ...section };
    });
    const result: Record<string, unknown> = { ...(legacyOfPage(page).extra ?? {}), slug: page.slug, title: page.title, sections };
    if (layouts.present) result.deviceLayouts = layouts.value;
    return result;
  });
  return out;
}
