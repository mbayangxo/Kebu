import { NextResponse } from "next/server";

/** Old whole-section mutations must not bypass KCD's expected-version transaction boundary. */
export function rejectLegacySectionWrite(project: unknown): NextResponse | null {
  return project !== null && typeof project === "object" && "document_schema_version" in project && project.document_schema_version === "kcd-1"
    ? NextResponse.json({ error: "This draft uses operation editing. Reload the Builder before changing sections." }, { status: 409 })
    : null;
}

/** Shared helpers also run outside their guarded HTTP routes (owner portfolio bootstrapping). */
export async function legacyProjectWriteBlocker(
  db: import("@supabase/supabase-js").SupabaseClient,
  projectId: string,
): Promise<string | null> {
  const { data, error } = await db.from("projects").select("document_schema_version").eq("id", projectId).maybeSingle();
  if (error) return "Could not verify this draft's editing mode. No legacy changes were applied.";
  if (!data) return "Project not found.";
  return data.document_schema_version === "kcd-1"
    ? "This draft uses operation editing. Legacy page and section replacement is blocked."
    : null;
}
