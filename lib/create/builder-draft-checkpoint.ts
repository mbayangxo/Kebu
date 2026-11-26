import type { SiteChrome } from "./site-chrome";
import type { OfflineSaveBatchSectionsPayload, OfflineSaveChromePayload, OfflineSaveSectionPayload } from "./offline-queue";

/** Preserve the latest local draft, including an atomic Undo/Redo step, before leaving. */
export function builderDraftCheckpoint(input: {
  projectId: string;
  pending: ReadonlySet<string>;
  historyDirtyIds: Iterable<string>;
  sections: readonly { id: string; props: Record<string, unknown>; page_id?: string; section_type?: string; sort_order?: number }[];
  siteChrome: SiteChrome | null;
}): {
  sections: OfflineSaveSectionPayload[];
  chrome: OfflineSaveChromePayload[];
  history: OfflineSaveBatchSectionsPayload | null;
} {
  const ids = [...input.pending].filter(key => key.startsWith("section:")).map(key => key.slice("section:".length));
  const historyIds = new Set([...input.historyDirtyIds, ...ids]);
  const hasHistory = input.pending.has("history");
  const present = new Set(input.sections.map(section => section.id));
  const history = hasHistory ? {
    projectId: input.projectId,
    updates: input.sections.filter(section => historyIds.has(section.id)).map(section => ({
      id: section.id, props: section.props,
      ...(typeof section.sort_order === "number" ? { sort_order: section.sort_order } : {}),
      ...(section.page_id && section.section_type && typeof section.sort_order === "number"
        ? { restore: { page_id: section.page_id, section_type: section.section_type, sort_order: section.sort_order } } : {}),
    })),
    deletes: [...historyIds].filter(id => !present.has(id)),
  } : null;
  const chrome: OfflineSaveChromePayload[] = [];
  for (const part of ["header", "footer"] as const) {
    const props = input.siteChrome?.[part]?.props;
    if (input.pending.has(`chrome:${part}`) && props) chrome.push({ projectId: input.projectId, part, props });
  }
  return {
    sections: hasHistory ? [] : input.sections.filter(section => ids.includes(section.id)).map(section => ({ projectId: input.projectId, sectionId: section.id, props: section.props })),
    chrome,
    history: history && (history.updates.length > 0 || history.deletes.length > 0) ? history : null,
  };
}
