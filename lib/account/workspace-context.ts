import { z } from "zod";

/** Personal Kebu vs Business Kebu (Kebu ID workspace). */
export type AccountContextMode = "personal" | "business";

export type WorkspaceBusiness = {
  id: string;
  publicKebuId: string;
  name: string;
  role: string;
};

export type AccountWorkspaceContext = {
  mode: AccountContextMode;
  activeBusinessId: string | null;
  activeBusiness: WorkspaceBusiness | null;
  businesses: WorkspaceBusiness[];
};

export const workspacePatchSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("personal") }),
  z.object({
    mode: z.literal("business"),
    businessId: z.string().uuid(),
  }),
]);

/**
 * Null activeBusinessId is an explicit Personal Kebu choice.
 * Never auto-enter a business merely because the user belongs to one business.
 */
export function resolveAccountContext(opts: {
  activeBusinessId: string | null;
  businesses: WorkspaceBusiness[];
}): AccountWorkspaceContext {
  const { businesses } = opts;
  const activeBusinessId =
    opts.activeBusinessId && businesses.some((business) => business.id === opts.activeBusinessId)
      ? opts.activeBusinessId
      : null;

  const activeBusiness = activeBusinessId
    ? (businesses.find((business) => business.id === activeBusinessId) ?? null)
    : null;

  return {
    mode: activeBusiness ? "business" : "personal",
    activeBusinessId: activeBusiness?.id ?? null,
    activeBusiness,
    businesses,
  };
}

export function businessScopedHref(baseHref: string, businessId: string | null): string {
  if (!businessId) return baseHref;
  if (baseHref === "/business" || baseHref === "/business/") {
    return `/business/${businessId}`;
  }
  if (baseHref.startsWith("/business/register")) return baseHref;
  if (baseHref.startsWith("/ka-score")) return `/ka-score?business=${businessId}`;
  return baseHref;
}
