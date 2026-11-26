import { goLiveKcdProject } from "./kcd-publish";
import { legacyProjectWriteBlocker } from "@/lib/create/kcd-write-guard";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildSnapshotFromDb } from "@/lib/create/persist-site";
import { validateWebsiteDefinition } from "@/lib/create/website-schema";
import { liveSiteUrl } from "@/lib/create/site-urls";

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
  | { ok: true; publicPath: string; liveUrl: string; plannedKebuAfricaUrl: string | null }
  | { ok: false; error: string; detail?: string; status?: number }
> {
  const { supabase, userId, projectId, subdomain, businessId } = opts;
  const { data: mode, error: modeError } = await supabase.from("projects").select("document_schema_version").eq("id", projectId).eq("owner_id", userId).maybeSingle();
  if (modeError) return { ok: false, status: 503, error: "Could not load publishing mode." };
  if (mode?.document_schema_version === "kcd-1") {
    const published = await goLiveKcdProject({ projectId, userId, subdomain });
    if (published.ok && businessId) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
      const website = published.liveUrl.startsWith("http") ? published.liveUrl : `${appUrl}${published.publicPath}`;
      await supabase.from("businesses").update({ website }).eq("id", businessId);
    }
    return published;
  }
  const blocker = await legacyProjectWriteBlocker(supabase, projectId);
  if (blocker) return { ok: false, error: blocker };
  const normalized = subdomain.trim().toLowerCase();

  // Publish the saved draft; never silently replace it with a newer template seed.
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
    const { error: supersedeErr } = await supabase
      .from("deployments")
      .update({ status: "superseded" })
      .eq("id", existingLive.id);
    if (supersedeErr) {
      return {
        ok: false,
        error: "Could not safely replace the current live deployment.",
        detail: supersedeErr.message,
      };
    }
  }

  async function restorePreviousLive() {
    if (!existingLive) return;
    await supabase.from("deployments").update({ status: "live" }).eq("id", existingLive.id);
  }

  const publicPath = `/sites/${normalized}`;
  const publishedAt = new Date().toISOString();
  const { data: deployment, error: depErr } = await supabase
    .from("deployments")
    .insert({
      project_id: projectId,
      subdomain: normalized,
      snapshot: validated.data,
      status: "live",
      published_by: userId,
      public_path: publicPath,
      published_at: publishedAt,
    })
    .select("id")
    .single();

  if (depErr || !deployment) {
    await restorePreviousLive();
    return {
      ok: false,
      error: depErr?.message?.includes("does not exist")
        ? "Deployments table missing. Apply migration 008."
        : "Could not publish.",
      detail: depErr?.message,
    };
  }

  const { error: projectErr } = await supabase
    .from("projects")
    .update({
      status: "published",
      subdomain: normalized,
      published_at: publishedAt,
      updated_at: publishedAt,
    })
    .eq("id", projectId);

  if (projectErr) {
    await supabase.from("deployments").update({ status: "failed" }).eq("id", deployment.id);
    await restorePreviousLive();
    return {
      ok: false,
      error: "The new publish failed before activation. Your previous live version was restored.",
      detail: projectErr.message,
    };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "";
  const liveUrl = liveSiteUrl(normalized) ?? (appUrl ? `${appUrl}${publicPath}` : publicPath);
  const plannedKebuAfricaUrl = `https://${normalized}.kebu.africa`;

  if (businessId) {
    const website = liveUrl.startsWith("http") ? liveUrl : appUrl ? `${appUrl}${publicPath}` : publicPath;
    await supabase.from("businesses").update({ website }).eq("id", businessId);
  }

  const { data: lastVer } = await supabase
    .from("website_versions")
    .select("version_number")
    .eq("project_id", projectId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error: versionErr } = await supabase.from("website_versions").insert({
    project_id: projectId,
    version_number: (lastVer?.version_number ?? 0) + 1,
    label: "Published",
    snapshot: validated.data,
    created_by: userId,
  });

  if (versionErr) {
    // Site is live; version history is best-effort.
  }

  return { ok: true, publicPath, liveUrl, plannedKebuAfricaUrl };
}

/** True when project was seeded as owner May Lecor / K-Direction portfolio. */
export function isOwnerPortfolioDescription(description: string | null | undefined): boolean {
  const d = description ?? "";
  return (
    d.includes("portfolio:maylecor") ||
    d.includes("portfolio:kdirection") ||
    d.includes("portfolio:dklns") ||
    d.includes("portfolio:ndaoan") ||
    d.includes("portfolio:rect") ||
    d.includes("portfolio:mayjorgood")
  );
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
