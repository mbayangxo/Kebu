import { readCompanyJson } from "@/lib/company/read-request";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";
import { assertEmployerManager } from "@/lib/liguey/assert-employer-manager";
import { assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";
import { ligueyEnabled } from "@/lib/live/app-access";
const schema = z.object({
  country: z.string().regex(/^[A-Z]{2}$/),
  authority: z.string().trim().min(2).max(160),
  number: z.string().trim().min(2).max(120),
  url: z
    .url()
    .max(2000)
    .refine((s) => s.startsWith("https://")),
  recruiter: z.string().trim().min(2).max(120),
  office: z.string().trim().max(500),
});
type Params = { params: Promise<{ businessId: string }> };
export async function GET(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { businessId } = await params;
  if (!(await assertEmployerManager(auth.supabase, businessId, auth.user.id)))
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  const result = await auth.supabase
    .from("business_employer_verifications")
    .select("*")
    .eq("business_id", businessId)
    .maybeSingle();
  return result.error
    ? NextResponse.json(
        { error: "Employer review is unavailable." },
        { status: 503 },
      )
    : NextResponse.json(
        { review: result.data },
        { headers: { "Cache-Control": "private, no-store" } },
      );
}
export async function POST(req: Request, { params }: Params) {
  const blocked = assertSameOriginMutation(req);
  if (blocked) return blocked;
  if (!ligueyEnabled())
    return NextResponse.json(
      { error: "Liguey is not enabled here." },
      { status: 503 },
    );
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { businessId } = await params;
  if (!(await assertEmployerManager(auth.supabase, businessId, auth.user.id)))
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  const parsed = schema.safeParse(await readCompanyJson(req));
  if (!parsed.success)
    return NextResponse.json(
      {
        error:
          "Enter the company registration, recruiter and official registry link.",
      },
      { status: 400 },
    );
  const p = parsed.data;
  const result = await auth.supabase.rpc("liguey_request_verification", {
    p_business: businessId,
    p_country: p.country,
    p_authority: p.authority,
    p_number: p.number,
    p_url: p.url,
    p_recruiter: p.recruiter,
    p_office: p.office,
  });
  return result.error
    ? NextResponse.json(
        {
          error:
            "Could not submit. Add Liguey first and verify your company access.",
        },
        { status: 409 },
      )
    : NextResponse.json({ submitted: true });
}
