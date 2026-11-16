import { readCompanyJson } from "@/lib/company/read-request";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";
import { assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";
export async function POST(req: Request) {
  const blocked = assertSameOriginMutation(req);
  if (blocked) return blocked;
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const p = z
    .object({ applicationId: z.uuid() })
    .safeParse(await readCompanyJson(req));
  if (!p.success)
    return NextResponse.json(
      { error: "Choose an accepted application." },
      { status: 400 },
    );
  const r = await auth.supabase.rpc("company_prepare_hire", {
    p_application: p.data.applicationId,
  });
  return r.error
    ? NextResponse.json(
        {
          error:
            "Could not prepare the invitation. Check the accepted application, team permissions and company review.",
        },
        { status: 409 },
      )
    : NextResponse.json({
        acceptPath: `/invite/${r.data.token}`,
        expiresAt: r.data.expiresAt,
        emailed: false,
      });
}
