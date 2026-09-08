import type { SupabaseClient } from "@supabase/supabase-js";
import { upgradeDklnsPortfolioProject } from "@/lib/create/upgrade-portfolio-dklns";
import { upgradeKdirectionPortfolioProject } from "@/lib/create/upgrade-portfolio-kdirection";
import { upgradeMayjorGoodPortfolioProject } from "@/lib/create/upgrade-portfolio-mayjor-good";
import { upgradeMaylecorPortfolioProject } from "@/lib/create/upgrade-portfolio-maylecor";
import { upgradeNdaoanPortfolioProject } from "@/lib/create/upgrade-portfolio-ndaoan";

export type PortfolioUpgradeKey = "maylecor" | "kdirection" | "dklns" | "ndaoan" | "mayjorgood";

/** Detect portfolio template from project description marker. */
export function portfolioUpgradeKeyFromDescription(
  description: string | null | undefined,
): PortfolioUpgradeKey | null {
  const d = description ?? "";
  if (d.includes("portfolio:kdirection")) return "kdirection";
  if (d.includes("portfolio:maylecor")) return "maylecor";
  if (d.includes("portfolio:dklns")) return "dklns";
  if (d.includes("portfolio:ndaoan")) return "ndaoan";
  if (d.includes("portfolio:mayjorgood")) return "mayjorgood";
  return null;
}

/**
 * Before publish, sync multipage blueprints for portfolio design worlds so
 * public nav links (e.g. K-Direction Artists / Events) resolve after go-live.
 */
export async function ensureProjectPagesBeforePublish(
  supabase: SupabaseClient,
  projectId: string,
): Promise<{ synced: boolean; detail?: string }> {
  const { data: project } = await supabase
    .from("projects")
    .select("id, description")
    .eq("id", projectId)
    .maybeSingle();

  if (!project) return { synced: false, detail: "Project not found" };

  const key = portfolioUpgradeKeyFromDescription(project.description);
  if (!key) return { synced: false };

  const runners = {
    maylecor: upgradeMaylecorPortfolioProject,
    kdirection: upgradeKdirectionPortfolioProject,
    dklns: upgradeDklnsPortfolioProject,
    ndaoan: upgradeNdaoanPortfolioProject,
    mayjorgood: upgradeMayjorGoodPortfolioProject,
  } as const;

  const result = await runners[key](supabase, projectId);
  return { synced: result.upgraded, detail: result.detail };
}
