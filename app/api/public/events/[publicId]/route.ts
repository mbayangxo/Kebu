import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/opportunity/admin";
import { publicSiteRateLimit } from "@/lib/api-guard";
import { eventPublicPath } from "@/lib/events/schema";
import { registerForEvent } from "@/lib/events/register";
import { logCreate } from "@/lib/create/auth";
import { kebuTransferHeaders, parseDataModeHeader } from "@/lib/create/kb-budget";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ publicId: string }> };

/** Public event page data (published only). */
export async function GET(_req: Request, { params }: Params) {
  const { publicId: raw } = await params;
  const publicId = raw.trim().toLowerCase();
  const admin = createServiceClient();
  if (!admin) {
    return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
  }

  const { data: event, error } = await admin
    .from("business_events")
    .select(
      "id, public_id, title, summary, venue, city, country_code, starts_at, ends_at, timezone, capacity, status, mode, whatsapp_phone",
    )
    .eq("public_id", publicId)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      {
        error: error.message.includes("does not exist")
          ? "Events missing. Apply migration 052_business_events.sql."
          : "Could not load event.",
      },
      { status: 500 },
    );
  }
  if (!event || event.status !== "published") {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  const { data: tickets } = await admin
    .from("event_ticket_types")
    .select("id, name, price_xof, capacity, active")
    .eq("event_id", event.id)
    .eq("active", true)
    .order("sort_order", { ascending: true });

  const { count } = await admin
    .from("event_registrations")
    .select("id", { count: "exact", head: true })
    .eq("event_id", event.id)
    .neq("status", "cancelled");

  return NextResponse.json({
    event: {
      publicId: event.public_id,
      title: event.title,
      summary: event.summary,
      venue: event.venue,
      city: event.city,
      countryCode: event.country_code,
      startsAt: event.starts_at,
      endsAt: event.ends_at,
      timezone: event.timezone,
      capacity: event.capacity,
      mode: event.mode,
      whatsappPhone: event.whatsapp_phone,
      publicPath: eventPublicPath(event.public_id),
      registeredCount: typeof count === "number" ? count : 0,
    },
    tickets: (tickets ?? []).map((t) => ({
      id: t.id,
      name: t.name,
      priceXof: t.price_xof,
      capacity: t.capacity,
    })),
  });
}

/** Public RSVP / buy ticket — never marks paid. */
export async function POST(req: Request, { params }: Params) {
  const limited = publicSiteRateLimit(req);
  if (limited) return limited;

  const { publicId: raw } = await params;
  const publicId = raw.trim().toLowerCase();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const admin = createServiceClient();
  if (!admin) {
    return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
  }

  const offline = req.headers.get("x-kebu-offline-sync") === "1";
  const payload =
    typeof body === "object" && body
      ? { ...(body as Record<string, unknown>), channel: offline ? "offline_sync" : "web" }
      : body;

  const result = await registerForEvent(admin, publicId, payload);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
  }

  logCreate("events.registration_created", {
    publicId,
    registrationId: result.registrationId,
    paymentStatus: result.paymentStatus,
    offline,
  });

  const responseBody = {
    registrationId: result.registrationId,
    paymentStatus: result.paymentStatus,
    amountXof: result.amountXof,
    status: result.status,
    paid: false as const,
    message: result.message,
    whatsappPhone: result.whatsappPhone,
  };
  const bytes = Buffer.byteLength(JSON.stringify(responseBody), "utf8");
  return NextResponse.json(responseBody, {
    status: 201,
    headers: kebuTransferHeaders(bytes, "event_register", parseDataModeHeader(req)),
  });
}
