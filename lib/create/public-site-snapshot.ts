import { websiteDefinitionSchema } from "./website-schema";
import { readKcdPublishedSnapshot } from "./kcd-published-snapshot";

export function decodePublicSnapshot(row: { project_id?: string; schema_version?: string | null; content_hash?: string | null; snapshot: unknown }) {
  if (row.schema_version === "kcd-1") {
    if (!row.content_hash) return null;
    const decoded = readKcdPublishedSnapshot(row.snapshot, row.content_hash);
    return decoded && decoded.nativeDocument.id === row.project_id ? decoded : null;
  }
  if (row.schema_version != null && row.schema_version !== "website-v1") return null;
  const parsed = websiteDefinitionSchema.safeParse(row.snapshot);
  return parsed.success ? { definition: parsed.data, nativeDocument: undefined } : null;
}
