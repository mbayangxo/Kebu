import { NextResponse } from "next/server";
import { requireUser, logCreate } from "@/lib/create/auth";
import { assertBusinessEditor } from "@/lib/create/business-access";
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
      error: "These sites are private to the owner account. Use shared templates in Create instead.",
      allowed: false,
    },
    { status: 403 },
  );
}

/** List May Lecor / K-Direction only for the allowlisted owner account. */
export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const allowed = isPortfolioOwnerEmail(user.email);
  if (!allowed) {
    return NextResponse.json({ allowed: false, sites: [] });
  }

  const sites = [];
  for (const site of PORTFOLIO_SITES) {
    const found = await findPortfolioProject(supabase, user.id, site.key);
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

  return NextResponse.json({ allowed: true, sites });
}

/**
 * Idempotently create May Lecor + K-Direction for the allowlisted owner only.
 */
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

  const { data: memberships, error: memErr } = await supabase
    .from("business_members")
    .select("business_id, role, created_at")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (memErr) {
    return NextResponse.json(
      {
        error: memErr.message.includes("does not exist")
          ? "Business tables missing. Apply migrations 005–007."
          : "Could not load businesses.",
        detail: memErr.message,
      },
      { status: 500 },
    );
  }

  if (!memberships?.length) {
    return NextResponse.json(
      {
        error: "Register a Kebu ID business first, then add your sites.",
        registerUrl: "/business/register",
      },
      { status: 400 },
    );
  }

  let businessId = memberships[0]!.business_id;
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

  return NextResponse.json({
    ok: result.errors.length === 0,
    allowed: true,
    catalog: PORTFOLIO_SITES.map((s) => ({ key: s.key, title: s.title })),
    created: result.created,
    existing: result.existing,
    errors: result.errors,
    sites: [...result.created, ...result.existing].map((s) => ({
      key: s.key,
      projectId: s.projectId,
      subdomain: s.subdomain,
      kebuAfricaUrl: "kebuAfricaUrl" in s ? s.kebuAfricaUrl : null,
      previewPath: "previewPath" in s ? s.previewPath : null,
    })),
    message:
      result.errors.length === 0
        ? "May Lecor and K-Direction are live. Open /sites/maylecor and /sites/kdirection (or *.kebu.africa when DNS points here)."
        : "Some sites could not go live — check errors.",
  });
}
