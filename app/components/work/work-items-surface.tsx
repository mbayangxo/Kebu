"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/app/components/app-shell";
import { KebuIcon } from "@/app/components/kebu/kebu-icon";
import { KEBU } from "@/lib/kebu-brand";
import type { WorkItemKind, WorkItemRow } from "@/lib/work/items";

const COPY: Record<WorkItemKind, { eyebrow: string; title: string; description: string; noun: string }> = {
  task: { eyebrow: "Work", title: "Tasks", description: "Small, clear next steps across your personal and business spaces.", noun: "task" },
  event: { eyebrow: "Time", title: "Calendar", description: "Keep meetings, deadlines and important moments next to the work they belong to.", noun: "event" },
  doc: { eyebrow: "Write", title: "Docs", description: "Notes and working documents that stay inside the same Kebu account as everything else.", noun: "document" },
};

function localInputValue(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function WorkItemsSurface({ kind }: { kind: WorkItemKind }) {
  const copy = COPY[kind];
  const [items, setItems] = useState<WorkItemRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [dateValue, setDateValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/work/items?kind=" + kind, { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || "Could not load " + copy.title.toLowerCase() + "."); return; }
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch {
      setError("Network error.");
    }
  }, [copy.title, kind]);

  useEffect(() => { void load(); }, [load]);

  const selected = useMemo(() => items.find((item) => item.id === selectedId) ?? null, [items, selectedId]);

  async function createItem() {
    if (!title.trim() || busy) return;
    setBusy(true);
    setError(null);
    const payload: Record<string, unknown> = {
      kind,
      title: title.trim(),
      body,
      status: kind === "doc" ? "draft" : "open",
    };
    if (kind === "task" && dateValue) payload.dueAt = new Date(dateValue).toISOString();
    if (kind === "event" && dateValue) {
      payload.startAt = new Date(dateValue).toISOString();
      payload.endAt = new Date(new Date(dateValue).getTime() + 60 * 60 * 1000).toISOString();
    }
    const res = await fetch("/api/work/items", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(data.error || "Could not create " + copy.noun + "."); return; }
    setItems((current) => [data.item, ...current]);
    setSelectedId(data.item.id);
    setTitle("");
    setBody("");
    setDateValue("");
    setCreating(false);
  }

  async function patchItem(id: string, patch: Record<string, unknown>) {
    const previous = items;
    setItems((current) => current.map((item) => item.id === id ? { ...item, ...patch } as WorkItemRow : item));
    const res = await fetch("/api/work/items", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
    if (!res.ok) {
      setItems(previous);
      setError("Could not save that change.");
      return;
    }
    const data = await res.json().catch(() => ({}));
    if (data.item) setItems((current) => current.map((item) => item.id === id ? data.item : item));
  }

  async function removeItem(id: string) {
    const previous = items;
    setItems((current) => current.filter((item) => item.id !== id));
    setSelectedId((current) => current === id ? null : current);
    const res = await fetch("/api/work/items?id=" + encodeURIComponent(id), { method: "DELETE", credentials: "include" });
    if (!res.ok) {
      setItems(previous);
      setError("Could not delete that item.");
    }
  }

  return (
    <AppShell title={copy.title}>
      <div className="mx-auto max-w-[1380px] px-4 py-6 sm:px-7">
        <header className="flex flex-col justify-between gap-4 border-b pb-6 sm:flex-row sm:items-end" style={{ borderColor: KEBU.borders.default }}>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.16em]" style={{ color: KEBU.orange }}>{copy.eyebrow}</p>
            <h1 className="mt-2 text-4xl font-black tracking-[-.04em] sm:text-5xl" style={{ fontFamily: "var(--font-fraunces)" }}>{copy.title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed" style={{ color: KEBU.muted }}>{copy.description}</p>
          </div>
          <button type="button" onClick={() => setCreating(true)} className="rounded-full px-5 py-2.5 text-xs font-black text-white" style={{ background: "linear-gradient(90deg,#FF6A00,#FF1F1F)" }}>+ New {copy.noun}</button>
        </header>

        {error ? <div className="mt-4 rounded-xl border px-4 py-3 text-xs font-semibold" style={{ borderColor: KEBU.status.errorBorder, background: KEBU.status.errorBg, color: KEBU.status.errorText }}>{error}</div> : null}

        {creating ? (
          <section className="mt-5 rounded-[22px] border bg-white p-4" style={{ borderColor: KEBU.borders.strong }}>
            <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
              <div>
                <input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder={"Name this " + copy.noun} className="min-h-11 w-full rounded-xl border px-3 text-sm font-bold outline-none focus:ring-2 focus:ring-[#FF6A00]" style={{ borderColor: KEBU.borders.default }} />
                {kind === "doc" ? <textarea value={body} onChange={(event) => setBody(event.target.value)} rows={5} placeholder="Start writing…" className="mt-2 w-full rounded-xl border px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-[#FF6A00]" style={{ borderColor: KEBU.borders.default }} /> : null}
              </div>
              {kind !== "doc" ? <label className="text-[10px] font-black uppercase tracking-wide" style={{ color: KEBU.muted }}>{kind === "task" ? "Due" : "Starts"}<input type="datetime-local" value={dateValue} onChange={(event) => setDateValue(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border bg-white px-3 text-xs font-semibold outline-none focus:ring-2 focus:ring-[#FF6A00]" style={{ borderColor: KEBU.borders.default }} /></label> : null}
            </div>
            <div className="mt-3 flex gap-2">
              <button type="button" disabled={!title.trim() || busy} onClick={() => void createItem()} className="rounded-full bg-black px-4 py-2 text-[10px] font-black uppercase tracking-wide text-white disabled:opacity-40">{busy ? "Saving…" : "Create"}</button>
              <button type="button" onClick={() => setCreating(false)} className="rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-wide" style={{ borderColor: KEBU.borders.default }}>Cancel</button>
            </div>
          </section>
        ) : null}

        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
          <section className="overflow-hidden rounded-[22px] border bg-white" style={{ borderColor: KEBU.borders.default }}>
            {items.length ? items.map((item, index) => {
              const active = item.id === selectedId;
              const when = kind === "task" ? item.due_at : kind === "event" ? item.start_at : item.updated_at;
              return (
                <button key={item.id} type="button" onClick={() => setSelectedId(item.id)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left outline-none transition hover:bg-black/[.02] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#FF6A00]" style={{ borderTop: index ? "1px solid " + KEBU.borders.subtle : undefined, background: active ? "rgba(255,106,0,.06)" : undefined }}>
                  {kind === "task" ? (
                    <span role="checkbox" aria-checked={item.status === "done"} onClick={(event) => { event.stopPropagation(); void patchItem(item.id, { status: item.status === "done" ? "open" : "done" }); }} className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px]" style={{ borderColor: item.status === "done" ? KEBU.orange : KEBU.borders.strong, background: item.status === "done" ? KEBU.orange : "white", color: "white" }}>{item.status === "done" ? "✓" : ""}</span>
                  ) : (
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]" style={{ background: KEBU.cream, color: KEBU.orange }}><KebuIcon name={kind === "event" ? "calendar" : "work"} size={16} /></span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className={"block truncate text-[12px] font-bold " + (item.status === "done" ? "line-through opacity-45" : "")}>{item.title}</span>
                    <span className="mt-0.5 block truncate text-[9px] uppercase tracking-wide" style={{ color: KEBU.muted }}>{when ? new Date(when).toLocaleString() : item.status}</span>
                  </span>
                  <span className="text-black/20">→</span>
                </button>
              );
            }) : (
              <div className="p-10 text-center"><KebuIcon name={kind === "event" ? "calendar" : kind === "doc" ? "work" : "work"} size={28} className="mx-auto" style={{ color: KEBU.faint }} /><p className="mt-3 text-sm font-black">No {copy.title.toLowerCase()} yet.</p><p className="mt-1 text-[11px]" style={{ color: KEBU.muted }}>Create the first one when it is useful.</p></div>
            )}
          </section>

          <aside>
            {selected ? (
              <div className="rounded-[22px] border bg-white p-4" style={{ borderColor: KEBU.borders.default }}>
                <div className="flex items-start justify-between gap-3">
                  <div><p className="text-[9px] font-black uppercase tracking-[.14em]" style={{ color: KEBU.orange }}>{copy.noun}</p><h2 className="mt-1 text-lg font-black">{selected.title}</h2></div>
                  <button type="button" onClick={() => void removeItem(selected.id)} className="text-[9px] font-black uppercase tracking-wide text-red-600">Delete</button>
                </div>
                {kind === "doc" ? (
                  <textarea
                    key={selected.id}
                    defaultValue={selected.body}
                    rows={14}
                    onBlur={(event) => { if (event.target.value !== selected.body) void patchItem(selected.id, { body: event.target.value }); }}
                    className="mt-4 w-full resize-y rounded-xl border px-3 py-3 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-[#FF6A00]"
                    style={{ borderColor: KEBU.borders.default }}
                  />
                ) : (
                  <div className="mt-4 space-y-3">
                    <label className="block text-[10px] font-black uppercase tracking-wide" style={{ color: KEBU.muted }}>{kind === "task" ? "Due" : "Starts"}
                      <input
                        type="datetime-local"
                        value={localInputValue(kind === "task" ? selected.due_at : selected.start_at)}
                        onChange={(event) => {
                          const iso = event.target.value ? new Date(event.target.value).toISOString() : null;
                          void patchItem(selected.id, kind === "task" ? { dueAt: iso } : { startAt: iso });
                        }}
                        className="mt-1 min-h-10 w-full rounded-xl border bg-white px-3 text-xs font-semibold outline-none focus:ring-2 focus:ring-[#FF6A00]"
                        style={{ borderColor: KEBU.borders.default }}
                      />
                    </label>
                    <textarea
                      key={selected.id + "-body"}
                      defaultValue={selected.body}
                      rows={5}
                      placeholder="Notes"
                      onBlur={(event) => { if (event.target.value !== selected.body) void patchItem(selected.id, { body: event.target.value }); }}
                      className="w-full rounded-xl border px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-[#FF6A00]"
                      style={{ borderColor: KEBU.borders.default }}
                    />
                  </div>
                )}
                <p className="mt-4 text-[9px] leading-relaxed" style={{ color: KEBU.faint }}>Changes save to your Kebu workspace, not only this device.</p>
              </div>
            ) : (
              <div className="rounded-[22px] border border-dashed bg-white p-7 text-center" style={{ borderColor: KEBU.borders.default }}><p className="text-sm font-black">Select an item</p><p className="mt-1 text-[10px]" style={{ color: KEBU.muted }}>Details and editing appear here.</p></div>
            )}
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
