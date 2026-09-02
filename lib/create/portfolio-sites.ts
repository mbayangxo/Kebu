import type { SupabaseClient } from "@supabase/supabase-js";
import { definitionFromTemplateSlug } from "@/lib/create/ai-generate";
import { persistWebsiteDefinition } from "@/lib/create/persist-site";
import { goLiveWebsiteProject } from "@/lib/create/go-live";
import { validateWebsiteDefinition } from "@/lib/create/website-schema";
import type { CreateWebsiteBrief } from "@/lib/create/website-schema";
import { upgradeMaylecorPortfolioProject } from "@/lib/create/upgrade-portfolio-maylecor";
import { upgradeKdirectionPortfolioProject } from "@/lib/create/upgrade-portfolio-kdirection";
import { kebuAfricaSiteUrl, kebuSitePreviewPath } from "@/lib/create/site-urls";

export type PortfolioSiteKey = "maylecor" | "kdirection";

export const PORTFOLIO_SITES: {
  key: PortfolioSiteKey;
  title: string;
  preferredSubdomain: string;
  templateSlug: string;
  category: string;
  description: string;
  countryCode: string;
}[] = [
  {
    key: "maylecor",
    title: "May Lecor",
    preferredSubdomain: "maylecor",
    templateSlug: "musician-maylecor-ksendr",
    category: "music",
    description: "portfolio:maylecor — May Lecor artist site on Kebu",
    countryCode: "SN",
  },
  {
    key: "kdirection",
    title: "K-Direction",
    preferredSubdomain: "kdirection",
    templateSlug: "agency-kdirection",
    category: "agency",
    description: "portfolio:kdirection — K-Direction Artistry label site on Kebu",
    countryCode: "SN",
  },
];

function portfolioMarker(key: PortfolioSiteKey) {
  return `portfolio:${key}`;
}

export async function findPortfolioProject(
  supabase: SupabaseClient,
  userId: string,
  key: PortfolioSiteKey,
) {
  const marker = portfolioMarker(key);
  const { data } = await supabase
    .from("projects")
    .select("id, title, subdomain, status, description, business_id, updated_at")
    .eq("owner_id", userId)
    .ilike("description", `%${marker}%`)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

async function allocateSubdomain(
  supabase: SupabaseClient,
  preferred: string,
  userId: string,
): Promise<string> {
  const base = preferred
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  const candidates = [base, `${base}-${userId.replace(/-/g, "").slice(0, 6)}`];
  for (const candidate of candidates) {
    const { data: taken } = await supabase.from("projects").select("id").eq("subdomain", candidate).maybeSingle();
    if (!taken) return candidate;
  }
  return `${base}-${Date.now().toString(36).slice(-6)}`;
}

async function ensureLiveDeployment(opts: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
  subdomain: string;
  businessId?: string | null;
}): Promise<{ ok: true; kebuAfricaUrl: string; previewPath: string } | { ok: false; error: string }> {
  const { supabase, userId, projectId, subdomain, businessId } = opts;

  const { data: live } = await supabase
    .from("deployments")
    .select("id")
    .eq("project_id", projectId)
    .eq("subdomain", subdomain)
    .eq("status", "live")
    .maybeSingle();

  if (!live) {
    const published = await goLiveWebsiteProject({
      supabase,
      userId,
      projectId,
      subdomain,
      businessId,
    });
    if (!published.ok) return { ok: false, error: published.error };
  }

  return {
    ok: true,
    kebuAfricaUrl: kebuAfricaSiteUrl(subdomain) ?? `https://${subdomain}.kebu.africa`,
    previewPath: kebuSitePreviewPath(subdomain) ?? `/sites/${subdomain}`,
  };
}

