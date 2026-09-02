import { NextResponse } from "next/server";
import { requireUser, logCreate } from "@/lib/create/auth";
import { isSupportAdminEmail } from "@/lib/create/support-access";
import { createServiceClient } from "@/lib/opportunity/admin";

export const dynamic = "force-dynamic";

/**
 * Support desk: find a user's site by subdomain (or project UUID) so staff can open the builder.
 * Requires signed-in account listed in KEBU_SUPPORT_ADMIN_EMAILS + service role.
 */
export async function GET(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { user } = auth;

  if (!isSupportAdminEmail(user.email)) {
    return NextResponse.json({ error: "Support access denied." }, { status: 403 });
  }

  const service = createServiceClient();
  if (!service) {
    return NextResponse.json({ error: "Service client not configured." }, { status: 503 });
  }

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();

  let query = service
    .from("projects")
    .select("id, title, subdomain, status, published_at, updated_at, owner_id, project_type")
    .eq("project_type", "website")
    .order("updated_at", { ascending: false })
    .limit(30);

  if (q) {
    if (/^[0-9a-f-]{36}$/i.test(q)) {
      query = query.eq("id", q);
    } else {
      const slug = q.replace(/^https?:\/\//, "").replace(/\.kebu\.africa.*$/, "").replace(/\/$/, "");
      query = query.ilike("subdomain", `%${slug}%`);
    }
  }

  const { data, error } = await query;
  if (error) {
    logCreate("support.sites_failed", { userId: user.id, message: error.message });
    return NextResponse.json({ error: "Could not search sites." }, { status: 500 });
  }

  logCreate("support.sites_search", { userId: user.id, email: user.email, q: q || null, count: data?.length ?? 0 });

  return NextResponse.json({
    sites: data ?? [],
    supportEmail: user.email,
  });
}
