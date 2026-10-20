import type { KcdDocument, NodeId } from "@/lib/creative-core";
import { documentToRows, type ProjectRows, type SectionRow } from "@/lib/create/kcd-adapter";
import { writeRowProps } from "@/lib/create/kcd-adapter/sections";

export type BuilderRows = Omit<ProjectRows, "sections"> & { sections: Array<SectionRow & { props: Record<string, unknown> }> };

/** Full projection is a load/structure boundary, never a per-keystroke serialization boundary. */
export function initialBuilderRows(document: KcdDocument): BuilderRows {
  const rows = documentToRows(document);
  return { ...rows, sections: rows.sections.map((row) => ({ ...row, props: writeRowProps(document.nodes[row.id as NodeId]) })) };
}

export function projectBuilderEdit(before: KcdDocument, after: KcdDocument, rows: BuilderRows): BuilderRows {
  if (before === after) return rows;
  if (before.meta !== after.meta || before.tokens !== after.tokens || before.pages.length !== after.pages.length
      || after.pages.some((page, index) => page !== before.pages[index])) return initialBuilderRows(after);
  const oldIds = Object.keys(before.nodes); const ids = Object.keys(after.nodes);
  if (oldIds.length !== ids.length || ids.some((id) => {
    const oldNode = before.nodes[id as NodeId]; const node = after.nodes[id as NodeId];
    return !oldNode || node.pageId !== oldNode.pageId || node.parentId !== oldNode.parentId || node.orderKey !== oldNode.orderKey || node.type !== oldNode.type;
  })) return initialBuilderRows(after);
  return { ...rows, sections: rows.sections.map((row) => {
    const node = after.nodes[row.id as NodeId];
    return node === before.nodes[row.id as NodeId] ? row : { ...row, props: writeRowProps(node), node_version: node.version, type_version: node.typeVersion };
  }) };
}
