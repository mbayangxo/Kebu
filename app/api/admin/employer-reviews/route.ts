import { readCompanyJson } from "@/lib/company/read-request";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  assertAdminCookie,
  assertSameOriginMutation,
} from "@/lib/admin/assert-admin-cookie";
import { createServiceClient } from "@/lib/opportunity/admin";
const schema = z.object({
  businessId: z.uuid(),
  revision: z.iso.datetime({ offset: true }),
  decision: z.enum(["approved", "rejected", "suspended"]),
  registry: z.boolean(),
  recruiter: z.boolean(),
  office: z.boolean(),
  note: z.string().trim().min(20).max(2000),
});
export async function GET(req: Request) {
  if (!(await assertAdminCookie(req)))
    return NextResponse.json(
      { error: "Kebu Record sign-in required." },
      { status: 401 },
    );
  const db = createServiceClient();
  if (!db)
    return NextResponse.json(
      { error: "Review service unavailable." },
      { status: 503 },
    );
  const reports = await db
    .from("liguey_safety_reports")
    .select("id,business_id,message,created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (reports.error)
    return NextResponse.json(
      { error: "Could not load safety reports." },
      { status: 503 },
    );
  const r = await db
    .from("business_employer_verifications")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(100);
  return r.error
    ? NextResponse.json({ error: "Could not load reviews." }, { status: 503 })
    : NextResponse.json(
        { reviews: r.data, reports: reports.data },
        { headers: { "Cache-Control": "private, no-store" } },
      );
}
export async function POST(req: Request) {
  const blocked = assertSameOriginMutation(req);
  if (blocked) return blocked;
  if (!(await assertAdminCookie(req)))
    return NextResponse.json(
      { error: "Kebu Record sign-in required." },
      { status: 401 },
    );
  const parsed = schema.safeParse(await readCompanyJson(req));
  if (!parsed.success)
    return NextResponse.json(
      {
        error:
          "Complete the checks and record what you verified (20–2,000 characters).",
      },
      { status: 400 },
    );
  const db = createServiceClient();
  if (!db)
    return NextResponse.json(
      { error: "Review service unavailable." },
      { status: 503 },
    );
  const p = parsed.data,
    r = await db.rpc("liguey_review_employer", {
      p_business: p.businessId,
      p_revision: p.revision,
      p_status: p.decision,
      p_registry: p.registry,
      p_recruiter: p.recruiter,
      p_office: p.office,
      p_note: p.note,
    });
  return r.error || !r.data
    ? NextResponse.json(
        {
          error:
            "The review changed or required evidence is missing. Reload before deciding.",
        },
        { status: 409 },
      )
    : NextResponse.json({ reviewed: true });
}
