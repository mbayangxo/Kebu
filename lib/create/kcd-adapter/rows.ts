/**
 * Stored 3B rows ⇄ KcdDocument (3C freeze §10).
 *
 *   rowsToDocument(rows)   projects + project_pages + project_sections → document. Replaces the
 *                          internals of buildDefinitionFromProjectParts: reserved keys lifted,
 *                          site chrome projected onto pages, device_layouts → page.deviceLayout.
 *   documentToRows(doc)    the inverse: exactly the stored rows for an unchanged document.
 *
 * Row ids are the node/page ids (UUIDs). Order: sort_order ascending, ties in input order
 * (as 3B sorts), mapped to evenly spaced order keys. Sections are page roots; nesting arrives
 * with the S4 storage columns.
 */
import {
  KCD_SCHEMA_VERSION,
  buildIndex,
  evenlySpacedKeys,
  parseDocument,
  documentToJson,
  isValidOrderKey,
  legacySectionTypeOf,
  type KcdDocument,
  type KcdNode,
  type KcdPage,
  type NodeId,
  type PageId,
} from "@/lib/creative-core";
import { CHROME_FOOTER_ID, CHROME_HEADER_ID } from "@/lib/create/site-chrome";
import { chromeFor } from "./chrome";
import { AdapterError, type LiftIssue } from "./errors";
import {
  assertNodeId,
  bySortOrder,
  isDense,
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
  writeSortOrders,
  writeTheme,
  type LegacyDocumentData,
} from "./legacy";
import { kcdNodeType, liftRowSection, storageSectionType, writeRowProps } from "./sections";
import { isPlainObject } from "./stored-props";

export interface ProjectRow {
  id: string;
  title: string;
  theme?: unknown;
  seo?: unknown;
  site_chrome?: unknown;
  /** 3C S4: 'kcd-1' = opted in (structure from the storage columns); null/absent = 3B path. */
  document_schema_version?: string | null;
}
export interface PageRow {
  id: string;
  slug: string;
  title: string;
  sort_order: number;
  device_layouts?: unknown;
  /** 3C S4 storage column. */
  layout_version?: number;
  order_key?: string | null;
  kcd_unknown?: Record<string, unknown> | null;
}
export interface SectionRow {
  id: string;
  page_id: string;
  section_type: string;
  sort_order: number;
  props: unknown;
  /** 3C S4 storage columns (present once the KCD migration is applied). */
  parent_id?: string | null;
  order_key?: string;
  node_version?: number;
  type_version?: number;
}
export interface ProjectRows {
  project: ProjectRow;
  pages: PageRow[];
  sections: SectionRow[];
}

export interface AdapterResult {
  document: KcdDocument;
  /** Stored values kept verbatim that do not take effect through the model (see errors.ts). */
  issues: LiftIssue[];
}

function checkRow(ok: boolean, message: string): void {
  if (!ok) throw new AdapterError("invalid-input", message);
}

/** Validate the document the adapter built and return the canonical parsed copy. */
export function selfCheck(doc: KcdDocument): KcdDocument {
  const parsed = parseDocument(documentToJson(doc));
  if (!parsed.ok) {
    const first = parsed.issues[0];
    throw new AdapterError("invalid-input", `Converted document is invalid at ${first.path}: ${first.message}`);
  }
  return parsed.document;
}

