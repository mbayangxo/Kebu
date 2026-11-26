import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { assertProjectProductAccess } from "@/lib/create/assert-project-access";
import { assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";
import { builderRateLimit } from "@/lib/api-guard";
import { isUuid } from "@/lib/creative-core";
import { syncCatalogToProductsSections } from "@/lib/create/sync-catalog-to-sections";

export const dynamic = "force-dynamic";
type Params = { params: Promise<{ id: string }> };

async function synchronize({ params }: Params, inspectOnly: boolean) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Invalid project id." }, { status: 400 });
  const access = await assertProjectProductAccess(auth.supabase, id, auth.user.id);
  if (!access.ok) return NextResponse.json({ error: "Project not found." }, { status: 404 });
  const catalogSync = await syncCatalogToProductsSections(auth.supabase, id, inspectOnly);
  return NextResponse.json({ catalogSync }, { headers: { "Cache-Control": "no-store" } });
}

export async function GET(_req: Request, context: Params) {
  return synchronize(context, true);
}

export async function POST(req: Request, context: Params) {
  const origin = assertSameOriginMutation(req);
  if (origin) return origin;
  const limited = builderRateLimit(req);
  if (limited) return limited;
  return synchronize(context, false);
}