export async function ensurePortfolioSitesForUser(opts: {
  supabase: SupabaseClient;
  user: { id: string };
  businessId: string;
}): Promise<{
  created: { key: PortfolioSiteKey; projectId: string; subdomain: string; kebuAfricaUrl: string; previewPath: string }[];
  existing: { key: PortfolioSiteKey; projectId: string; subdomain: string | null; kebuAfricaUrl: string | null; previewPath: string | null }[];
  errors: { key: PortfolioSiteKey; error: string }[];
}> {
  const { supabase, user, businessId } = opts;
  const created: {
    key: PortfolioSiteKey;
    projectId: string;
    subdomain: string;
    kebuAfricaUrl: string;
    previewPath: string;
  }[] = [];
  const existing: {
    key: PortfolioSiteKey;
    projectId: string;
    subdomain: string | null;
    kebuAfricaUrl: string | null;
    previewPath: string | null;
  }[] = [];
  const errors: { key: PortfolioSiteKey; error: string }[] = [];

  for (const site of PORTFOLIO_SITES) {
    const found = await findPortfolioProject(supabase, user.id, site.key);
    if (found?.id) {
      const subdomain =
        typeof found.subdomain === "string" && found.subdomain.length >= 3
          ? found.subdomain
          : await allocateSubdomain(supabase, site.preferredSubdomain, user.id);

      if (!found.subdomain) {
        await supabase.from("projects").update({ subdomain }).eq("id", found.id);
      }

      if (site.key === "maylecor") {
        await upgradeMaylecorPortfolioProject(supabase, found.id);
      }
      if (site.key === "kdirection") {
        await upgradeKdirectionPortfolioProject(supabase, found.id);
      }

      const live = await ensureLiveDeployment({
        supabase,
        userId: user.id,
        projectId: found.id,
        subdomain,
        businessId: typeof found.business_id === "string" ? found.business_id : businessId,
      });

      if (!live.ok) {
        errors.push({ key: site.key, error: live.error });
        existing.push({
          key: site.key,
          projectId: found.id,
          subdomain,
          kebuAfricaUrl: kebuAfricaSiteUrl(subdomain),
          previewPath: kebuSitePreviewPath(subdomain),
        });
        continue;
      }

      existing.push({
        key: site.key,
        projectId: found.id,
        subdomain,
        kebuAfricaUrl: live.kebuAfricaUrl,
        previewPath: live.previewPath,
      });
      continue;
    }

    const brief: CreateWebsiteBrief = {
      mode: "template",
      businessId,
      businessName: site.title,
      category: site.category,
      description: site.description,
      countryCode: site.countryCode,
      locale: "en",
      desiredPages: ["home"],
      templateSlug: site.templateSlug,
    };

    const definition = definitionFromTemplateSlug(site.templateSlug, brief);
    if (!definition) {
      errors.push({ key: site.key, error: `Unknown template ${site.templateSlug}` });
      continue;
    }

    const validated = validateWebsiteDefinition(definition);
    if (!validated.ok) {
      errors.push({ key: site.key, error: validated.error });
      continue;
    }

    const subdomain = await allocateSubdomain(supabase, site.preferredSubdomain, user.id);
    const result = await persistWebsiteDefinition({
      supabase,
      user,
      businessId,
      definition: validated.data,
      meta: {
        source: "template",
        category: site.category,
        description: site.description,
        countryCode: site.countryCode,
        locale: "en",
        visualDirection: portfolioMarker(site.key),
        subdomain,
      },
    });

    if (!result.ok) {
      errors.push({ key: site.key, error: result.error });
      continue;
    }

    const projectId = String(result.project.id);
    const live = await ensureLiveDeployment({
      supabase,
      userId: user.id,
      projectId,
      subdomain,
      businessId,
    });

    if (!live.ok) {
      errors.push({ key: site.key, error: live.error });
      created.push({
        key: site.key,
        projectId,
        subdomain,
        kebuAfricaUrl: kebuAfricaSiteUrl(subdomain) ?? `https://${subdomain}.kebu.africa`,
        previewPath: kebuSitePreviewPath(subdomain) ?? `/sites/${subdomain}`,
      });
      continue;
    }

    created.push({
      key: site.key,
      projectId,
      subdomain,
      kebuAfricaUrl: live.kebuAfricaUrl,
      previewPath: live.previewPath,
    });
  }

  return { created, existing, errors };
}
