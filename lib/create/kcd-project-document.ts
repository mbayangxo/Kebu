import type { SupabaseClient } from "@supabase/supabase-js";
import type { KcdDocument, KcdNode, NodeId, Op, PageId } from "@/lib/creative-core";
import { liftStoredProps, rowsToDocument, type PageRow, type ProjectRow, type SectionRow } from "@/lib/create/kcd-adapter";
import { kcdNodeType } from "@/lib/create/kcd-adapter/sections";

const columns = "id,page_id,section_type,sort_order,props,parent_id,order_key,node_version,type_version";
const contentNames = new Set(["setProp", "unsetProp", "setOverride", "clearOverride", "setA11y", "setVisibility", "setLocked", "setMotion", "setInteraction", "setResponsiveState"]);

export function storageNode(row: SectionRow): KcdNode {
  const { fields } = liftStoredProps(row.props as Record<string, unknown>);
  return {
    id: row.id as NodeId, type: kcdNodeType(row.section_type, row.parent_id ?? null),
    typeVersion: row.type_version ?? 1, pageId: row.page_id as PageId,
    parentId: (row.parent_id ?? null) as NodeId | null, orderKey: row.order_key!,
    version: Number(row.node_version), ...fields,
  };
}

/** Content edits load addressed rows only; tree edits use the complete structural view. */
export async function loadKcdDocument(db: SupabaseClient, project: ProjectRow, ops?: readonly Op[]): Promise<KcdDocument> {
  const { data: pages, error: pageError } = await db.from("project_pages")
    .select("id,slug,title,sort_order,device_layouts,layout_version,order_key,kcd_unknown")
    .eq("project_id", project.id).order("sort_order", { ascending: true });
  if (pageError) throw new Error("Could not load document pages");
  const pageRows = (pages ?? []) as PageRow[];
  const pageIds = pageRows.map((p) => p.id);
  const contentOnly = ops?.every((op) => contentNames.has(op.op)) === true;
  let rows: SectionRow[] = [];
  if (pageIds.length) {
    let query = db.from("project_sections").select(columns).in("page_id", pageIds);
    if (contentOnly) query = query.in("id", [...new Set(ops!.flatMap((op) => "id" in op ? [op.id] : []))]);
    const { data, error } = await query;
    if (error) throw new Error("Could not load document elements");
    rows = (data ?? []) as SectionRow[];
  }
  if (!contentOnly) return rowsToDocument({ project, pages: pageRows, sections: rows }).document;
  const doc = rowsToDocument({ project, pages: pageRows, sections: [] }).document;
  for (const row of rows) doc.nodes[row.id as NodeId] = storageNode(row);
  return doc;
}

/** The authority response contains only touched rows, never a whole-document rewrite. */
export async function loadKcdChanges(db: SupabaseClient, projectId: string, versions: Record<string, number>) {
  const { data: ownedPages, error } = await db.from("project_pages").select("id").eq("project_id", projectId);
  if (error) throw new Error("Could not load saved pages");
  const pageIds = (ownedPages ?? []).map((p) => String(p.id));
  const ids = Object.keys(versions);
  if (!ids.length || !pageIds.length) return { nodes: [], pages: [] };
  const [sections, pages] = await Promise.all([
    db.from("project_sections").select(columns).in("page_id", pageIds).in("id", ids),
    db.from("project_pages").select("id,slug,title,sort_order,device_layouts,layout_version,order_key,kcd_unknown").eq("project_id", projectId).in("id", ids),
  ]);
  if (sections.error || pages.error) throw new Error("Could not load saved changes");
  const pageRows = (pages.data ?? []) as PageRow[];
  const pageDocument = pageRows.length ? rowsToDocument({ project: { id: projectId, title: "", document_schema_version: "kcd-1" }, pages: pageRows, sections: [] }).document : null;
  return { nodes: ((sections.data ?? []) as SectionRow[]).map(storageNode), pages: pageDocument?.pages ?? [] };
}
