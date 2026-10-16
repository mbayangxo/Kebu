import { assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";

export const dynamic = "force-dynamic";

const submitSchema = z.object({
  listingId: z.string().uuid(),
  businessId: z.string().uuid(),
  coverNote: z.string().max(4000).default(""),
});
const withdrawSchema = z.object({ applicationId: z.string().uuid() });

const APPLICATION_COLUMNS = "id, listing_id, business_id, applicant_user_id, cover_note, status, decided_at, decided_by, created_at, updated_at";

/** List the signed-in worker's own applications, with each listing's title. */
export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const { data: applications, error } = await supabase
    .from("job_applications")
    .select(APPLICATION_COLUMNS)
    .eq("applicant_user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Could not load your applications." }, { status: 503 });

  const listingIds = [...new Set((applications ?? []).map((a) => a.listing_id))];
  let listings: { id: string; title: string; status: string }[] = [];
  if (listingIds.length) {
    const { data } = await supabase.from("job_listings").select("id, title, status").in("id", listingIds);
    listings = data ?? [];
  }

  return NextResponse.json({ applications: applications ?? [], listings });
}

/** Submit an application to a published listing. */
export async function POST(req: Request) {
  const blocked = assertSameOriginMutation(req);
  if (blocked) return blocked;
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid application.", issues: parsed.error.flatten() }, { status: 400 });

  const { data, error } = await supabase
    .from("job_applications")
    .insert({
      listing_id: parsed.data.listingId,
      business_id: parsed.data.businessId,
      applicant_user_id: user.id,
      cover_note: parsed.data.coverNote,
    })
    .select(APPLICATION_COLUMNS)
    .single();

  if (error?.code === "23505") return NextResponse.json({ error: "You already applied to this listing." }, { status: 409 });
  if (error || !data) return NextResponse.json({ error: "Could not submit this application. The listing may no longer be open." }, { status: 403 });
  return NextResponse.json({ application: data }, { status: 201 });
}

/** Withdraw the worker's own application. */
export async function PATCH(req: Request) {
  const blocked = assertSameOriginMutation(req);
  if (blocked) return blocked;
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  const parsed = withdrawSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const { data, error } = await supabase
    .from("job_applications")
    .update({ status: "withdrawn" })
    .eq("id", parsed.data.applicationId)
    .eq("applicant_user_id", user.id)
    .select("id, status")
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Could not withdraw this application." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Application not found." }, { status: 404 });
  return NextResponse.json({ application: data });
}
