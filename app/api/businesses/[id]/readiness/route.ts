import { NextResponse } from "next/server";
import { requireUser, logCreate } from "@/lib/create/auth";
import { recalculateAndStoreReadiness } from "@/lib/kebu-id/create-registration";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/**
 * Recalculate Business Readiness server-side.
 * Rejects any client-supplied score body.
 */
export async function POST(req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id } = await params;

  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid business id." }, { status: 400 });
  }

  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      const text = await req.text();
      if (text.trim()) {
        const body = JSON.parse(text) as unknown;
        if (body && typeof body === "object" && Object.keys(body as object).length > 0) {
          return NextResponse.json(
            { error: "Score calculation accepts no client score fields." },
            { status: 400 }
          );
        }
      }
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }
  }

  const { data: membership } = await supabase
    .from("business_members")
    .select("role, status")
    .eq("business_id", id)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!membership || !["founder", "administrator"].includes(membership.role)) {
    return NextResponse.json({ error: "Business not found." }, { status: 404 });
  }

  const result = await recalculateAndStoreReadiness({ supabase, businessId: id });
  if (!result.ok) {
    logCreate("business.readiness_failed", { userId: user.id, businessId: id, error: result.error });
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ readiness: result.score });
}
