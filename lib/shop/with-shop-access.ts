import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import { assertShopProjectAccess } from "@/lib/shop/shop-project-access";
import type { ProjectAccessRow, ProjectAccessVia } from "@/lib/create/project-access";

export type ShopContext = {
  supabase: SupabaseClient;
  user: { id: string; email?: string | null };
  db: SupabaseClient;
  project: ProjectAccessRow;
  via: ProjectAccessVia;
  projectId: string;
};

type HandlerFn = (ctx: ShopContext, req: Request) => Promise<Response>;

type WithShopAccessOpts = {
  /** skip rate-limiting (use for GET routes) */
  skipRateLimit?: boolean;
  /** Supabase action string passed to assertShopProjectAccess */
  action?: string;
};

/**
 * Wraps a shop API handler: auth → rate-limit → access-check → handler.
 *
 * Usage:
 *   export const GET = withShopAccess(async (ctx) => {
 *     const { data } = await ctx.db.from("shop_expenses")…
 *     return NextResponse.json(data);
 *   }, { skipRateLimit: true });
 */
export function withShopAccess(
  handler: HandlerFn,
  opts: WithShopAccessOpts = {},
) {
  return async function (req: Request, { params }: { params: Promise<{ id: string }> }) {
    if (!opts.skipRateLimit) {
      const limited = builderRateLimit(req);
      if (limited) return limited;
    }

    const auth = await requireUser();
    if ("error" in auth) return auth.error;
    const { supabase, user } = auth;

    const { id: projectId } = await params;

    const access = await assertShopProjectAccess(supabase, {
      userId: user.id,
      email: user.email,
      projectId,
      action: opts.action ?? "shop-orders",
    });

    if (!access) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    const ctx: ShopContext = {
      supabase,
      user,
      db: access.db,
      project: access.project,
      via: access.via,
      projectId,
    };

    return handler(ctx, req);
  };
}
