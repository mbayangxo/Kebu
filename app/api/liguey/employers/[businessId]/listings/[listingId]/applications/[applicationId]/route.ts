import { assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";
import { assertEmployerManager } from "@/lib/liguey/assert-employer-manager";
import { applicationStatusSchema } from "@/lib/liguey/job-listing";

export const dynamic = "force-dynamic";

const decisionSchema = z.object({ status: applicationStatusSchema });

type Params = { params: Promise<{ businessId: string; listingId: string; applicationId: string }> };

/** A manager decides on an application. decided_at/decided_by are stamped by the DB trigger — never client-supplied. */
export async function PATCH(req: Request, { params }: Params) {
  const blocked = assertSameOriginMutation(req);
  if (blocked) return blocked;
  const { businessId, listingId, applicationId } = await params;
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  if (!(await assertEmployerManager(supabase, businessId, user.id))) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  const parsed = decisionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid decision." }, { status: 400 });

  const { data, error } = await supabase
    .from("job_applications")
    .update({ status: parsed.data.status })
    .eq("id", applicationId)
    .eq("listing_id", listingId)
    .eq("business_id", businessId)
    .select("id, status, decided_at, decided_by")
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Could not update this application." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Application not found." }, { status: 404 });
  return NextResponse.json({ application: data });
}
