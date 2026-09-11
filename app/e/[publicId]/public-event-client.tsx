"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DataModeProvider,
  useDataMode,
} from "@/app/components/create/data-mode-provider";
import { enqueueEventRegister, isBrowserOnline } from "@/lib/create/offline-queue";
import { measureResponseBytes } from "@/lib/create/kb-budget";
import { whatsAppOrderHref } from "@/lib/create/site-commerce";
import { KEBU } from "@/lib/kebu-brand";

type Ticket = { id: string; name: string; priceXof: number; capacity: number | null };
type EventPublic = {
  publicId: string;
  title: string;
  summary: string;
  venue: string;
  city: string;
  countryCode: string;
  startsAt: string;
  endsAt: string | null;
  mode: string;
  whatsappPhone: string;
  capacity: number | null;
  registeredCount: number;
};

function PublicEventForm({ publicId }: { publicId: string }) {
  const { mode, reportKb, online } = useDataMode();
  const [event, setEvent] = useState<EventPublic | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [qty, setQty] = useState(1);
  const [ticketId, setTicketId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [syncNote, setSyncNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/public/events/${encodeURIComponent(publicId)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Event not found.");
        setEvent(null);
        return;
      }
      setEvent(data.event as EventPublic);
      const t = (data.tickets ?? []) as Ticket[];
      setTickets(t);
      if (t[0]) setTicketId(t[0].id);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }, [publicId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!event) return;
    setBusy(true);
    setError(null);
    setSyncNote(null);

    const payload = {
      publicId,
      guestName: name,
      guestPhone: phone,
      guestEmail: email.trim() || undefined,
      quantity: qty,
      ticketTypeId: event.mode === "ticketed" ? ticketId || undefined : undefined,
    };

    if (!isBrowserOnline() || mode === "offline" || !online) {
      enqueueEventRegister(payload);
      setDone(null);
      setSyncNote(
        "Queued on this phone — not saved on Kebu yet. When you are online, tap Sync on the Data mode control.",
      );
      setBusy(false);
      return;
    }

    try {
      const res = await fetch(`/api/public/events/${encodeURIComponent(publicId)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Kebu-Data-Mode": mode,
        },
        body: JSON.stringify({
          guestName: name,
          guestPhone: phone,
          guestEmail: email.trim() || undefined,
          quantity: qty,
          ticketTypeId: event.mode === "ticketed" ? ticketId : undefined,
        }),
      });
      const bytes = await measureResponseBytes(res);
      reportKb("event_register", bytes);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not register.");
        return;
      }
      setDone(typeof data.message === "string" ? data.message : "Registered.");
      const wa = typeof data.whatsappPhone === "string" ? data.whatsappPhone : event.whatsappPhone;
      if (wa && data.amountXof > 0) {
        const href = whatsAppOrderHref(
          wa,
          `Hi — I registered for ${event.title}. Registration ${data.registrationId}. Paying ${data.amountXof} XOF.`,
        );
        if (href) window.open(href, "_blank", "noopener,noreferrer");
      }
    } catch {
      enqueueEventRegister(payload);
      setSyncNote("Network failed — registration queued locally. Sync when you reconnect.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-lg px-6 py-16">
        <p className="text-sm opacity-70">Loading event…</p>
      </main>
    );
  }

  if (error && !event) {
    return (
      <main className="mx-auto max-w-lg px-6 py-16">
        <h1 className="text-2xl font-bold">Event</h1>
        <p className="mt-3 text-sm" style={{ color: "#8B1E1E" }}>{error}</p>
      </main>
    );
  }

  if (!event) return null;

  const when = new Date(event.startsAt).toLocaleString(undefined, {
    dateStyle: "full",
    timeStyle: "short",
  });

  return (
    <main
      className="mx-auto min-h-[70vh] max-w-lg px-6 py-12"
      style={{ background: `linear-gradient(180deg, ${KEBU.cream} 0%, #fff 40%)` }}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: KEBU.orange }}>
        Kebu event
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight" style={{ color: KEBU.black }}>
        {event.title}
      </h1>
      <p className="mt-2 text-sm font-medium opacity-80">{when}</p>
      {(event.venue || event.city) && (
        <p className="mt-1 text-sm opacity-70">
          {[event.venue, event.city, event.countryCode].filter(Boolean).join(" · ")}
        </p>
      )}
      {event.summary ? (
        <p className="mt-4 text-sm leading-relaxed opacity-80">{event.summary}</p>
      ) : null}
      {event.capacity != null ? (
        <p className="mt-2 text-xs opacity-60">
          {event.registeredCount} registered
          {event.capacity ? ` · capacity ${event.capacity}` : ""}
        </p>
      ) : null}

      {done ? (
        <p className="mt-8 rounded-2xl px-4 py-3 text-sm" style={{ background: KEBU.cream }}>
          {done}
        </p>
      ) : syncNote ? (
        <p className="mt-8 text-sm" style={{ color: "#B45309" }}>
          {syncNote}
        </p>
      ) : (
        <form className="mt-8 space-y-3" onSubmit={(e) => void submit(e)}>
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">
            {event.mode === "ticketed" ? "Get tickets" : "RSVP"}
          </p>
          {event.mode === "ticketed" && tickets.length > 0 ? (
            <select
              required
              value={ticketId}
              onChange={(e) => setTicketId(e.target.value)}
              className="w-full rounded-xl border px-3 py-2.5 text-sm"
            >
              {tickets.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} — {t.priceXof.toLocaleString()} XOF
                </option>
              ))}
            </select>
          ) : null}
          <input
            required
            maxLength={80}
            placeholder="Your name"
            onChange={(e) => setName(e.target.value)}
            value={name}
            className="w-full rounded-xl border px-3 py-2.5 text-sm"
          />
          <input
            required
            maxLength={24}
            placeholder="WhatsApp / phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-xl border px-3 py-2.5 text-sm"
          />
          <input
            type="email"
            maxLength={254}
            placeholder="Email (optional)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border px-3 py-2.5 text-sm"
          />
          <input
            type="number"
            min={1}
            max={20}
            value={qty}
            onChange={(e) => setQty(Number(e.target.value) || 1)}
            className="w-full rounded-xl border px-3 py-2.5 text-sm"
          />
          {error ? <p className="text-sm" style={{ color: "#8B1E1E" }}>{error}</p> : null}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full py-3 text-xs font-bold uppercase tracking-wider text-white disabled:opacity-50"
            style={{ background: KEBU.black }}
          >
            {busy ? "Saving…" : event.mode === "ticketed" ? "Reserve ticket" : "Confirm RSVP"}
          </button>
          <p className="text-[11px] leading-relaxed opacity-60">
            Ticket money is confirmed only by the organizer (or a future payment webhook) — never because this
            form submitted. Offline? We queue on your phone until Sync.
          </p>
        </form>
      )}
    </main>
  );
}

export function PublicEventClient({ publicId }: { publicId: string }) {
  return (
    <DataModeProvider>
      <PublicEventForm publicId={publicId} />
    </DataModeProvider>
  );
}
