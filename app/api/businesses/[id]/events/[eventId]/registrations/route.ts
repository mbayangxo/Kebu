import { NextResponse } from "next/server";
import { requireUser, logCreate } from "@/lib/create/auth";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string; eventId: string }> };

const patchSchema = z.object({
  registrationId: z.string().uuid(),
  paymentStatus: z.enum(["unpaid", "awaiting_payment", "paid", "waived", "failed"]).optional(),
  status: z.enum(["pending", "confirmed", "cancelled", "checked_in"]).optional(),
});

async function assertManager(supabase: SupabaseClient, businessId: string, userId: string) {
  const { data } = await supabase
    .from("business_members")
    .select("role")
    .eq("business_id", businessId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  return Boolean(data && ["founder", "administrator", "store_manager"].includes(data.role));
}

/** Owner updates registration payment / check-in — browser cannot invent paid without this authz. */
export async function PATCH(req: Request, { params }: Params) {
  const { id: businessId, eventId } = await params;
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

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid update." }, { status: 400 });
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (parsed.data.paymentStatus) patch.payment_status = parsed.data.paymentStatus;
  if (parsed.data.status) patch.status = parsed.data.status;

  const { data, error } = await supabase
    .from("event_registrations")
    .update(patch)
    .eq("id", parsed.data.registrationId)
    .eq("event_id", eventId)
    .eq("business_id", businessId)
    .select("id, payment_status, status")
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Registration not found." }, { status: 404 });
  }

  logCreate("events.registration_updated", {
    businessId,
    eventId,
    registrationId: data.id,
    paymentStatus: data.payment_status,
    status: data.status,
  });

  return NextResponse.json({ registration: data });
}
