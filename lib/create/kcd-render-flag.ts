/**
 * 3C S3 — which projects the Builder renders through the Kebu Creative Core (KCD) path.
 *
 * QA / local only until kcd-1 publishing and the per-project opt-in column exist (S4/S7):
 * `KEBU_KCD_RENDER=all` or a comma-separated list of project ids. Never on a production deployment
 * or against the production database, whatever the variable says. Unset = exact 3B behavior.
 */
const PRODUCTION_SUPABASE_REF = "tnygqgcqlnlsmjpygrca";

export type RenderPath = "3b" | "kcd";

export function builderRenderPath(projectId: string, env: Record<string, string | undefined> = process.env): RenderPath {
  const setting = env.KEBU_KCD_RENDER?.trim();
  if (!setting) return "3b";
  if (env.VERCEL_ENV === "production") return "3b";
  if ([env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_URL].some((v) => v?.includes(PRODUCTION_SUPABASE_REF))) return "3b";
  if (setting === "all") return "kcd";
  return setting.split(",").map((s) => s.trim()).includes(projectId) ? "kcd" : "3b";
}

/** S5 writes are separately opt-in; installing the migration must not enable unapproved QA editing. */
export function builderOperationsEnabled(projectId: string, env: Record<string, string | undefined> = process.env): boolean {
  if (builderRenderPath(projectId, env) !== "kcd") return false;
  const setting = env.KEBU_KCD_OPERATIONS?.trim();
  return setting === "all" || Boolean(setting?.split(",").map((id) => id.trim()).includes(projectId));
}
