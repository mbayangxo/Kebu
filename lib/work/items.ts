import { z } from "zod";

export const workItemKindSchema = z.enum(["task", "event", "doc"]);
export type WorkItemKind = z.infer<typeof workItemKindSchema>;

export const workItemVisibilitySchema = z.enum(["private", "team"]);
export type WorkItemVisibility = z.infer<typeof workItemVisibilitySchema>;

const nullableDate = z.string().datetime().nullable().optional();

/**
 * No .default(...) here on purpose. zod's .default() survives .partial() —
 * an omitted key still resolves to the default during parsing, not to
 * undefined — so a schema built as base.partial() would silently
 * reintroduce every default field on every partial update. Confirmed live:
 * app/components/library/library-documents-panel.tsx's autosave PATCHes
 * only {id, body, expectedUpdatedAt}; with defaults on this shared base,
 * updateWorkItemSchema.safeParse(...) would still produce status:"open" in
 * parsed.data even though the caller never sent it, and the route's
 * `if (parsed.data.status !== undefined) patch.status = ...` guard would
 * then silently reset a "done"/"draft" document back to "open" on every
 * autosave. Defaults for creation are applied explicitly in the POST
 * handler instead (lib/work/items.ts callers), never via this shared shape.
 */
const workItemFields = {
  id: z.string().uuid().optional(),
  kind: workItemKindSchema,
  title: z.string().trim().min(1).max(160),
  body: z.string().max(20000),
  /**
   * TipTap/ProseMirror JSON document. Only meaningful for kind="doc"; validated
   * structurally (not just "is an object") by richDocumentSchema in rich-text.ts
   * at the point of use, not here — this field stays `unknown` so a partial
   * update schema doesn't reject a client sending nothing for it.
   */
  richContent: z.unknown().nullable().optional(),
  status: z.enum(["open", "done", "draft"]),
  dueAt: nullableDate,
  startAt: nullableDate,
  endAt: nullableDate,
  businessId: z.string().uuid().nullable().optional(),
  /** Only meaningful for business-scoped items; ignored by RLS for personal items. */
  visibility: workItemVisibilitySchema,
};

export const createWorkItemSchema = z.object(workItemFields).extend({
  body: workItemFields.body.default(""),
  status: workItemFields.status.default("open"),
  visibility: workItemFields.visibility.default("team"),
});

export const updateWorkItemSchema = z.object(workItemFields).partial().extend({
  id: z.string().uuid(),
  collabState: z.string().max(2_000_000).regex(/^[A-Za-z0-9+/]*={0,2}$/).optional(),
  expectedUpdatedAt: z.string().datetime({ offset: true }).optional(),
});

export type WorkItemRow = {
  id: string;
  owner_id: string;
  business_id: string | null;
  kind: WorkItemKind;
  title: string;
  body: string;
  rich_content: unknown | null;
  status: "open" | "done" | "draft";
  due_at: string | null;
  start_at: string | null;
  end_at: string | null;
  visibility: WorkItemVisibility;
  created_at: string;
  updated_at: string;
};
