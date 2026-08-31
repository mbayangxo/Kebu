import type { SupabaseClient } from "@supabase/supabase-js";

export type CreateDbHealth = {
  ok: boolean;
  builderVersion: number | null;
  tables: Record<string, boolean>;
  billingReady: boolean;
  maylecorReady: boolean;
  legallyBlondeReady: boolean;
  seoReady: boolean;
  message: string;
  saveReady: boolean;
  publishReady: boolean;
};

const REQUIRED_TABLES = [
  "projects",
  "project_pages",
  "project_sections",
  "site_templates",
  "site_template_versions",
  "website_versions",
  "deployments",
] as const;

/** Probe Supabase tables required for website builder save/publish. */
export async function checkCreateDbHealth(supabase: SupabaseClient): Promise<CreateDbHealth> {
  const tables: Record<string, boolean> = {};

  for (const table of REQUIRED_TABLES) {
    const { error } = await supabase.from(table).select("id").limit(1);
    tables[table] = !error?.message?.includes("does not exist");
  }

  let builderVersion: number | null = null;
  const { data: metaRow } = await supabase
    .from("builder_schema_meta")
    .select("value")
    .eq("key", "website_builder_version")
    .maybeSingle();

  if (metaRow?.value) {
    const parsed = Number.parseInt(String(metaRow.value), 10);
    if (!Number.isNaN(parsed)) builderVersion = parsed;
  }

  let billingReady = false;
  const { error: billingProbe } = await supabase.from("site_subscriptions").select("id").limit(1);
  billingReady = !billingProbe?.message?.includes("does not exist");

  const coreOk =
    tables.projects &&
    tables.project_pages &&
    tables.project_sections &&
    tables.website_versions &&
    tables.deployments;

  const maylecorReady = builderVersion !== null && builderVersion >= 11;
  const legallyBlondeReady = builderVersion !== null && builderVersion >= 12;
  const seoReady = builderVersion !== null && builderVersion >= 13;
  const saveReady = Boolean(coreOk);
  const publishReady = Boolean(coreOk && billingReady);

  let message = "Website builder is connected — edits save to Supabase.";
  if (!saveReady) {
    message = "Database not ready. Apply migrations 004 + 008 on your Kebu Supabase project.";
  } else if (!maylecorReady) {
    message = "Saving works. Apply migration 011 for May Lecor / artist templates.";
  } else if (!legallyBlondeReady) {
    message = "Saving works. Apply migration 012 for Legally Blonde showcase template.";
  } else if (!seoReady) {
    message = "Saving works. Apply migration 013 for favicon + SEO settings.";
  } else if (!billingReady) {
    message = "Saving works. Apply migration 010 before publish + JOKO billing.";
  }

  return {
    ok: saveReady,
    builderVersion,
    tables,
    billingReady,
    maylecorReady,
    legallyBlondeReady,
    seoReady,
    saveReady,
    publishReady,
    message,
  };
}
