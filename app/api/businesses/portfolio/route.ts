import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { companyPortalEnabled } from "@/lib/company/model";
export async function GET() {
  if (!companyPortalEnabled())
    return NextResponse.json(
      { error: "Company portfolio is not enabled here." },
      { status: 503 },
    );
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const r = await auth.supabase.rpc("company_portfolio");
  return r.error
    ? NextResponse.json(
        { error: "Could not load your companies." },
        { status: 503 },
      )
    : NextResponse.json(
        { companies: r.data, refreshedAt: new Date().toISOString() },
        { headers: { "Cache-Control": "private, no-store" } },
      );
}
