import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, logCreate } from "@/lib/create/auth";
import { mergeSiteCommerce } from "@/lib/create/site-commerce";
import { siteSeoSchema } from "@/lib/create/site-seo";
import { themeSchema } from "@/lib/create/website-schema";
import { builderRateLimit } from "@/lib/api-guard";
import { recalculateReadinessForProject } from "@/lib/kebu-id/recalculate-hooks";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const settingsSchema = z.object({
  subdomain: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .min(3)
    .max(48)
    .optional(),
  seo: siteSeoSchema.partial().optional(),
  theme: themeSchema.partial().optional(),
});

/** Update publish subdomain + SEO/favicon settings for an owned project. */
export async function PATCH(req: Request, { params }: Params) {
  const limited = builderRateLimit(req);
  if (limited) return limited;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id } = await params;

  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid project id." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id, owner_id, title, subdomain, seo, theme")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (parsed.data.subdomain) {
    const { data: taken } = await supabase
      .from("projects")
      .select("id")
      .eq("subdomain", parsed.data.subdomain)
      .neq("id", id)
      .maybeSingle();

    if (taken) {
      return NextResponse.json({ error: "Subdomain already taken. Choose another." }, { status: 409 });
    }

    const { data: liveOther } = await supabase
      .from("deployments")
      .select("id, project_id")
      .eq("subdomain", parsed.data.subdomain)
      .eq("status", "live")
      .maybeSingle();

    if (liveOther && liveOther.project_id !== id) {
      return NextResponse.json({ error: "Subdomain is live on another project." }, { status: 409 });
    }

    patch.subdomain = parsed.data.subdomain;
  }

  if (parsed.data.seo) {
    const currentSeo =
      project.seo && typeof project.seo === "object" ? (project.seo as Record<string, unknown>) : {};
    const nextSeo = { ...parsed.data.seo };
    if (nextSeo.commerce !== undefined) {
      nextSeo.commerce = mergeSiteCommerce(nextSeo.commerce, currentSeo.commerce);
      const mergedCommerce = nextSeo.commerce as { preferJokoCheckout?: boolean };
      const wasJoko =
        currentSeo.commerce &&
        typeof currentSeo.commerce === "object" &&
        Boolean((currentSeo.commerce as { preferJokoCheckout?: boolean }).preferJokoCheckout);
      if (mergedCommerce.preferJokoCheckout && !wasJoko) {
        const { assertProjectPlanLimit } = await import("@/lib/billing/enforce-limits");
        const planGate = await assertProjectPlanLimit(supabase, id, user.id, "store");
        if (!planGate.ok) {
          return NextResponse.json(
            { error: planGate.error, upgradeHint: planGate.upgradeHint, tier: planGate.tier },
            { status: 402 },
          );
        }
        const { resolveSellerTrust, sellerTrustDenyJokoMessage } = await import("@/lib/shop/seller-trust");
        const trust = await resolveSellerTrust(supabase, { projectId: id, userId: user.id });
        if (!trust.canEnableJoko) {
          return NextResponse.json(
            {
              error: sellerTrustDenyJokoMessage(trust),
              sellerTrust: trust,
            },
            { status: 403 },
          );
        }
      }
    }
    const merged = siteSeoSchema.parse({ ...currentSeo, ...nextSeo });
    patch.seo = merged;
  }

  if (parsed.data.theme) {
    const currentTheme =
      project.theme && typeof project.theme === "object" ? (project.theme as Record<string, unknown>) : {};
    const merged = themeSchema.parse({ ...currentTheme, ...parsed.data.theme });
    patch.theme = merged;
  }

  const { data: updated, error } = await supabase
    .from("projects")
    .update(patch)
    .eq("id", id)
    .eq("owner_id", user.id)
    .select("id, subdomain, seo, theme, updated_at")
    .single();

  if (error || !updated) {
    logCreate("website.settings_failed", { userId: user.id, projectId: id, message: error?.message });
    return NextResponse.json(
      {
        error: error?.message?.includes("does not exist")
          ? "SEO settings column missing. Apply migration 013."
          : "Could not save settings.",
        detail: error?.message,
      },
      { status: 500 },
    );
  }

  logCreate("website.settings_saved", { userId: user.id, projectId: id });

  await recalculateReadinessForProject(supabase, id);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  const publicPath = updated.subdomain ? `/sites/${updated.subdomain}` : null;

  return NextResponse.json({
    project: updated,
    httpsUrl: publicPath ? (appUrl ? `${appUrl}${publicPath}` : publicPath) : null,
    publicPath,
    message: "Settings saved. Publish again to update your live site.",
  });
}
