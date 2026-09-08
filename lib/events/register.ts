import type { SupabaseClient } from "@supabase/supabase-js";
import { eventRegisterSchema } from "@/lib/events/schema";

export type EventRegisterResult =
  | {
      ok: true;
      registrationId: string;
      paymentStatus: string;
      amountXof: number;
      status: string;
      message: string;
      whatsappPhone: string;
    }
  | { ok: false; error: string; status?: number };

/**
 * Public RSVP / ticket registration. Never marks paid.
 * Service-role client required (no anon insert RLS).
 */
export async function registerForEvent(
  admin: SupabaseClient,
  publicId: string,
  raw: unknown,
): Promise<EventRegisterResult> {
  const parsed = eventRegisterSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Invalid registration.", status: 400 };
  }
  const input = parsed.data;

  const { data: event, error: evErr } = await admin
    .from("business_events")
    .select(
      "id, business_id, title, status, mode, capacity, whatsapp_phone, starts_at",
    )
    .eq("public_id", publicId)
    .maybeSingle();

  if (evErr) {
    return {
      ok: false,
      error: evErr.message.includes("does not exist")
        ? "Events table missing. Apply migration 052_business_events.sql."
        : "Could not load event.",
      status: 500,
    };
  }
  if (!event) return { ok: false, error: "Event not found.", status: 404 };
  if (event.status !== "published") {
    return { ok: false, error: "This event is not open for registration.", status: 403 };
  }

  const { count: regCount } = await admin
    .from("event_registrations")
    .select("id", { count: "exact", head: true })
    .eq("event_id", event.id)
    .neq("status", "cancelled");

  const seatsTaken = typeof regCount === "number" ? regCount : 0;
  if (event.capacity != null && seatsTaken + input.quantity > event.capacity) {
    return { ok: false, error: "Not enough seats left for this event.", status: 409 };
  }

  let ticketTypeId: string | null = null;
  let amountXof = 0;
  let ticketName = "RSVP";

  if (event.mode === "ticketed") {
    if (!input.ticketTypeId) {
      return { ok: false, error: "Choose a ticket type.", status: 400 };
    }
    const { data: ticket } = await admin
      .from("event_ticket_types")
      .select("id, name, price_xof, capacity, active")
      .eq("id", input.ticketTypeId)
      .eq("event_id", event.id)
      .maybeSingle();
    if (!ticket || !ticket.active) {
      return { ok: false, error: "Ticket type not available.", status: 400 };
    }
    if (ticket.capacity != null) {
      const { count: sold } = await admin
        .from("event_registrations")
        .select("id", { count: "exact", head: true })
        .eq("ticket_type_id", ticket.id)
        .neq("status", "cancelled");
      const soldN = typeof sold === "number" ? sold : 0;
      if (soldN + input.quantity > ticket.capacity) {
        return { ok: false, error: "That ticket tier is sold out.", status: 409 };
      }
    }
    ticketTypeId = ticket.id;
    amountXof = Math.max(0, ticket.price_xof) * input.quantity;
    ticketName = ticket.name;
  } else {
    // Free RSVP — ignore ticket type
    ticketTypeId = null;
    amountXof = 0;
  }

  const paymentStatus = amountXof > 0 ? "unpaid" : "waived";
  const status = amountXof > 0 ? "pending" : "confirmed";

  const { data: row, error: insErr } = await admin
    .from("event_registrations")
    .insert({
      event_id: event.id,
      business_id: event.business_id,
      ticket_type_id: ticketTypeId,
      guest_name: input.guestName,
      guest_phone: input.guestPhone,
      guest_email: input.guestEmail ?? null,
      quantity: input.quantity,
      amount_xof: amountXof,
      payment_status: paymentStatus,
      status,
      channel: input.channel === "offline_sync" ? "offline_sync" : "web",
      note: input.note ?? "",
    })
    .select("id")
    .single();

  if (insErr || !row) {
    return {
      ok: false,
      error: insErr?.message ?? "Could not save registration.",
      status: 500,
    };
  }

  const message =
    amountXof > 0
      ? `Registered for ${event.title} (${ticketName} × ${input.quantity}). Pay ${amountXof.toLocaleString()} XOF — Money stays unpaid until the organizer confirms.`
      : `RSVP confirmed for ${event.title}. See you there.`;

  return {
    ok: true,
    registrationId: row.id,
    paymentStatus,
    amountXof,
    status,
    message,
    whatsappPhone: event.whatsapp_phone || "",
  };
}
