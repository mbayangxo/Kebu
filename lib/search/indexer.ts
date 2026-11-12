import type { SupabaseClient } from "@supabase/supabase-js";

type SearchDocument = {
  source_key: string;
  mode: "sites" | "opportunities";
  entity_type: string;
  entity_id: string;
  title: string;
  summary: string;
  source_url: string | null;
  source_name: string | null;
  trust_label: string | null;
  access_scope: "public" | "opportunity_verified";
  fetched_at: string;
  updated_at: string;
};

export async function refreshPhaseOneSearchIndex(admin: SupabaseClient) {
  const now = new Date().toISOString();
  const [sitesResult, opportunitiesResult] = await Promise.all([
    admin
      .from("projects")
      .select("id, title, project_type, subdomain, status, updated_at")
      .eq("status", "published")
      .limit(5000),
    admin
      .from("opportunities")
      .select("id, title, summary, country, type, source_url, source_name, verified_status, updated_at")
      .limit(5000),
  ]);

  if (sitesResult.error) throw sitesResult.error;
  if (opportunitiesResult.error) throw opportunitiesResult.error;

  const docs: SearchDocument[] = [];

  for (const site of sitesResult.data ?? []) {
    if (!site.subdomain) continue;
    docs.push({
      source_key: "site:" + site.id,
      mode: "sites",
      entity_type: site.project_type === "store" ? "store" : "site",
      entity_id: site.id,
      title: site.title || "Untitled site",
      summary: site.project_type === "store" ? "Published Kebu store" : "Published Kebu site",
      source_url: "https://" + site.subdomain + ".thekebu.com",
      source_name: "Kebu Sites",
      trust_label: "published",
      access_scope: "public",
      fetched_at: now,
      updated_at: site.updated_at || now,
    });
  }

  for (const item of opportunitiesResult.data ?? []) {
    docs.push({
      source_key: "opportunity:" + item.id,
      mode: "opportunities",
      entity_type: "opportunity",
      entity_id: item.id,
      title: item.title,
      summary: [item.summary, item.type, item.country].filter(Boolean).join(" · "),
      source_url: item.source_url || null,
      source_name: item.source_name || "Opportunity source",
      trust_label: item.verified_status || "needs_review",
      access_scope: "opportunity_verified",
      fetched_at: now,
      updated_at: item.updated_at || now,
    });
  }

  if (docs.length) {
    const { error } = await admin.from("search_documents").upsert(docs, { onConflict: "source_key" });
    if (error) throw error;
  }

  return {
    sites: docs.filter((doc) => doc.mode === "sites").length,
    opportunities: docs.filter((doc) => doc.mode === "opportunities").length,
    total: docs.length,
  };
}
