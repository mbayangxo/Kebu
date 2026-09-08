import { NextResponse } from "next/server";
import { requireUser, logCreate } from "@/lib/create/auth";
import { createBusinessEventSchema, newEventPublicId, eventPublicPath } from "@/lib/events/schema";
import type { SupabaseClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

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

/** List events for a business (owner portal). */
export async function GET(_req: Request, { params }: Params) {
  const { id: businessId } = await params;
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  if (!(await assertManager(supabase, businessId, user.id))) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("business_events")
    .select(
      "id, public_id, title, summary, venue, city, country_code, starts_at, ends_at, timezone, capacity, status, mode, whatsapp_phone, project_id, created_at, updated_at",
    )
    .eq("business_id", businessId)
    .order("starts_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json(
      {
        error: error.message.includes("does not exist")
          ? "Events missing. Apply migration 052_business_events.sql."
          : "Could not load events.",
        detail: error.message,
      },
      { status: 500 },
    );
  }

  const events = (data ?? []).map((e) => ({
    ...e,
    publicPath: eventPublicPath(e.public_id),
  }));

  return NextResponse.json({ events });
}

/** Create event (+ optional ticket types). */
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

  const parsed = createBusinessEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid event.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const input = parsed.data;
  const starts = new Date(input.startsAt);
  if (Number.isNaN(starts.getTime())) {
    return NextResponse.json({ error: "Invalid start date." }, { status: 400 });
  }

  if (input.mode === "ticketed" && (!input.tickets || input.tickets.length === 0)) {
    return NextResponse.json(
      { error: "Ticketed events need at least one ticket type (name + price XOF)." },
      { status: 400 },
    );
  }

  let publicId = newEventPublicId();
  for (let i = 0; i < 5; i += 1) {
    const { data: clash } = await supabase
      .from("business_events")
      .select("id")
      .eq("public_id", publicId)
      .maybeSingle();
    if (!clash) break;
    publicId = newEventPublicId();
  }

  const { data: event, error } = await supabase
    .from("business_events")
    .insert({
      business_id: businessId,
      project_id: input.projectId ?? null,
      public_id: publicId,
      title: input.title,
      summary: input.summary ?? "",
      venue: input.venue ?? "",
      city: input.city ?? "",
      country_code: input.countryCode ?? "",
      starts_at: starts.toISOString(),
      ends_at: input.endsAt ? new Date(input.endsAt).toISOString() : null,
      timezone: input.timezone ?? "Africa/Dakar",
      capacity: input.capacity ?? null,
      status: input.status ?? "draft",
      mode: input.mode ?? "rsvp",
      whatsapp_phone: input.whatsappPhone ?? "",
      created_by: user.id,
    })
    .select(
      "id, public_id, title, summary, venue, city, country_code, starts_at, ends_at, timezone, capacity, status, mode, whatsapp_phone, project_id, created_at",
    )
    .single();

  if (error || !event) {
    return NextResponse.json(
      {
        error: error?.message.includes("does not exist")
          ? "Events missing. Apply migration 052_business_events.sql."
          : error?.message ?? "Could not create event.",
      },
      { status: 500 },
    );
  }

  if (input.mode === "ticketed" && input.tickets?.length) {
    const rows = input.tickets.map((t, i) => ({
      event_id: event.id,
      business_id: businessId,
      name: t.name,
      price_xof: t.priceXof,
      capacity: t.capacity ?? null,
      sort_order: i,
      active: true,
    }));
    const { error: tErr } = await supabase.from("event_ticket_types").insert(rows);
    if (tErr) {
      logCreate("events.tickets_insert_failed", { eventId: event.id, message: tErr.message });
    }
  } else if (input.mode === "rsvp") {
    await supabase.from("event_ticket_types").insert({
      event_id: event.id,
      business_id: businessId,
      name: "RSVP",
      price_xof: 0,
      sort_order: 0,
      active: true,
    });
  }

  logCreate("events.created", { businessId, eventId: event.id, publicId });

  return NextResponse.json(
    {
      event: { ...event, publicPath: eventPublicPath(event.public_id) },
    },
    { status: 201 },
  );
}
