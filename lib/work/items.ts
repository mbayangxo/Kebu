import { z } from "zod";

export const workItemKindSchema = z.enum(["task", "event", "doc"]);
export type WorkItemKind = z.infer<typeof workItemKindSchema>;

const nullableDate = z.string().datetime().nullable().optional();

export const createWorkItemSchema = z.object({
  kind: workItemKindSchema,
  title: z.string().trim().min(1).max(160),
  body: z.string().max(20000).default(""),
  status: z.enum(["open", "done", "draft"]).default("open"),
  dueAt: nullableDate,
  startAt: nullableDate,
  endAt: nullableDate,
  businessId: z.string().uuid().nullable().optional(),
});

export const updateWorkItemSchema = createWorkItemSchema.partial().extend({
  id: z.string().uuid(),
});

export type WorkItemRow = {
  id: string;
  owner_id: string;
  business_id: string | null;
  kind: WorkItemKind;
  title: string;
  body: string;
  status: "open" | "done" | "draft";
  due_at: string | null;
  start_at: string | null;
  end_at: string | null;
  created_at: string;
  updated_at: string;
};