export function rowsToDocument(input: ProjectRows): AdapterResult {
  const { project, pages: pageRows, sections: sectionRows } = toJson(input, "Project rows");
  const kcd = isPlainObject(project) && project.document_schema_version === "kcd-1";
  const storage = sectionRows.some((s) => isPlainObject(s) && "node_version" in s) || pageRows.some((p) => isPlainObject(p) && "layout_version" in p);
  checkRow(isPlainObject(project) && typeof project.id === "string" && project.id !== "", "project.id must be a non-empty string");
  checkRow(typeof project.title === "string", "project.title must be a string");
  checkRow(Array.isArray(pageRows) && Array.isArray(sectionRows), "pages and sections must be arrays");

  const issues: LiftIssue[] = [];
  const pageIds = new Set<string>();
  for (const [i, p] of pageRows.entries()) {
    checkRow(isPlainObject(p), `pages[${i}] must be an object`);
    assertNodeId(p.id, `pages[${i}]`);
    if (pageIds.has(p.id)) throw new AdapterError("duplicate-id", `Duplicate page id ${p.id}`);
    pageIds.add(p.id);
    checkRow(typeof p.slug === "string" && p.slug !== "", `pages[${i}].slug must be a non-empty string`);
    checkRow(typeof p.title === "string", `pages[${i}].title must be a string`);
    checkRow(typeof p.sort_order === "number" && Number.isFinite(p.sort_order), `pages[${i}].sort_order must be a number`);
  }
  const sectionIds = new Set<string>();
  for (const [i, s] of sectionRows.entries()) {
    checkRow(isPlainObject(s), `sections[${i}] must be an object`);
    assertNodeId(s.id, `sections[${i}]`);
    if (sectionIds.has(s.id) || pageIds.has(s.id)) throw new AdapterError("duplicate-id", `Duplicate id ${s.id}`);
    sectionIds.add(s.id);
    if (!pageIds.has(s.page_id)) throw new AdapterError("orphan-section", `Section ${s.id} belongs to unknown page ${JSON.stringify(s.page_id)}`);
    checkRow(typeof s.sort_order === "number" && Number.isFinite(s.sort_order), `sections[${i}].sort_order must be a number`);
    if (!kcd && s.parent_id != null) {
      throw new AdapterError("unsupported-node", `Section ${s.id} is nested, but the project is not on the KCD storage path`);
    }
  }

  const chromeRaw = shadowOf(project as unknown as Record<string, unknown>, "site_chrome");
  if ("raw" in chromeRaw && chromeFor(chromeRaw.raw, sectionRows.map((s) => s.section_type)).conflict) {
    issues.push({
      field: "site_chrome",
      message:
        "The site header/footer is enabled, but this site's layout has its own navigation. The editor shows no site header/footer; publishing with Kebu's current publisher would add them. Resolve before publishing.",
    });
  }
  if (kcd) return kcdRowsToDocument(project, pageRows, sectionRows, issues, storage);

  const docId = project.id;
  const orderedPages = bySortOrder(pageRows);
  const pageKeys = evenlySpacedKeys(orderedPages.length);
  const densePages = isDense(orderedPages.map((p) => p.sort_order));
  const pages: KcdPage[] = [];
  const nodes: Record<NodeId, KcdNode> = {};

  const rowsByPage = new Map<string, SectionRow[]>();
  for (const s of sectionRows) {
    const list = rowsByPage.get(s.page_id);
    if (list) list.push(s);
    else rowsByPage.set(s.page_id, [s]);
  }

  orderedPages.forEach((row, pageIndex) => {
    const pageId = row.id as PageId;
    const body = bySortOrder(rowsByPage.get(row.id) ?? []);
    const denseBody = isDense(body.map((s) => s.sort_order));
    const keys = evenlySpacedKeys(body.length);

    body.forEach((s, i) => {
      const lifted = liftRowSection(s.section_type, s.props, `Section ${s.id}`);
      for (const issue of lifted.issues) issues.push({ nodeId: s.id, ...issue });
      const unknown = legacyBag({ source: lifted.source, sortOrder: denseBody ? undefined : s.sort_order });
      nodes[s.id as NodeId] = {
        id: s.id as NodeId,
        type: lifted.type,
        typeVersion: 1,
        pageId,
        parentId: null,
        orderKey: keys[i],
        ...lifted.fields,
        version: s.node_version ?? 1,
        ...(unknown ? { unknown } : {}),
      };
      if (s.type_version !== undefined) nodes[s.id as NodeId].typeVersion = s.type_version;
    });

    // Chrome ids name the projected header/footer (chrome.ts) — they are live ids too.
    const roots = new Set<string>([...body.map((s) => s.id), CHROME_HEADER_ID, CHROME_FOOTER_ID]);
    const same = (id: string) => id;
    const layouts = shadowOf(row as unknown as Record<string, unknown>, "device_layouts");
    const deviceLayout = liftLayouts(layouts.raw, same, roots);
    const layoutsExact = sameJson(repackForCompare(deviceLayout), layouts);
    const unknown = legacyBag({ layouts: layoutsExact ? undefined : layouts, sortOrder: densePages ? undefined : row.sort_order });
    pages.push({
      id: pageId,
      slug: row.slug,
      title: row.title,
      orderKey: pageKeys[pageIndex],
      deviceLayout,
      layoutVersion: row.layout_version ?? 1,
      ...(unknown ? { unknown } : {}),
    });
  });

  const theme = liftTheme(project as unknown as Record<string, unknown>, "theme");
  const legacy: LegacyDocumentData = { origin: "3b-rows", ...(theme.shadow ? { theme: theme.shadow } : {}), ...(storage ? { storage: true } : {}) };
  const meta: Record<string, unknown> = { legacy };
  if ("seo" in project) meta.seo = project.seo;
  if ("raw" in chromeRaw) meta.siteChrome = chromeRaw.raw;
  if ("document_schema_version" in project) meta.documentSchemaVersion = project.document_schema_version;

  const document: KcdDocument = {
    schemaVersion: KCD_SCHEMA_VERSION,
    id: docId,
    kind: "site",
    title: project.title,
    tokens: theme.tokens,
    meta,
    pages,
    nodes,
  };
  return { document: selfCheck(document), issues };
}

