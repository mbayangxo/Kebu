import type { SupabaseClient } from "@supabase/supabase-js";
import { TEMPLATE_SEEDS } from "./templates-seed";
import { validateWebsiteDefinition } from "./website-schema";

/** Ensure structured templates exist in DB (idempotent upsert by slug). */
export async function ensureTemplatesSeeded(supabase: SupabaseClient): Promise<void> {
  for (const seed of TEMPLATE_SEEDS) {
    const validated = validateWebsiteDefinition(seed.definition);
    if (!validated.ok) continue;

    const { data: existing } = await supabase
      .from("site_templates")
      .select("id")
      .eq("slug", seed.slug)
      .maybeSingle();

    let templateId = existing?.id as string | undefined;
    if (!templateId) {
      const { data: created, error } = await supabase
        .from("site_templates")
        .insert({
          slug: seed.slug,
          name: seed.name,
          category: seed.category,
          description: seed.description,
          is_active: true,
        })
        .select("id")
        .single();
      if (error || !created) continue;
      templateId = created.id;
    } else {
      await supabase
        .from("site_templates")
        .update({
          name: seed.name,
          category: seed.category,
          description: seed.description,
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", templateId);
    }

    const { data: ver } = await supabase
      .from("site_template_versions")
      .select("id")
      .eq("template_id", templateId)
      .eq("version", 1)
      .maybeSingle();

    if (!ver) {
      await supabase.from("site_template_versions").insert({
        template_id: templateId,
        version: 1,
        schema_version: "website-v1",
        definition: validated.data,
      });
    } else {
      await supabase
        .from("site_template_versions")
        .update({ definition: validated.data })
        .eq("id", ver.id);
    }
  }
}
