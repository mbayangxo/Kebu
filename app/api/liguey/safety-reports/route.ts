import { readCompanyJson } from "@/lib/company/read-request";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";
import { assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";
import { builderRateLimit } from "@/lib/api-guard";
export async function POST(req: Request) {
  const blocked = assertSameOriginMutation(req);
  if (blocked) return blocked;
  const limited = builderRateLimit(req);
  if (limited) return limited;
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const p = z
    .object({
      id: z.uuid(),
      businessId: z.uuid(),
      message: z.string().trim().min(10).max(4000),
    })
    .safeParse(await readCompanyJson(req));
  if (!p.success)
    return NextResponse.json(
      { error: "Describe the concern in 10–4,000 characters." },
      { status: 400 },
    );
  const r = await auth.supabase.rpc("liguey_report_company", {
    p_id: p.data.id,
    p_business: p.data.businessId,
    p_message: p.data.message,
  });
  return r.error
    ? NextResponse.json(
        { error: "Could not save this report. Please retry." },
        { status: 503 },
      )
    : NextResponse.json({ reported: true });
}
