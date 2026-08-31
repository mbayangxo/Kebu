import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { websiteDefinitionSchema, type WebsiteDefinition } from "@/lib/create/website-schema";
import { mergeSiteSeo, type SiteSeo } from "@/lib/create/site-seo";
import { kebuSubdomainTarget } from "@/lib/create/custom-domains";

export type PublicDeployment = {
  subdomain: string;
  publicPath: string;
  publishedAt: string | null;
  definition: WebsiteDefinition;
  seo: SiteSeo;
  httpsUrl: string;
  customDomainUrl: string | null;
};

function httpsSiteUrl(subdomain: string): string {
  return `https://${kebuSubdomainTarget(subdomain)}`;
}

async function loadPrimaryCustomDomainUrl(projectId: string): Promise<string | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;

  const admin = createServiceClient(url, serviceKey);
  const { data } = await admin
    .from("site_domains")
    .select("hostname")
    .eq("project_id", projectId)
    .eq("status", "verified")
    .eq("is_primary", true)
    .maybeSingle();

  if (!data?.hostname) return null;
  return `https://www.${data.hostname}`;
}

/** Load live published deployment for public rendering (server-side). */
export async function loadPublicDeployment(subdomain: string): Promise<PublicDeployment | null> {
  const normalized = subdomain.trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized)) return null;

  const supabase = await createClient();
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
  const httpsUrl = customDomainUrl ?? httpsSiteUrl(data.subdomain);

  return {
    subdomain: data.subdomain,
    publicPath: data.public_path,
    publishedAt: data.published_at,
    definition: parsed.data,
    seo,
    httpsUrl,
    customDomainUrl,
  };
}
