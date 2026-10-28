import { z } from "zod";

const required = (max: number) => z.string().trim().min(1).max(max);
const referenceUrl = required(500).refine(value => {
  if (!/^https:\/\/[^\s"'<>\\]+$/.test(value)) return false;
  try { const url = new URL(value); return Boolean(url.hostname) && !url.username && !url.password; } catch { return false; }
}, "Use an HTTPS reference address without credentials.");
export const experienceDnaSchema = z.strictObject({
  version: z.literal(1), goal: required(1500), audience: required(1500),
  visitorAction: required(500), experience: z.string().trim().max(1500),
  references: z.array(z.strictObject({ url: referenceUrl, label: required(120), observations: required(1500) })).max(12),
  pages: z.array(z.strictObject({ slug: required(60).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), title: required(120), purpose: required(1000) })).min(1).max(20),
}).superRefine((dna, context) => {
  if (!dna.pages.some(page => page.slug === "home")) context.addIssue({ code: "custom", path: ["pages"], message: "Keep a home page in the desired plan." });
  if (new Set(dna.pages.map(page => page.slug)).size !== dna.pages.length) context.addIssue({ code: "custom", path: ["pages"], message: "Desired page addresses must be unique." });
});
export type ExperienceDna = z.infer<typeof experienceDnaSchema>;
const revision = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
export const experienceRecordSchema = z.strictObject({ projectId: z.string().uuid(), revision, dna: experienceDnaSchema.nullable() })
  .refine(record => record.dna ? record.revision > 0 : record.revision === 0, "Incompatible direction revision.");
export type ExperienceRecord = z.infer<typeof experienceRecordSchema>;
export const experienceSaveSchema = z.strictObject({ expectedRevision: revision.max(Number.MAX_SAFE_INTEGER - 1), dna: experienceDnaSchema })
  .refine(value => new TextEncoder().encode(JSON.stringify(value)).byteLength <= 65536, "Site direction is too large. Shorten your notes before saving.");
export function newExperienceDna(): ExperienceDna {
  return { version: 1, goal: "", audience: "", visitorAction: "", experience: "", references: [], pages: [{ slug: "home", title: "Home", purpose: "" }] };
}
export function experienceRecordFromRow(projectId: string, row: { project_id: string; revision: number; dna: unknown } | null): ExperienceRecord {
  if (row && row.project_id !== projectId) throw new Error("Direction belongs to another site.");
  return experienceRecordSchema.parse({ projectId, revision: row?.revision ?? 0, dna: row?.dna ?? null });
}
/** URLs are source labels, not proof of retrieval; observations are explicitly owner-authored. */
export function compileExperienceDna(input: ExperienceDna) {
  const dna = experienceDnaSchema.parse(input);
  return { version: 1 as const, source: "owner-authored" as const, dna, references: dna.references.map(reference => ({ ...reference, provenance: "owner-observation" as const, retrieved: false as const })) };
}
