import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadKcdDocument } from "./kcd-project-document";
import { experienceRecordFromRow } from "./experience-dna";
import { bindingFromRow } from "./brand-brain-binding";
import { BRAND_BRAIN_SELECT, brandBrainFromRow, type BrandBrainRecord } from "./brand-brain";
import { documentVersions, experienceSourceSchema } from "./experience-engine";
import type { ProjectRow } from "./kcd-adapter";
export class ExperienceContextError extends Error { constructor(message: string, readonly status: number) { super(message); } }
export async function loadExperienceContext(db: SupabaseClient, projectId: string, ownerId: string) {
  const project = await db.from("projects").select("id,title,theme,seo,site_chrome,document_schema_version").eq("id", projectId).eq("owner_id", ownerId).maybeSingle();
  if (project.error || !project.data) throw new ExperienceContextError("Could not load this site. Retry.", 503);
  if (project.data.document_schema_version !== "kcd-1") throw new ExperienceContextError("Open a native site before generating editable content.", 409);
  const [dna, attached] = await Promise.all([
    db.from("project_experience_dna").select("project_id,revision,dna").eq("project_id", projectId).eq("owner_id", ownerId).maybeSingle(),
    db.from("project_brand_brains").select("profile_id,revision").eq("project_id", projectId).eq("owner_id", ownerId).maybeSingle(),
  ]);
  if (dna.error || attached.error) throw new ExperienceContextError("Could not load saved direction. Retry.", 503);
  const record = experienceRecordFromRow(projectId, dna.data), binding = bindingFromRow(projectId, attached.data);
  if (!record.dna) throw new ExperienceContextError("Save Site direction before generating a plan.", 409);
  let profile: BrandBrainRecord | null = null;
  if (binding.profileId) {
    const selected = await db.from("business_brand_kits").select(BRAND_BRAIN_SELECT).eq("id", binding.profileId).eq("owner_id", ownerId).maybeSingle();
    if (selected.error) throw new ExperienceContextError("Could not load the attached profile. Retry.", 503);
    try { profile = brandBrainFromRow(selected.data as Record<string, unknown>); }
    catch { throw new ExperienceContextError("Review or detach the unavailable Brand Brain profile before generating.", 409); }
  }
  const document = await loadKcdDocument(db, project.data as ProjectRow);
  const source = experienceSourceSchema.parse({ dnaRevision: record.revision, bindingRevision: binding.revision, profileId: binding.profileId, profileRevision: profile?.revision ?? 0, versions: documentVersions(document) });
  return { document, record, binding, profile, source };
}
