"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { validStudioSaveReceipt } from "@/lib/studio/save-queue";
import { AppShell } from "@/app/components/app-shell";
import { KebuIcon } from "@/app/components/kebu/kebu-icon";
import { KEBU } from "@/lib/kebu-brand";
import type { WorkItemKind, WorkItemRow } from "@/lib/work/items";
import type { AccountWorkspaceContext } from "@/lib/account/workspace-context";

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
  const [workspace, setWorkspace] = useState<AccountWorkspaceContext | null>(null);
  const createId = useRef<string | null>(null);
  const mutationBusy = useRef(false);
  const [workspaceReady, setWorkspaceReady] = useState(false);

  const load = useCallback(async (context?: AccountWorkspaceContext | null) => {
    setError(null);
    try {
      const active = context ?? null;
      const params = new URLSearchParams({ kind });
      if (active?.activeBusinessId) params.set("businessId", active.activeBusinessId);
      else params.set("personal", "1");
      const res = await fetch("/api/work/items?" + params.toString(), { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || "Could not load " + copy.title.toLowerCase() + "."); return; }
      setItems(Array.isArray(data.items) ? data.items : []);
      setSelectedId(null);
    } catch {
      setError("Network error.");
    }
  }, [copy.title, kind]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/me/workspace", { credentials: "include" })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (cancelled) return;
        if (!data?.context) throw new Error("Could not confirm your Kebu space.");
        const context = data.context;
        setWorkspace(context);
        setWorkspaceReady(true);
        void load(context);
      })
      .catch(() => {
        if (!cancelled) {
          setWorkspaceReady(false);
          setError("Could not load your Kebu space. Reload before creating items.");
        }
      });
    return () => { cancelled = true; };
  }, [load]);

  const selected = useMemo(() => items.find((item) => item.id === selectedId) ?? null, [items, selectedId]);

  async function createItem() {
    if (!workspaceReady || !title.trim() || busy || mutationBusy.current) return;
    mutationBusy.current = true;
    setBusy(true);
    setError(null);
    const id = createId.current ?? crypto.randomUUID(); createId.current = id;
    try {
      const payload: Record<string, unknown> = {
      id, kind,
      title: title.trim(),
      body,
      status: kind === "doc" ? "draft" : "open",
      businessId: workspace?.activeBusinessId ?? null,
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
    if (data.code === "work_create_conflict" && validStudioSaveReceipt(data.item, id)) createId.current = null;
    if (!res.ok || !validStudioSaveReceipt(data.item, id) || data.item.title !== title.trim() || data.item.body !== body || data.item.kind !== kind || data.item.business_id !== (workspace?.activeBusinessId ?? null)) throw new Error(data.error || "Could not confirm creation. Your details are kept.");
    setItems((current) => [data.item, ...current.filter(item => item.id !== id)]);
    createId.current = null;
    setSelectedId(data.item.id);
    setTitle("");
    setBody("");
    setDateValue("");
    setCreating(false);
    } catch (cause) { setError(cause instanceof Error && !(cause instanceof TypeError) ? cause.message : "Could not create item. Your details are kept; retry when connected."); }
    finally { mutationBusy.current = false; setBusy(false); }
  }

  async function patchItem(id: string, patch: Record<string, unknown>) {
    const current = items.find(item => item.id === id);
    if (!current || mutationBusy.current) return;
    mutationBusy.current = true; setBusy(true); setError(null);
    try {
      const response = await fetch("/api/work/items", { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...patch, expectedUpdatedAt: current.updated_at }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !validStudioSaveReceipt(data.item, id)) throw new Error(data.error || "Could not confirm this change. Your item is kept.");
      setItems(rows => rows.map(item => item.id === id ? data.item : item));
    } catch (cause) { setError(cause instanceof Error && !(cause instanceof TypeError) ? cause.message : "Could not save that change. Retry when connected."); }
    finally { mutationBusy.current = false; setBusy(false); }
  }

  async function removeItem(id: string) {
    const current = items.find(item => item.id === id);
    if (!current || mutationBusy.current || !window.confirm("Delete this item?")) return;
    mutationBusy.current = true; setBusy(true); setError(null);
    try {
      const response = await fetch(`/api/work/items?id=${encodeURIComponent(id)}&expectedUpdatedAt=${encodeURIComponent(current.updated_at)}`, { method: "DELETE", credentials: "include" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.ok !== true) throw new Error(data.error || "Could not confirm deletion. Your item is kept.");
      setItems(rows => rows.filter(item => item.id !== id)); setSelectedId(selected => selected === id ? null : selected);
    } catch (cause) { setError(cause instanceof Error && !(cause instanceof TypeError) ? cause.message : "Could not delete that item. Retry when connected."); }
    finally { mutationBusy.current = false; setBusy(false); }
  }

  return (
    <AppShell title={copy.title}>
      <div className="mx-auto max-w-[1380px] px-4 py-6 sm:px-7">
        <header className="flex flex-col justify-between gap-4 border-b pb-6 sm:flex-row sm:items-end" style={{ borderColor: KEBU.borders.default }}>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.16em]" style={{ color: KEBU.orange }}>{copy.eyebrow} · {workspace?.activeBusiness?.name ?? "Personal Kebu"}</p>
            <h1 className="mt-2 text-4xl font-black tracking-[-.04em] sm:text-5xl" style={{ fontFamily: "var(--font-fraunces)" }}>{copy.title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed" style={{ color: KEBU.muted }}>{copy.description}</p>
          </div>
          <button type="button" disabled={!workspaceReady || busy || creating} onClick={() => { createId.current = null; setCreating(true); }} className="rounded-full px-5 py-2.5 text-xs font-black text-white" style={{ background: "linear-gradient(90deg,#FF6A00,#FF1F1F)" }}>+ New {copy.noun}</button>
        </header>

        {!workspaceReady ? <div className="mt-4 text-xs" style={{ color: KEBU.muted }}>Loading current space…</div> : null}

        {error ? <div role="alert" className="mt-4 rounded-xl border px-4 py-3 text-xs font-semibold" style={{ borderColor: KEBU.status.errorBorder, background: KEBU.status.errorBg, color: KEBU.status.errorText }}>{error}</div> : null}

        {creating ? (
          <section className="mt-5 rounded-[22px] border bg-white p-4" style={{ borderColor: KEBU.borders.strong }}>
            <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
              <div>
                <input disabled={busy} autoFocus maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} placeholder={"Name this " + copy.noun} className="min-h-11 w-full rounded-xl border px-3 text-sm font-bold outline-none focus:ring-2 focus:ring-[#FF6A00]" style={{ borderColor: KEBU.borders.default }} />
                {kind === "doc" ? <textarea disabled={busy} maxLength={20000} value={body} onChange={(event) => setBody(event.target.value)} rows={5} placeholder="Start writing…" className="mt-2 w-full rounded-xl border px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-[#FF6A00]" style={{ borderColor: KEBU.borders.default }} /> : null}
              </div>
              {kind !== "doc" ? <label className="text-[10px] font-black uppercase tracking-wide" style={{ color: KEBU.muted }}>{kind === "task" ? "Due" : "Starts"}<input disabled={busy} type="datetime-local" value={dateValue} onChange={(event) => setDateValue(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border bg-white px-3 text-xs font-semibold outline-none focus:ring-2 focus:ring-[#FF6A00]" style={{ borderColor: KEBU.borders.default }} /></label> : null}
            </div>
            <div className="mt-3 flex gap-2">
              <button type="button" disabled={!title.trim() || busy} onClick={() => void createItem()} className="rounded-full bg-black px-4 py-2 text-[10px] font-black uppercase tracking-wide text-white disabled:opacity-40">{busy ? "Saving…" : "Create"}</button>
              <button type="button" disabled={busy} onClick={() => setCreating(false)} className="rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-wide" style={{ borderColor: KEBU.borders.default }}>Cancel</button>
            </div>
          </section>
        ) : null}

        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
          <section className="overflow-hidden rounded-[22px] border bg-white" style={{ borderColor: KEBU.borders.default }}>
            {items.length ? items.map((item, index) => {
              const active = item.id === selectedId;
              const when = kind === "task" ? item.due_at : kind === "event" ? item.start_at : item.updated_at;
              return (
                <div key={item.id} className="flex items-center gap-3 px-4 py-3.5" style={{ borderTop: index ? "1px solid " + KEBU.borders.subtle : undefined, background: active ? "rgba(255,106,0,.06)" : undefined }}>
                  {kind === "task" ? (
                    <label className="flex h-11 w-11 shrink-0 items-center justify-center">
                      <input type="checkbox" aria-label={"Complete " + item.title} disabled={busy} checked={item.status === "done"} onChange={() => void patchItem(item.id, { status: item.status === "done" ? "open" : "done" })} className="h-5 w-5 accent-[#FF6A00]" />
                    </label>
                  ) : <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]" style={{ background: KEBU.cream, color: KEBU.orange }}><KebuIcon name={kind === "event" ? "calendar" : "work"} size={16} /></span>}
                  <button type="button" onClick={() => setSelectedId(item.id)} className="flex min-h-11 min-w-0 flex-1 items-center gap-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A00]">
                    <span className="min-w-0 flex-1"><span className={"block truncate text-[12px] font-bold " + (item.status === "done" ? "line-through opacity-45" : "")}>{item.title}</span><span className="mt-0.5 block truncate text-[9px] uppercase tracking-wide" style={{ color: KEBU.muted }}>{when ? new Date(when).toLocaleString() : item.status}</span></span><span className="text-black/20">→</span>
                  </button>
                </div>
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
                  <button type="button" disabled={busy} onClick={() => void removeItem(selected.id)} className="text-[9px] font-black uppercase tracking-wide text-red-600">Delete</button>
                </div>
                {kind === "doc" ? (
                  <textarea
                    disabled={busy}
                    maxLength={20000}
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
                        disabled={busy}
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
                      disabled={busy}
                      maxLength={20000}
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
