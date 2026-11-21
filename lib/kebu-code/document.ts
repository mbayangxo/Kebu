import { z } from "zod";

const revision = z.number().int().positive().max(2147483646);
const bytes = (value: string) => new TextEncoder().encode(value).length;
const plain = (value: string) => !/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value) && !/[\uD800-\uDFFF]/u.test(value);
export const documentContent = z.string().max(16000).refine(value => plain(value) && bytes(value) <= 24000);
export const referenceSchema = z.strictObject({
  name: z.string().min(1).max(120).regex(/\.(txt|md|csv)$/i).refine(plain),
  text: z.string().min(1).max(8000).refine(value => plain(value) && bytes(value) <= 8000),
});
export const documentRow = z.object({
  id: z.string().uuid(), title: z.string(), revision: revision, content: documentContent,
  history: z.array(z.object({ revision, content: documentContent })).max(8), updated_at: z.string(),
});
export type CodeDocument = z.infer<typeof documentRow>;
export type DocumentReference = z.infer<typeof referenceSchema>;
export const documentAction = z.discriminatedUnion("action", [
  z.strictObject({ action: z.literal("create"), title: z.string().trim().min(1).max(80).refine(plain) }),
  z.strictObject({ action: z.literal("save"), id: z.string().uuid(), base: revision, content: documentContent }),
  z.strictObject({ action: z.literal("restore"), id: z.string().uuid(), base: revision, target: revision }),
  z.strictObject({ action: z.literal("delete"), id: z.string().uuid(), base: revision }),
  z.strictObject({
    action: z.literal("draft"), id: z.string().uuid(), base: revision,
    brief: z.string().trim().min(1).max(3000).refine(plain),
    references: z.array(referenceSchema).max(2),
  }),
]);
export const documentDraft = z.strictObject({
  content: z.string().min(1).max(16000),
  missing: z.array(z.string().min(1).max(240)).max(8),
});