/** The stored device_layouts value `writeLayouts` would produce without a shadow, as a Shadow. */
function repackForCompare(layout: KcdPage["deviceLayout"]): { raw?: unknown } {
  const probe: KcdPage = { id: "" as PageId, slug: "", title: "", orderKey: "", deviceLayout: layout, layoutVersion: 1 };
  const written = writeLayouts(probe, (id) => id, (id) => id, new Set(), "rows");
  return written.present ? { raw: written.value } : {};
}

// ── Document → rows ───────────────────────────────────────────────────────────

export function documentToRows(doc: KcdDocument): ProjectRows {
  if (doc.meta.documentSchemaVersion === "kcd-1") return kcdDocumentToRows(doc);
  const storage = legacyOfDocument(doc)?.storage === true;
  for (const node of Object.values(doc.nodes)) {
    if (legacySectionTypeOf(node.type) === null) {
      throw new AdapterError("unsupported-node", `"${node.type}" nodes cannot be stored as 3B rows`);
    }
    if (node.parentId !== null) throw new AdapterError("unsupported-node", `Nested node ${node.id} cannot be stored as a 3B row`);
  }

  const project: ProjectRow = { id: doc.id, title: doc.title };
  const theme = writeTheme(doc);
  if (theme.present) project.theme = theme.value;
  if ("seo" in doc.meta) project.seo = doc.meta.seo;
  if ("siteChrome" in doc.meta) project.site_chrome = doc.meta.siteChrome;
  if ("documentSchemaVersion" in doc.meta) project.document_schema_version = doc.meta.documentSchemaVersion as string | null;

  const pageSortOrders = writeSortOrders(doc.pages.map((p) => legacyOfPage(p).sortOrder));
  const pages: PageRow[] = [];
  const sections: SectionRow[] = [];
  const index = buildIndex(doc);
  doc.pages.forEach((page, i) => {
    const pageRoots = index.children(page.id, null);
    const roots = new Set<string>([...pageRoots.map((n) => n.id), CHROME_HEADER_ID, CHROME_FOOTER_ID]);
    const layouts = writeLayouts(page, (id) => id, (id) => id, roots, "rows");
    const row: PageRow = { id: page.id, slug: page.slug, title: page.title, sort_order: pageSortOrders[i] };
    if (layouts.present) row.device_layouts = layouts.value;
    if (storage) row.layout_version = page.layoutVersion;
    pages.push(row);

    const sortOrders = writeSortOrders(pageRoots.map((n) => legacyOfNode(n).sortOrder));
    pageRoots.forEach((node, j) => {
      const section: SectionRow = {
        id: node.id,
        page_id: page.id,
        section_type: legacySectionTypeOf(node.type)!,
        sort_order: sortOrders[j],
        props: writeRowProps(node),
      };
      // On the 3B path order_key / parent_id are database-owned; versions are the model's.
      if (storage) Object.assign(section, { node_version: node.version, type_version: node.typeVersion });
      sections.push(section);
    });
  });
  return { project, pages, sections };
}

// ── KCD storage path (3C S4: document_schema_version = 'kcd-1') ────────────────

/**
 * Opted-in projects: structure comes from the storage columns — parent_id, order_key (authoritative),
 * node_version, type_version; pages keep sort_order + layout_version. sort_order of sections is
 * derived storage (dense for page roots in KCD order, 0 when nested), kept by apply_node_ops;
 * a stored value that disagrees is reported, and written back derived.
 */
