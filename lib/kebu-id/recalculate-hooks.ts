import type { SupabaseClient } from "@supabase/supabase-js";
import { recalculateAndStoreReadiness } from "@/lib/kebu-id/create-registration";

/** Recalculate readiness when a linked project changes (logo, products, publish, etc.). */
export async function recalculateReadinessForProject(
  supabase: SupabaseClient,
  projectId: string,
): Promise<void> {
  const { data: project } = await supabase
    .from("projects")
    .select("business_id")
    .eq("id", projectId)
    .maybeSingle();

  if (!project?.business_id) return;
  await recalculateAndStoreReadiness({ supabase, businessId: project.business_id });
}

/** Recalculate after Kebu Create asset save. */
export async function recalculateReadinessForBusiness(
  supabase: SupabaseClient,
  businessId: string | null | undefined,
): Promise<void> {
  if (!businessId) return;
  await recalculateAndStoreReadiness({ supabase, businessId });
}
