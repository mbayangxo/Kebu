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

export function resolveAccountContext(opts: {
  activeBusinessId: string | null;
  businesses: WorkspaceBusiness[];
}): AccountWorkspaceContext {
  const { businesses } = opts;
  let activeBusinessId = opts.activeBusinessId;

  if (activeBusinessId && !businesses.some((b) => b.id === activeBusinessId)) {
    activeBusinessId = null;
  }

  if (!activeBusinessId && businesses.length === 1) {
    activeBusinessId = businesses[0]!.id;
  }

  const activeBusiness = activeBusinessId
    ? (businesses.find((b) => b.id === activeBusinessId) ?? null)
    : null;

  const mode: AccountContextMode = activeBusiness ? "business" : "personal";

  return {
    mode,
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
