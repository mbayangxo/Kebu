import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import { assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";
import { applyAestheticToProject } from "@/lib/create/aesthetics-marketplace";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  libraryId: z.string().uuid(),
  projectId: z.string().uuid(),
  openInEditor: z.boolean().optional(),
});

/** Apply an owned aesthetic to a site as a draft (then edit → publish). */
export async function POST(req: Request) {
  const limited = builderRateLimit(req);
  if (limited) return limited;
  const originBlocked = assertSameOriginMutation(req);
  if (originBlocked) return originBlocked;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "libraryId and projectId are required." }, { status: 400 });
  }

  const result = await applyAestheticToProject(auth.supabase, auth.user.id, parsed.data);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  return NextResponse.json({
    ok: true,
    themeId: result.themeId,
    editorPath: result.editorPath,
    message: "Draft aesthetic added to your site. Edit it, then publish when ready.",
  });
}
