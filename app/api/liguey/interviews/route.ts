import { readCompanyJson } from "@/lib/company/read-request";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";
import { assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";
import { builderRateLimit } from "@/lib/api-guard";
import { ligueyEnabled } from "@/lib/live/app-access";
const proposal = z.object({
  action: z.literal("propose"),
  id: z.uuid(),
  applicationId: z.uuid(),
  startsAt: z.iso.datetime({ offset: true }),
  endsAt: z.iso.datetime({ offset: true }),
  kind: z.enum(["online", "office"]),
});
const response = z.object({
  action: z.literal("respond"),
  id: z.uuid(),
  revision: z.number().int().positive(),
  status: z.enum(["accepted", "declined", "cancelled"]),
});
export async function GET(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const id = new URL(req.url).searchParams.get("businessId");
  if (id && !z.uuid().safeParse(id).success)
    return NextResponse.json({ error: "Invalid company." }, { status: 400 });
  const r = await auth.supabase.rpc("liguey_interview_state", {
    p_business: id,
  });
  return r.error
    ? NextResponse.json(
        { error: "Could not load interviews." },
        { status: 503 },
      )
    : NextResponse.json(
        { ...r.data, userId: auth.user.id },
        { headers: { "Cache-Control": "private, no-store" } },
      );
}
export async function POST(req: Request) {
  const blocked = assertSameOriginMutation(req);
  if (blocked) return blocked;
  const limited = builderRateLimit(req);
  if (limited) return limited;
  if (!ligueyEnabled())
    return NextResponse.json(
      { error: "Liguey is not enabled here." },
      { status: 503 },
    );
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const parsed = z
    .discriminatedUnion("action", [proposal, response])
    .safeParse(await readCompanyJson(req));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Check the interview details." },
      { status: 400 },
    );
  const p = parsed.data;
  const r =
    p.action === "propose"
      ? await auth.supabase.rpc("liguey_propose_interview", {
          p_id: p.id,
          p_application: p.applicationId,
          p_start: p.startsAt,
          p_end: p.endsAt,
          p_kind: p.kind,
        })
      : await auth.supabase.rpc("liguey_respond_interview", {
          p_id: p.id,
          p_revision: p.revision,
          p_status: p.status,
        });
  return r.error || !r.data
    ? NextResponse.json(
        {
          error:
            "Could not save. Check the company review, participant availability and current invitation status, then refresh.",
        },
        { status: 409 },
      )
    : NextResponse.json({ saved: true });
}
