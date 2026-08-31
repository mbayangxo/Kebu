import type { SupabaseClient } from "@supabase/supabase-js";
import { buildSnapshotFromDb } from "@/lib/create/persist-site";
import { validateWebsiteDefinition } from "@/lib/create/website-schema";
import { kebuAfricaSiteUrl } from "@/lib/create/site-urls";

/**
 * Push a project's current DB snapshot to a live public deployment.
 * Used by Publish API and owner portfolio auto-go-live.
 */
export async function goLiveWebsiteProject(opts: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
  subdomain: string;
  businessId?: string | null;
}): Promise<
  | { ok: true; publicPath: string; kebuAfricaUrl: string; liveUrl: string }
  | { ok: false; error: string; detail?: string }
> {
  const { supabase, userId, projectId, subdomain, businessId } = opts;
  const normalized = subdomain.trim().toLowerCase();

  const snapshot = await buildSnapshotFromDb(supabase, projectId);
  if (!snapshot) {
    return { ok: false, error: "Could not build site snapshot." };
  }

  const validated = validateWebsiteDefinition(snapshot);
  if (!validated.ok) {
    return { ok: false, error: "Site failed validation before go-live.", detail: validated.error };
  }

  const { data: existingLive } = await supabase
    .from("deployments")
    .select("id, project_id")
    .eq("subdomain", normalized)
    .eq("status", "live")
    .maybeSingle();

  if (existingLive && existingLive.project_id !== projectId) {
    return { ok: false, error: "Subdomain is already published by another project." };
  }

  if (existingLive) {
    await supabase.from("deployments").update({ status: "superseded" }).eq("id", existingLive.id);
  }

  const publicPath = `/sites/${normalized}`;
  const { data: deployment, error: depErr } = await supabase
    .from("deployments")
    .insert({
      project_id: projectId,
      subdomain: normalized,
      snapshot: validated.data,
      status: "live",
      published_by: userId,
      public_path: publicPath,
    })
    .select("id")
    .single();

  if (depErr || !deployment) {
    return {
      ok: false,
      error: depErr?.message?.includes("does not exist")
        ? "Deployments table missing. Apply migration 008."
        : "Could not publish.",
      detail: depErr?.message,
    };
  }

  await supabase
    .from("projects")
    .update({
      status: "published",
      subdomain: normalized,
      published_at: new Date().toISOString(),
    })
    .eq("id", projectId);

  const kebuAfricaUrl = kebuAfricaSiteUrl(normalized) ?? `https://${normalized}.kebu.africa`;
  if (businessId) {
    await supabase.from("businesses").update({ website: kebuAfricaUrl }).eq("id", businessId);
  }

  const { data: lastVer } = await supabase
    .from("website_versions")
    .select("version_number")
    .eq("project_id", projectId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  await supabase.from("website_versions").insert({
    project_id: projectId,
    version_number: (lastVer?.version_number ?? 0) + 1,
    label: "Published",
    snapshot: validated.data,
    created_by: userId,
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "";
  const liveUrl = appUrl ? `${appUrl}${publicPath}` : publicPath;

  return { ok: true, publicPath, kebuAfricaUrl, liveUrl };
}

/** True when project was seeded as owner May Lecor / K-Direction portfolio. */
export function isOwnerPortfolioDescription(description: string | null | undefined): boolean {
  const d = description ?? "";
  return d.includes("portfolio:maylecor") || d.includes("portfolio:kdirection");
}

export async function projectIsOwnerPortfolio(
  supabase: SupabaseClient,
  projectId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("projects")
    .select("description")
    .eq("id", projectId)
    .maybeSingle();
  return isOwnerPortfolioDescription(data?.description);
}
