import { NextResponse } from "next/server";
import { requireUser, logCreate } from "@/lib/create/auth";
import { projectHasLiveHosting } from "@/lib/billing/subscriptions";
import { SITE_HOSTING_BILLING_LABEL, SITE_HOSTING_DESCRIPTION } from "@/lib/billing/pricing";
import { goLiveWebsiteProject } from "@/lib/create/go-live";
import { builderRateLimit } from "@/lib/api-guard";
import { assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";
import { recalculateAndStoreReadiness } from "@/lib/kebu-id/create-registration";
import { z } from "zod";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const publishSchema = z.object({
  subdomain: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .min(3)
    .max(48)
    .optional(),
});

/** Publish project → live deployment snapshot + public /sites/{subdomain}. */
export async function POST(req: Request, { params }: Params) {
  const limited = builderRateLimit(req);
  if (limited) return limited;

  const originBlocked = assertSameOriginMutation(req);
  if (originBlocked) return originBlocked;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id } = await params;

  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid project id." }, { status: 400 });
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id, owner_id, title, subdomain, status, business_id")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  let body: unknown = {};
  try {
    const text = await req.text();
    if (text.trim()) body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = publishSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const subdomain = parsed.data.subdomain || project.subdomain;
  if (!subdomain) {
    return NextResponse.json({ error: "Subdomain required to publish." }, { status: 400 });
  }

  const hostingActive = await projectHasLiveHosting(supabase, id, user.id);
  if (!hostingActive) {
    return NextResponse.json(
      {
        error: "Active site hosting required before publish.",
        billingRequired: true,
        provider: "joko",
        monthlyLabel: SITE_HOSTING_BILLING_LABEL,
        description: SITE_HOSTING_DESCRIPTION,
        subscribeUrl: `/api/projects/${id}/billing/subscribe`,
      },
      { status: 402 },
    );
  }

  const published = await goLiveWebsiteProject({
    supabase,
    userId: user.id,
    projectId: id,
    subdomain,
    businessId: project.business_id,
  });

  if (!published.ok) {
    logCreate("website.publish_failed", { userId: user.id, projectId: id, error: published.error });
    const status = published.error.includes("already published") ? 409 : 500;
    return NextResponse.json({ error: published.error, detail: published.detail }, { status });
  }

  if (project.business_id) {
    await recalculateAndStoreReadiness({ supabase, businessId: project.business_id });
  }

  logCreate("website.published", { userId: user.id, projectId: id, subdomain });

  return NextResponse.json({
    deployment: {
      subdomain,
      public_path: published.publicPath,
      status: "live",
    },
    liveUrl: published.liveUrl,
    plannedKebuAfricaUrl: published.plannedKebuAfricaUrl,
    note: "Live at /sites/{subdomain} on the Kebu app host. Connect your own domain in Site & SEO for www.yourbrand.com.",
  });
}
