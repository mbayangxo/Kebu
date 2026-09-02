import { NextResponse } from "next/server";
import { requireUser, logCreate } from "@/lib/create/auth";
import { assertBusinessEditor } from "@/lib/create/business-access";
import { ensurePortfolioOwnerBusiness } from "@/lib/create/ensure-portfolio-business";
import {
  ensurePortfolioSitesForUser,
  findPortfolioProject,
  PORTFOLIO_SITES,
} from "@/lib/create/portfolio-sites";
import { isPortfolioOwnerEmail } from "@/lib/create/portfolio-owner";
import { builderRateLimit } from "@/lib/api-guard";
import { kebuAfricaSiteUrl, kebuSitePreviewPath } from "@/lib/create/site-urls";

export const dynamic = "force-dynamic";

function forbidOthers() {
  return NextResponse.json(
    {
      error: "These sites are private to the owner account. Use shared templates in Kebu Builder instead.",
      allowed: false,
    },
    { status: 403 },
  );
}

function mapSites(
  sites: {
    key: string;
    title: string;
    projectId: string | null;
    subdomain: string | null;
    status?: string | null;
    editorUrl: string | null;
    previewPath: string | null;
    kebuAfricaUrl?: string | null;
  }[],
) {
  return sites;
}

async function listPortfolioSites(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>,
  userId: string,
  autoEnsure: boolean,
  businessId?: string,
) {
  const sites = [];
  for (const site of PORTFOLIO_SITES) {
    const found = await findPortfolioProject(supabase, userId, site.key);
    const subdomain = typeof found?.subdomain === "string" ? found.subdomain : null;
    sites.push({
      key: site.key,
      title: site.title,
      projectId: found?.id ?? null,
      subdomain,
      status: found?.status ?? null,
      editorUrl: found?.id ? `/create/${found.id}` : null,
      previewPath: kebuSitePreviewPath(subdomain),
      kebuAfricaUrl: kebuAfricaSiteUrl(subdomain),
    });
  }

  if (!autoEnsure || !businessId) {
    return { sites, ensured: false as const, errors: [] as { key: string; error: string }[] };
  }

  const missing = sites.some((s) => !s.projectId);
  if (!missing) {
    return { sites, ensured: false as const, errors: [] as { key: string; error: string }[] };
  }

  const result = await ensurePortfolioSitesForUser({ supabase, user: { id: userId }, businessId });
  const merged = [];
  for (const site of PORTFOLIO_SITES) {
    const row =
      result.created.find((c) => c.key === site.key) ??
      result.existing.find((e) => e.key === site.key);
    merged.push({
      key: site.key,
      title: site.title,
      projectId: row?.projectId ?? null,
      subdomain: row?.subdomain ?? site.preferredSubdomain,
      status: "published",
      editorUrl: row?.projectId ? `/create/${row.projectId}` : null,
      previewPath: row?.previewPath ?? kebuSitePreviewPath(site.preferredSubdomain),
      kebuAfricaUrl: row?.kebuAfricaUrl ?? kebuAfricaSiteUrl(site.preferredSubdomain),
    });
  }

  return { sites: merged, ensured: true as const, errors: result.errors };
}

/** List May Lecor / K-Direction for owner; auto-provisions when ?ensure=1. */
export async function GET(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const allowed = isPortfolioOwnerEmail(user.email);
  if (!allowed) {
    return NextResponse.json({ allowed: false, sites: [] });
  }

  const autoEnsure = new URL(req.url).searchParams.get("ensure") === "1";
  let businessId: string | undefined;

  if (autoEnsure) {
    const biz = await ensurePortfolioOwnerBusiness(supabase, user.id);
    if ("error" in biz) {
      return NextResponse.json(
        { allowed: true, sites: [], error: biz.error, detail: biz.detail },
        { status: 500 },
      );
    }
    businessId = biz.businessId;
  }

  const { sites, ensured, errors } = await listPortfolioSites(supabase, user.id, autoEnsure, businessId);

  return NextResponse.json({
    allowed: true,
    sites: mapSites(sites),
    autoEnsured: ensured,
    errors: errors ?? [],
  });
}

/** Idempotently create May Lecor + K-Direction for the allowlisted owner only. */
export async function POST(req: Request) {
  const limited = builderRateLimit(req);
  if (limited) return limited;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  if (!isPortfolioOwnerEmail(user.email)) {
    logCreate("projects.portfolio_denied", { userId: user.id, email: user.email ?? null });
    return forbidOthers();
  }

  const biz = await ensurePortfolioOwnerBusiness(supabase, user.id);
  if ("error" in biz) {
    return NextResponse.json({ error: biz.error, detail: biz.detail }, { status: 500 });
  }

  let businessId = biz.businessId;
  try {
    const body = await req.json().catch(() => ({}));
    if (body && typeof body === "object" && typeof (body as { businessId?: string }).businessId === "string") {
      businessId = (body as { businessId: string }).businessId;
    }
  } catch {
    /* empty body ok */
  }

  const access = await assertBusinessEditor(supabase, businessId, user.id);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const result = await ensurePortfolioSitesForUser({ supabase, user, businessId });

  logCreate("projects.portfolio_ensured", {
    userId: user.id,
    businessId,
    created: result.created.map((c) => c.key),
    existing: result.existing.map((e) => e.key),
  });

  const sites = PORTFOLIO_SITES.map((site) => {
    const row =
      result.created.find((c) => c.key === site.key) ??
      result.existing.find((e) => e.key === site.key);
    return {
      key: site.key,
      title: site.title,
      projectId: row?.projectId ?? null,
      subdomain: row?.subdomain ?? null,
      editorUrl: row?.projectId ? `/create/${row.projectId}` : null,
      previewPath: row?.previewPath ?? kebuSitePreviewPath(site.preferredSubdomain),
      kebuAfricaUrl: row?.kebuAfricaUrl ?? kebuAfricaSiteUrl(site.preferredSubdomain),
    };
  });

  return NextResponse.json({
    ok: result.errors.length === 0,
    allowed: true,
    sites,
    errors: result.errors,
    message:
      result.errors.length === 0
        ? "May Lecor and K-Direction are ready in My sites."
        : "Some sites could not go live — check errors.",
  });
}
