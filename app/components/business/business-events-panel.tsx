"use client";

import { useCallback, useEffect, useState } from "react";
import { KEBU } from "@/lib/kebu-brand";

type EventRow = {
  id: string;
  public_id: string;
  publicPath: string;
  title: string;
  starts_at: string;
  city: string;
  status: string;
  mode: string;
};

type RegRow = {
  id: string;
  guest_name: string;
  guest_phone: string;
  quantity: number;
  amount_xof: number;
  payment_status: string;
  status: string;
  created_at: string;
};

/**
 * Agency / business events — create, publish, see RSVPs & tickets.
 * For DkLNS: shows, listening parties, seeding nights, etc.
 */
export function BusinessEventsPanel({ businessId }: { businessId: string }) {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [regs, setRegs] = useState<RegRow[]>([]);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [venue, setVenue] = useState("");
  const [city, setCity] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [mode, setMode] = useState<"rsvp" | "ticketed">("rsvp");
  const [ticketName, setTicketName] = useState("General");
  const [ticketPrice, setTicketPrice] = useState(5000);
  const [whatsapp, setWhatsapp] = useState("");
  const [capacity, setCapacity] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/businesses/${businessId}/events`, { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not load events.");
        return;
      }
      setEvents((data.events ?? []) as EventRow[]);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function openEvent(id: string) {
    setSelectedId(id);
    setRegs([]);
    const res = await fetch(`/api/businesses/${businessId}/events/${id}`, { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setRegs((data.registrations ?? []) as RegRow[]);
    }
  }

  async function createEvent(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNote(null);
    setError(null);
    try {
      const starts = startsAt ? new Date(startsAt).toISOString() : "";
      const res = await fetch(`/api/businesses/${businessId}/events`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          summary,
          venue,
          city,
          startsAt: starts,
          mode,
          status: "draft",
          whatsappPhone: whatsapp,
          capacity: capacity ? Number(capacity) : null,
          tickets:
            mode === "ticketed"
              ? [{ name: ticketName || "General", priceXof: ticketPrice, capacity: null }]
              : [],
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not create event.");
        return;
      }
      setNote("Event created as draft. Publish when ready — guests use the public link.");
      setTitle("");
      setSummary("");
      await load();
      if (data.event?.id) void openEvent(data.event.id);
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  async function publish(id: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/businesses/${businessId}/events/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "published" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not publish.");
        return;
      }
      setNote(`Published. Share ${data.event?.publicPath ?? "/e/…"}`);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function markPaid(regId: string) {
    if (!selectedId) return;
    const res = await fetch(
      `/api/businesses/${businessId}/events/${selectedId}/registrations`,
      {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registrationId: regId,
          paymentStatus: "paid",
          status: "confirmed",
        }),
      },
    );
    if (res.ok) void openEvent(selectedId);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold" style={{ color: KEBU.black }}>
          Events
        </h2>
        <p className="mt-1 text-sm leading-relaxed" style={{ color: KEBU.muted }}>
          Shows, listening parties, seeding nights, brand activations — RSVP or ticketed. Guest data lives in
          Supabase. Offline guests queue on their phone until Sync. Ticket money stays unpaid until you mark
          paid (live PSP for events is a later slice).
        </p>
      </div>

      <form
        onSubmit={(e) => void createEvent(e)}
        className="space-y-3 rounded-2xl p-4"
        style={{ border: `1px solid ${KEBU.border}`, background: KEBU.cream }}
      >
        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
          New event
        </p>
        <input
          required
          maxLength={160}
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-xl border bg-white px-3 py-2 text-sm"
        />
        <textarea
          maxLength={800}
          placeholder="Summary"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          className="w-full min-h-[72px] rounded-xl border bg-white px-3 py-2 text-sm"
        />
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            placeholder="Venue"
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            className="rounded-xl border bg-white px-3 py-2 text-sm"
          />
          <input
            placeholder="City"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="rounded-xl border bg-white px-3 py-2 text-sm"
          />
        </div>
        <input
          required
          type="datetime-local"
          value={startsAt}
          onChange={(e) => setStartsAt(e.target.value)}
          className="w-full rounded-xl border bg-white px-3 py-2 text-sm"
        />
        <div className="grid gap-2 sm:grid-cols-2">
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as "rsvp" | "ticketed")}
            className="rounded-xl border bg-white px-3 py-2 text-sm"
          >
            <option value="rsvp">Free RSVP</option>
            <option value="ticketed">Ticketed</option>
          </select>
          <input
            placeholder="Capacity (optional)"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            className="rounded-xl border bg-white px-3 py-2 text-sm"
          />
        </div>
        {mode === "ticketed" ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              placeholder="Ticket name"
              value={ticketName}
              onChange={(e) => setTicketName(e.target.value)}
              className="rounded-xl border bg-white px-3 py-2 text-sm"
            />
            <input
              type="number"
              min={0}
              placeholder="Price XOF"
              value={ticketPrice}
              onChange={(e) => setTicketPrice(Number(e.target.value) || 0)}
              className="rounded-xl border bg-white px-3 py-2 text-sm"
            />
          </div>
        ) : null}
        <input
          placeholder="WhatsApp for pay / questions"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          className="w-full rounded-xl border bg-white px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white disabled:opacity-50"
          style={{ background: KEBU.orange }}
        >
          {busy ? "Saving…" : "Create event"}
        </button>
      </form>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      ) : null}
      {note ? (
        <p className="rounded-xl px-3 py-2 text-xs" style={{ background: KEBU.cream }}>
          {note}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm" style={{ color: KEBU.muted }}>
          Loading events…
        </p>
      ) : events.length === 0 ? (
        <p className="text-sm" style={{ color: KEBU.muted }}>
          No events yet — create one for DkLNS shows, seeding nights, or partner activations.
        </p>
      ) : (
        <ul className="space-y-2">
          {events.map((ev) => (
            <li
              key={ev.id}
              className="rounded-2xl p-3"
              style={{ border: `1px solid ${KEBU.border}`, background: "#fff" }}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <button type="button" className="text-left" onClick={() => void openEvent(ev.id)}>
                  <p className="text-sm font-semibold">{ev.title}</p>
                  <p className="text-[11px] opacity-60">
                    {new Date(ev.starts_at).toLocaleString()} · {ev.city || "—"} · {ev.mode} · {ev.status}
                  </p>
                </button>
                <div className="flex flex-wrap gap-2">
                  {ev.status !== "published" ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void publish(ev.id)}
                      className="rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white"
                      style={{ background: KEBU.black }}
                    >
                      Publish
                    </button>
                  ) : (
                    <a
                      href={ev.publicPath}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider"
                      style={{ border: `1px solid ${KEBU.border}` }}
                    >
                      Open link
                    </a>
                  )}
                </div>
              </div>
              {selectedId === ev.id ? (
                <div className="mt-3 border-t pt-3" style={{ borderColor: KEBU.border }}>
                  <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">
                    Registrations · {ev.publicPath}
                  </p>
                  {regs.length === 0 ? (
                    <p className="mt-1 text-xs opacity-60">No guests yet.</p>
                  ) : (
                    <ul className="mt-2 space-y-1.5 text-xs">
                      {regs.map((r) => (
                        <li key={r.id} className="flex flex-wrap items-center justify-between gap-2">
                          <span>
                            {r.guest_name} · {r.guest_phone} · ×{r.quantity} · {r.amount_xof.toLocaleString()}{" "}
                            XOF · {r.payment_status} / {r.status}
                          </span>
                          {r.payment_status !== "paid" && r.amount_xof > 0 ? (
                            <button
                              type="button"
                              className="underline font-semibold"
                              onClick={() => void markPaid(r.id)}
                            >
                              Mark paid
                            </button>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