function kcdRowsToDocument(
  project: ProjectRow,
  pageRows: PageRow[],
  sectionRows: SectionRow[],
  issues: LiftIssue[],
  storage: boolean,
): AdapterResult {
  if (!storage) throw new AdapterError("invalid-input", "An opted-in project needs the KCD storage columns");
  const nodes: Record<NodeId, KcdNode> = {};
  for (const s of sectionRows) {
    if (!isValidOrderKey(s.order_key)) throw new AdapterError("invalid-input", `Section ${s.id} has an invalid order key`);
    if (s.parent_id != null) assertNodeId(s.parent_id, `Section ${s.id} parent`);
    const parentId = (s.parent_id ?? null) as NodeId | null;
    const type = kcdNodeType(s.section_type, parentId);
    const lifted = liftRowSection(s.section_type, s.props, `Section ${s.id}`, type);
    for (const issue of lifted.issues) issues.push({ nodeId: s.id, ...issue });
    const unknown = legacyBag({ source: lifted.source });
    nodes[s.id as NodeId] = {
      id: s.id as NodeId,
      type,
      typeVersion: s.type_version ?? 1,
      pageId: s.page_id as PageId,
      parentId,
      orderKey: s.order_key!,
      ...lifted.fields,
      version: s.node_version ?? 1,
      ...(unknown ? { unknown } : {}),
    };
  }
  const orderedPages = bySortOrder(pageRows);
  const pageKeys = evenlySpacedKeys(orderedPages.length);
  const densePages = isDense(orderedPages.map((p) => p.sort_order));
  const pages: KcdPage[] = orderedPages.map((row, i) => {
    const roots = new Set<string>([...sectionRows.filter((s) => s.page_id === row.id && s.parent_id == null).map((s) => s.id), CHROME_HEADER_ID, CHROME_FOOTER_ID]);
    const layouts = shadowOf(row as unknown as Record<string, unknown>, "device_layouts");
    const deviceLayout = liftLayouts(layouts.raw, (id) => id, roots);
    const exact = sameJson(repackForCompare(deviceLayout), layouts);
    const unknown = legacyBag({ layouts: exact ? undefined : layouts, sortOrder: densePages ? undefined : row.sort_order });
    return {
      id: row.id as PageId,
      slug: row.slug,
      title: row.title,
      orderKey: row.order_key ?? pageKeys[i],
      deviceLayout,
      layoutVersion: row.layout_version ?? 1,
      ...((row.kcd_unknown || unknown) ? { unknown: { ...row.kcd_unknown, ...unknown } } : {}),
    };
  });
  const theme = liftTheme(project as unknown as Record<string, unknown>, "theme");
  const legacy: LegacyDocumentData = { origin: "3b-rows", storage: true, ...(theme.shadow ? { theme: theme.shadow } : {}) };
  const meta: Record<string, unknown> = { legacy, documentSchemaVersion: "kcd-1" };
  if ("seo" in project) meta.seo = project.seo;
  if ("site_chrome" in project && project.site_chrome !== undefined) meta.siteChrome = project.site_chrome;
  const document = selfCheck({
    schemaVersion: KCD_SCHEMA_VERSION,
    id: project.id,
    kind: "site",
    title: project.title,
    tokens: theme.tokens,
    meta,
    pages,
    nodes,
  });
  const derived = derivedSortOrders(document);
  for (const s of sectionRows) {
    if (derived.get(s.id) !== s.sort_order) issues.push({ nodeId: s.id, field: "sort_order", message: "Stored position is out of date; derived from the KCD order" });
  }
  return { document, issues };
}

/** Section sort_order as apply_node_ops keeps it: dense page-root order, 0 for nested elements. */
function derivedSortOrders(doc: KcdDocument): Map<string, number> {
  const index = buildIndex(doc);
  const out = new Map<string, number>();
  for (const node of Object.values(doc.nodes)) if (node.parentId !== null) out.set(node.id, 0);
  for (const page of doc.pages) index.children(page.id, null).forEach((n, i) => out.set(n.id, i));
  return out;
}

function kcdDocumentToRows(doc: KcdDocument): ProjectRows {
  const project: ProjectRow = { id: doc.id, title: doc.title, document_schema_version: "kcd-1" };
  const theme = writeTheme(doc);
  if (theme.present) project.theme = theme.value;
  if ("seo" in doc.meta) project.seo = doc.meta.seo;
  if ("siteChrome" in doc.meta) project.site_chrome = doc.meta.siteChrome;
  const index = buildIndex(doc);
  const derived = derivedSortOrders(doc);
  const pageSortOrders = writeSortOrders(doc.pages.map((p) => legacyOfPage(p).sortOrder));
  const pages: PageRow[] = doc.pages.map((page, i) => {
    const roots = new Set<string>([...index.children(page.id, null).map((n) => n.id), CHROME_HEADER_ID, CHROME_FOOTER_ID]);
    const layouts = writeLayouts(page, (id) => id, (id) => id, roots, "rows");
    const row: PageRow = { id: page.id, slug: page.slug, title: page.title, sort_order: pageSortOrders[i], layout_version: page.layoutVersion, order_key: page.orderKey };
    if (layouts.present) row.device_layouts = layouts.value;
    const foreign = { ...page.unknown };
    delete foreign.legacy;
    if (Object.keys(foreign).length) row.kcd_unknown = foreign;
    return row;
  });
  const sections: SectionRow[] = [];
  for (const page of doc.pages) {
    for (const top of index.children(page.id, null)) {
      for (const node of index.subtree(top.id)) {
        sections.push({
          id: node.id,
          page_id: node.pageId,
          section_type: storageSectionType(node.type),
          sort_order: derived.get(node.id)!,
          props: writeRowProps(node),
          parent_id: node.parentId,
          order_key: node.orderKey,
          node_version: node.version,
          type_version: node.typeVersion,
        });
      }
    }
  }
  return { project, pages, sections };
}
