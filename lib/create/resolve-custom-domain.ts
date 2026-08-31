import { createClient } from "@supabase/supabase-js";

/** Map a verified custom hostname → Kebu site subdomain (middleware + SSR). */
export async function resolveSubdomainForCustomHost(hostname: string): Promise<string | null> {
  const raw = hostname.split(":")[0]?.toLowerCase() ?? "";
  if (!raw || raw.includes("localhost")) return null;

  const host = raw.replace(/^www\./, "");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;

  const supabase = createClient(url, serviceKey);

  const { data, error } = await supabase
    .from("site_domains")
    .select("hostname, project_id, status")
    .eq("hostname", host)
    .eq("status", "verified")
    .maybeSingle();

  if (error || !data?.project_id) return null;

  const { data: project } = await supabase
    .from("projects")
    .select("subdomain")
    .eq("id", data.project_id)
    .maybeSingle();

  return typeof project?.subdomain === "string" ? project.subdomain : null;
}
