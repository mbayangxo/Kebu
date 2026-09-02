import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

async function assertManager(supabase: import("@supabase/supabase-js").SupabaseClient, businessId: string, userId: string) {
  const { data } = await supabase
    .from("business_members")
    .select("role")
    .eq("business_id", businessId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  if (!data || !["founder", "administrator", "store_manager"].includes(data.role)) return false;
  return true;
}

/** List customer email subscribers for a business. */
export async function GET(_req: Request, { params }: Params) {
  const { id: businessId } = await params;
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  if (!(await assertManager(supabase, businessId, user.id))) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("business_email_subscribers")
    .select("id, email, name, source, project_id, consented_at, created_at")
    .eq("business_id", businessId)
    .is("unsubscribed_at", null)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    return NextResponse.json(
      { error: error.message.includes("does not exist") ? "Apply migration 025." : "Could not load subscribers." },
      { status: 500 },
    );
  }

  return NextResponse.json({ subscribers: data ?? [] });
}

const addSubscriberSchema = z.object({
  email: z.string().trim().email().max(254),
  name: z.string().trim().max(120).optional(),
});

/** Manually add a subscriber from the business dashboard. */
export async function POST(req: Request, { params }: Params) {
  const { id: businessId } = await params;
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  if (!(await assertManager(supabase, businessId, user.id))) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = addSubscriberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Valid email required." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("business_email_subscribers")
    .upsert(
      {
        business_id: businessId,
        email: parsed.data.email.toLowerCase(),
        name: parsed.data.name ?? null,
        source: "manual",
      },
      { onConflict: "business_id,email" },
    )
    .select("id, email, name, source, created_at")
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message.includes("does not exist") ? "Apply migration 025." : "Could not save subscriber." },
      { status: 500 },
    );
  }

  return NextResponse.json({ subscriber: data });
}
