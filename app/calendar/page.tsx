"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { validStudioSaveReceipt } from "@/lib/studio/save-queue";
import { AppShell } from "@/app/components/app-shell";
import type { AccountWorkspaceContext } from "@/lib/account/workspace-context";
import { KEBU } from "@/lib/kebu-brand";

type EventRow = {
  id: string;
  title: string;
  body: string;
  start_at: string | null;
  end_at: string | null;
  status: string;
};

function monthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}
function monthEnd(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function CalendarPage() {
  const [cursor, setCursor] = useState(monthStart(new Date()));
  const [workspace, setWorkspace] = useState<AccountWorkspaceContext | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("09:00");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const createId = useRef<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const workspaceRes = await fetch("/api/me/workspace", { credentials: "include" });
      const workspaceData = await workspaceRes.json().catch(() => ({}));
      if (!workspaceRes.ok || !workspaceData.context) throw new Error("Could not confirm your Kebu space. Retry before adding events.");
      const context = workspaceData.context as AccountWorkspaceContext;
      setWorkspace(context);

      const params = new URLSearchParams({ kind: "event" });
      if (context?.activeBusinessId) params.set("businessId", context.activeBusinessId);
      else params.set("personal", "1");

      const res = await fetch("/api/work/items?" + params.toString(), { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not load calendar.");
      if (!Array.isArray(data.items)) throw new Error("Could not confirm calendar data.");
      setEvents(data.items); setReady(true);
    } catch (cause) { setReady(false); setError(cause instanceof Error && !(cause instanceof TypeError) ? cause.message : "Could not load calendar. Check your connection and retry."); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const days = useMemo(() => {
    const first = monthStart(cursor);
    const last = monthEnd(cursor);
    const start = new Date(first);
    start.setDate(first.getDate() - first.getDay());
    const end = new Date(last);
    end.setDate(last.getDate() + (6 - last.getDay()));
    const rows: Date[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) rows.push(new Date(d));
    return rows;
  }, [cursor]);

  const selectedEvents = events.filter((event) => event.start_at && sameDay(new Date(event.start_at), selectedDay));

  async function createEvent() {
    if (!ready || !title.trim() || busy) return;
    setBusy(true);
    setError(null);
    const id = createId.current ?? crypto.randomUUID(); createId.current = id;
    try {
      const [hours, minutes] = time.split(":").map(Number);
      const start = new Date(selectedDay);
      start.setHours(hours || 0, minutes || 0, 0, 0);
      const end = new Date(start.getTime() + 60 * 60 * 1000);

      const res = await fetch("/api/work/items", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id, kind: "event",
        title: title.trim(),
        body: notes,
        status: "open",
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        businessId: workspace?.activeBusinessId ?? null,
      }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.code === "work_create_conflict" && validStudioSaveReceipt(data.item, id)) createId.current = null;
      if (!res.ok || !validStudioSaveReceipt(data.item, id) || data.item.title !== title.trim() || data.item.body !== notes || Date.parse(data.item.start_at) !== start.getTime() || Date.parse(data.item.end_at) !== end.getTime() || data.item.kind !== "event" || data.item.business_id !== (workspace?.activeBusinessId ?? null)) throw new Error(data.error || "Could not confirm this event. Your details are kept.");
      setEvents((current) => [data.item, ...current.filter(event => event.id !== id)]);
      createId.current = null;
      setTitle("");
      setNotes("");
    } catch (cause) { setError(cause instanceof Error && !(cause instanceof TypeError) ? cause.message : "Could not add event. Your details are kept; retry when connected."); }
    finally { setBusy(false); }
  }

  return (
    <AppShell title="Calendar">
      <div className="mx-auto max-w-[1450px] px-4 py-6 sm:px-7">
        <header className="flex flex-col justify-between gap-4 border-b pb-5 sm:flex-row sm:items-end" style={{ borderColor: KEBU.borders.default }}>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.16em]" style={{ color: KEBU.orange }}>Calendar · {workspace?.activeBusiness?.name ?? "Personal Kebu"}</p>
            <h1 className="mt-2 text-4xl font-black tracking-[-.04em] sm:text-5xl" style={{ fontFamily: "var(--font-fraunces)" }}>Keep your world in sync.</h1>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} className="rounded-full border px-3 py-2 text-xs font-bold" style={{ borderColor: KEBU.borders.default }}>←</button>
            <button type="button" onClick={() => setCursor(monthStart(new Date()))} className="rounded-full border px-4 py-2 text-xs font-bold" style={{ borderColor: KEBU.borders.default }}>Today</button>
            <button type="button" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} className="rounded-full border px-3 py-2 text-xs font-bold" style={{ borderColor: KEBU.borders.default }}>→</button>
          </div>
        </header>

        {error ? <div role="alert" className="mt-4 rounded-xl border px-4 py-3 text-xs" style={{ borderColor: KEBU.status.errorBorder, background: KEBU.status.errorBg, color: KEBU.status.errorText }}>{error}</div> : null}

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="overflow-hidden rounded-[22px] border bg-white" style={{ borderColor: KEBU.borders.default }}>
            <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: KEBU.borders.default }}>
              <h2 className="text-lg font-black" style={{ fontFamily: "var(--font-fraunces)" }}>{cursor.toLocaleString(undefined, { month: "long", year: "numeric" })}</h2>
            </div>
            <div className="grid grid-cols-7 border-b text-center text-[9px] font-black uppercase tracking-[.12em]" style={{ borderColor: KEBU.borders.default, color: KEBU.muted }}>
              {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((day) => <div key={day} className="py-2">{day}</div>)}
            </div>
            <div className="grid grid-cols-7">
              {(ready ? days : []).map((day) => {
                const inMonth = day.getMonth() === cursor.getMonth();
                const dayEvents = events.filter((event) => event.start_at && sameDay(new Date(event.start_at), day)).slice(0, 3);
                const selected = sameDay(day, selectedDay);
                return (
                  <button key={day.toISOString()} type="button" onClick={() => setSelectedDay(day)} className="min-h-[110px] border-b border-r p-2 text-left outline-none transition hover:bg-black/[.02] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#FF6A00]" style={{ borderColor: KEBU.borders.subtle, background: selected ? "rgba(255,106,0,.06)" : undefined, opacity: inMonth ? 1 : .38 }}>
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black" style={{ background: sameDay(day, new Date()) ? KEBU.black : "transparent", color: sameDay(day, new Date()) ? "white" : KEBU.black }}>{day.getDate()}</span>
                    <div className="mt-2 space-y-1">
                      {dayEvents.map((event) => <div key={event.id} className="truncate rounded-md px-1.5 py-1 text-[8px] font-bold" style={{ background: "rgba(255,106,0,.10)", color: KEBU.black }}>{new Date(event.start_at!).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} · {event.title}</div>)}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <aside className="space-y-4">
            <button type="button" disabled={busy} onClick={() => void load()} className="min-h-11 text-xs underline">Reload calendar</button>
            <section className="rounded-[22px] border bg-white p-4" style={{ borderColor: KEBU.borders.default }}>
              <p className="text-[9px] font-black uppercase tracking-[.14em]" style={{ color: KEBU.orange }}>{ready ? selectedDay.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }) : "Loading calendar…"}</p>
              <h2 className="mt-1 text-lg font-black">Schedule</h2>
              <div className="mt-3 space-y-2">
                {selectedEvents.length ? selectedEvents.map((event) => <article key={event.id} className="rounded-xl bg-black/[.025] p-3"><p className="text-[11px] font-black">{event.title}</p><p className="mt-1 text-[9px]" style={{ color: KEBU.orange }}>{new Date(event.start_at!).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</p>{event.body ? <p className="mt-2 text-[9px] leading-relaxed" style={{ color: KEBU.muted }}>{event.body}</p> : null}</article>) : <p className="text-[10px]" style={{ color: KEBU.muted }}>Nothing scheduled.</p>}
              </div>
            </section>

            <section className="rounded-[22px] border bg-white p-4" style={{ borderColor: KEBU.borders.default }}>
              <p className="text-[9px] font-black uppercase tracking-[.14em]" style={{ color: KEBU.orange }}>New event</p>
              <input aria-label="Event title" disabled={!ready || busy} maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Event title" className="mt-3 min-h-10 w-full rounded-xl border px-3 text-xs font-bold outline-none focus:ring-2 focus:ring-[#FF6A00]" style={{ borderColor: KEBU.borders.default }} />
              <input aria-label="Event time" disabled={!ready || busy} type="time" value={time} onChange={(event) => setTime(event.target.value)} className="mt-2 min-h-10 w-full rounded-xl border px-3 text-xs outline-none" style={{ borderColor: KEBU.borders.default }} />
              <textarea aria-label="Event notes" disabled={!ready || busy} maxLength={20000} value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} placeholder="Notes" className="mt-2 w-full rounded-xl border px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#FF6A00]" style={{ borderColor: KEBU.borders.default }} />
              <button type="button" disabled={!ready || !title.trim() || busy} onClick={() => void createEvent()} className="mt-3 rounded-full px-4 py-2.5 text-[10px] font-black uppercase tracking-wide text-white disabled:opacity-35" style={{ background: "linear-gradient(90deg,#FF6A00,#FF1F1F)" }}>{busy ? "Saving…" : "Add event →"}</button>
            </section>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
