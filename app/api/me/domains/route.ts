import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";

export const dynamic = "force-dynamic";

/**
 * Cross-site domain management: every custom domain the signed-in user has
 * connected, across every project they own, in one place. Each row's own
 * connect/verify/remove actions still live on that project's Domain & SEO
 * panel (SiteDomainSeoPanel) -- this view is read-only and links there
 * rather than duplicating that logic.
 *
 * RLS on site_domains ("Owners select domains", 008_website_builder.sql)
 * already scopes every row to projects the caller owns with no project_id
 * filter needed -- the query below relies on that, not a manual owner check.
 */
export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  const { data, error } = await supabase
    .from("site_domains")
    .select(
      "id, hostname, status, verified, is_primary, last_error, verified_at, created_at, project_id, projects(id, title, subdomain)",
    )
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      {
        error: error.message.includes("does not exist")
          ? "Custom domains table missing. Apply migration 008/015."
          : "Could not load your domains.",
      },
      { status: 500 },
    );
  }

  type Row = {
    id: string;
    hostname: string;
    status: string;
    verified: boolean;
    is_primary: boolean;
    last_error: string | null;
    verified_at: string | null;
    created_at: string;
    project_id: string;
    projects: { id: string; title: string | null; subdomain: string | null } | null;
  };

  const domains = ((data ?? []) as unknown as Row[]).map((d) => ({
    id: d.id,
    hostname: d.hostname,
    status: d.status,
    isPrimary: d.is_primary,
    lastError: d.last_error,
    verifiedAt: d.verified_at,
    createdAt: d.created_at,
    projectId: d.project_id,
    siteTitle: d.projects?.title ?? "Untitled site",
    siteSubdomain: d.projects?.subdomain ?? null,
  }));

  return NextResponse.json({ domains });
}
