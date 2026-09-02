import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/opportunity/admin";
import { assertAdminCookie } from "@/lib/admin/assert-admin-cookie";

export const dynamic = "force-dynamic";

/**
 * Internal Kebu Record ops overview — businesses, sites, domains, designs.
 * Not the user-facing "Kebu Business Record" PDF/HTML download.
 */
export async function GET(req: Request) {
  if (!assertAdminCookie(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const supabase = createServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: "Service client not configured." }, { status: 503 });
  }

  const [
    businessesRes,
    publishedRes,
    domainsRes,
    deploymentsRes,
    productsRes,
    designsRes,
    recentBusinessesRes,
  ] = await Promise.all([
    supabase.from("businesses").select("id", { count: "exact", head: true }),
    supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("project_type", "website")
      .not("published_at", "is", null),
    supabase.from("site_domains").select("id, hostname, status, provider, project_id"),
    supabase.from("deployments").select("id", { count: "exact", head: true }).eq("status", "live"),
    supabase.from("project_products").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("create_designs").select("id", { count: "exact", head: true }),
    supabase
      .from("businesses")
      .select("id, public_kebu_id, legal_name, country_code, lifecycle_status, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const domains = domainsRes.data ?? [];
  const verifiedDomains = domains.filter((d) => d.status === "verified");

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    counts: {
      businesses: businessesRes.count ?? 0,
      publishedWebsites: publishedRes.count ?? 0,
      liveDeployments: deploymentsRes.count ?? 0,
      connectedDomains: domains.length,
      verifiedDomains: verifiedDomains.length,
      catalogProducts: productsRes.count ?? 0,
      createDesigns: designsRes.count ?? 0,
    },
    domains: domains.slice(0, 50),
    recentBusinesses: recentBusinessesRes.data ?? [],
    notes: [
      "Kebu Record = internal team portal for platform analytics and hosted assets.",
      "User-facing Kebu Business Record = per-business identity snapshot (separate API).",
      "Kebu Builder = websites. Kebu Create = posters and marketing graphics.",
    ],
  });
}
