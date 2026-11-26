import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import { assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";
import { setCreativeAssetStatus } from "@/lib/studio/creative-assets-marketplace";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  status: z.enum(["draft", "published", "archived"]),
});

/** Publish, unpublish (draft) or archive one of my own creative asset listings. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const limited = builderRateLimit(req);
  if (limited) return limited;
  const originBlocked = assertSameOriginMutation(req);
  if (originBlocked) return originBlocked;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid status." }, { status: 400 });

  const result = await setCreativeAssetStatus(auth.supabase, auth.user.id, id, parsed.data.status);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  return NextResponse.json({ ok: true });
}
