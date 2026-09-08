import { NextResponse } from "next/server";
import { requireUser, logCreate } from "@/lib/create/auth";
import { updateBusinessEventSchema, eventPublicPath } from "@/lib/events/schema";
import type { SupabaseClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string; eventId: string }> };

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

/** Event detail + ticket types + recent registrations. */
export async function GET(_req: Request, { params }: Params) {
  const { id: businessId, eventId } = await params;
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  if (!(await assertManager(supabase, businessId, user.id))) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }

  const { data: event, error } = await supabase
    .from("business_events")
    .select(
      "id, public_id, title, summary, venue, city, country_code, starts_at, ends_at, timezone, capacity, status, mode, whatsapp_phone, project_id, created_at, updated_at",
    )
    .eq("id", eventId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (error || !event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  const { data: tickets } = await supabase
    .from("event_ticket_types")
    .select("id, name, price_xof, capacity, sort_order, active")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true });

  const { data: registrations } = await supabase
    .from("event_registrations")
    .select(
      "id, guest_name, guest_phone, guest_email, quantity, amount_xof, payment_status, status, channel, ticket_type_id, created_at",
    )
    .eq("event_id", eventId)
    .order("created_at", { ascending: false })
    .limit(200);

  return NextResponse.json({
    event: { ...event, publicPath: eventPublicPath(event.public_id) },
    tickets: tickets ?? [],
    registrations: registrations ?? [],
  });
}

/** Publish / update event fields. */
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

  const parsed = updateBusinessEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid update.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const input = parsed.data;
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.title != null) patch.title = input.title;
  if (input.summary != null) patch.summary = input.summary;
  if (input.venue != null) patch.venue = input.venue;
  if (input.city != null) patch.city = input.city;
  if (input.countryCode != null) patch.country_code = input.countryCode;
  if (input.startsAt != null) patch.starts_at = new Date(input.startsAt).toISOString();
  if (input.endsAt !== undefined) {
    patch.ends_at = input.endsAt ? new Date(input.endsAt).toISOString() : null;
  }
  if (input.timezone != null) patch.timezone = input.timezone;
  if (input.capacity !== undefined) patch.capacity = input.capacity;
  if (input.status != null) patch.status = input.status;
  if (input.mode != null) patch.mode = input.mode;
  if (input.whatsappPhone != null) patch.whatsapp_phone = input.whatsappPhone;
  if (input.projectId !== undefined) patch.project_id = input.projectId;

  const { data: event, error } = await supabase
    .from("business_events")
    .update(patch)
    .eq("id", eventId)
    .eq("business_id", businessId)
    .select(
      "id, public_id, title, summary, venue, city, country_code, starts_at, ends_at, timezone, capacity, status, mode, whatsapp_phone, project_id, updated_at",
    )
    .maybeSingle();

  if (error || !event) {
    return NextResponse.json({ error: error?.message ?? "Event not found." }, { status: 404 });
  }

  logCreate("events.updated", { businessId, eventId, status: event.status });

  return NextResponse.json({
    event: { ...event, publicPath: eventPublicPath(event.public_id) },
  });
}
