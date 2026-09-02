import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient, type SupabaseClient } from "@supabase/supabase-js";
import { websiteDefinitionSchema, type WebsiteDefinition } from "@/lib/create/website-schema";
import { mergeSiteSeo, type SiteSeo } from "@/lib/create/site-seo";
import { kebuSitePreviewPath, liveSiteUrl, plannedKebuAfricaHost } from "@/lib/create/site-urls";

export type PublicDeployment = {
  projectId: string;
  subdomain: string;
  publicPath: string;
  publishedAt: string | null;
  definition: WebsiteDefinition;
  seo: SiteSeo;
  httpsUrl: string;
  customDomainUrl: string | null;
};

export type PublicLoadError = {
  status: 500 | 503;
  code: "migrations_missing" | "db_error" | "invalid_snapshot";
  userMessage: string;
  detail?: string;
};

function serviceClientOrNull(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createServiceClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function publicReadClient(): Promise<SupabaseClient> {
  const admin = serviceClientOrNull();
  if (admin) return admin;
  return createClient();
}

async function loadPrimaryCustomDomainUrl(projectId: string): Promise<string | null> {
  const admin = serviceClientOrNull();
  if (!admin) return null;

  const { data: primary } = await admin
    .from("site_domains")
    .select("hostname")
    .eq("project_id", projectId)
    .eq("status", "verified")
    .eq("is_primary", true)
    .maybeSingle();

  if (primary?.hostname) return `https://www.${primary.hostname}`;

  const { data: anyVerified } = await admin
    .from("site_domains")
    .select("hostname")
    .eq("project_id", projectId)
    .eq("status", "verified")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!anyVerified?.hostname) return null;
  return `https://www.${anyVerified.hostname}`;
}

function looksLikeMissingTable(message: string | undefined): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return (
    m.includes("does not exist") ||
    m.includes("schema cache") ||
    m.includes("could not find the table")
  );
}

/** Load live published deployment for public rendering (server-side). */
export async function loadPublicDeployment(subdomain: string): Promise<PublicDeployment | null> {
  const normalized = subdomain.trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized)) return null;

  const supabase = await publicReadClient();
  const { data, error } = await supabase
    .from("deployments")
    .select("id, project_id, subdomain, snapshot, public_path, published_at, status")
    .eq("subdomain", normalized)
    .eq("status", "live")
    .maybeSingle();

  if (error || !data) return null;

  const parsed = websiteDefinitionSchema.safeParse(data.snapshot);
  if (!parsed.success) return null;

  const seo = mergeSiteSeo(parsed.data.seo, parsed.data.title);
  const customDomainUrl = data.project_id
    ? await loadPrimaryCustomDomainUrl(data.project_id)
    : null;
  const path = kebuSitePreviewPath(data.subdomain) ?? `/sites/${data.subdomain}`;
  const httpsUrl =
    customDomainUrl ?? liveSiteUrl(data.subdomain) ?? path;

  return {
    projectId: data.project_id,
    subdomain: data.subdomain,
    publicPath: data.public_path || path,
    publishedAt: data.published_at,
    definition: parsed.data,
    seo,
    httpsUrl,
    customDomainUrl,
  };
}

/**
 * Diagnose why a public site failed to load (for API error responses).
 * Returns null when the slug is simply unpublished / not found.
 */
export async function publicDeploymentLoadError(
  subdomain: string,
): Promise<PublicLoadError | null> {
  const normalized = subdomain.trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized)) return null;

  const supabase = await publicReadClient();
  const { data, error } = await supabase
    .from("deployments")
    .select("id, snapshot, status")
    .eq("subdomain", normalized)
    .eq("status", "live")
    .maybeSingle();

  if (error) {
    if (looksLikeMissingTable(error.message)) {
      return {
        status: 503,
        code: "migrations_missing",
        userMessage: "Site hosting tables missing. Apply Supabase migration 008 on production.",
        detail: error.message,
      };
    }
    return {
      status: 500,
      code: "db_error",
      userMessage: "Could not load site.",
      detail: error.message,
    };
  }

  if (!data) {
    return null;
  }

  const parsed = websiteDefinitionSchema.safeParse(data.snapshot);
  if (!parsed.success) {
    return {
      status: 500,
      code: "invalid_snapshot",
      userMessage: "Published snapshot invalid. Re-publish from the editor.",
      detail: parsed.error.message,
    };
  }

  return null;
}

export function plannedHostLabel(subdomain: string): string | null {
  return plannedKebuAfricaHost(subdomain);
}
