"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AccountWorkspaceContext } from "@/lib/account/workspace-context";
import type { WorkItemRow } from "@/lib/work/items";
import { StudioSaveQueue as RevisionQueue, validStudioSaveReceipt } from "@/lib/studio/save-queue";
import { KEBU } from "@/lib/kebu-brand";

type Draft = { body: string; savedBody: string; revision: string; status: "saved" | "pending" | "saving" | "error" | "conflict" | "offline"; error?: string; server?: WorkItemRow };

export function LibraryDocumentsPanel() {
  const [items, setItems] = useState<WorkItemRow[]>([]);
  const [workspace, setWorkspace] = useState<AccountWorkspaceContext | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const draftsRef = useRef<Record<string, Draft>>({});
  const queues = useRef(new Map<string, RevisionQueue>());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const deleting = useRef(new Set<string>());
  const userId = useRef<string | null>(null);
  const mounted = useRef(true);
  const createId = useRef<string | null>(null);

  const updateDraft = useCallback((id: string, next: Draft) => {
    draftsRef.current = { ...draftsRef.current, [id]: next };
    if (mounted.current) setDrafts(draftsRef.current);
  }, []);
  const cache = useCallback((id: string, draft: Draft) => {
    if (!userId.current) return false;
    try {
      localStorage.setItem(`kebu-document-v1:${userId.current}:${id}`, JSON.stringify({ body: draft.body, savedBody: draft.savedBody, revision: draft.revision, dirty: draft.body !== draft.savedBody }));
      return true;
    } catch { return false; }
  }, []);

  const load = useCallback(async (context?: AccountWorkspaceContext | null) => {
    try {
      const params = new URLSearchParams({ kind: "doc" });
      if (context?.activeBusinessId) params.set("businessId", context.activeBusinessId);
      else params.set("personal", "1");
      const response = await fetch("/api/work/items?" + params, { credentials: "include", cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!mounted.current) return;
      if (!response.ok || !Array.isArray(data.items) || typeof data.userId !== "string") throw new Error(data.error || "Could not load documents.");
      if (userId.current && userId.current !== data.userId) {
        queues.current.forEach(queue => queue.cancel()); queues.current.clear();
        timers.current.forEach(clearTimeout); timers.current.clear();
        draftsRef.current = {}; setDrafts({}); setSelectedId(null);
      }
      userId.current = data.userId;
      const rows = data.items as WorkItemRow[];
      for (const row of rows) {
        let draft = draftsRef.current[row.id];
        if (!draft) {
          draft = { body: row.body, savedBody: row.body, revision: row.updated_at, status: "saved" };
          try {
            const saved = JSON.parse(localStorage.getItem(`kebu-document-v1:${data.userId}:${row.id}`) ?? "null");
            if (saved?.dirty && saved.body !== row.body && typeof saved.body === "string" && saved.body.length <= 20000 && typeof saved.revision === "string") {
              draft = { body: saved.body, savedBody: typeof saved.savedBody === "string" ? saved.savedBody : row.body, revision: saved.revision, status: saved.revision === row.updated_at ? "pending" : "conflict", ...(saved.revision !== row.updated_at ? { server: row } : {}) };
            }
          } catch { /* A malformed device draft cannot replace authenticated server data. */ }
        } else if (draft.body === draft.savedBody) {
          draft = { body: row.body, savedBody: row.body, revision: row.updated_at, status: "saved" };
        } else if (draft.revision !== row.updated_at) {
          draft = { ...draft, status: "conflict", server: row };
        }
        let queue = queues.current.get(row.id);
        if (!queue) { queue = new RevisionQueue(row.id); queues.current.set(row.id, queue); }
        queue.reset(draft.revision);
        if (draft.status === "conflict") queue.pause();
        updateDraft(row.id, draft);
      }
      setItems(rows); setReady(true); setError(null);
    } catch (cause) {
      if (mounted.current) { setError(cause instanceof Error ? cause.message : "Could not load documents. Check your connection."); setReady(false); }
    }
  }, [updateDraft]);

  useEffect(() => {
    mounted.current = true;
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/me/workspace", { credentials: "include" });
        if (!response.ok) throw new Error("Could not load your Kebu space. Retry before creating documents.");
        const data = await response.json();
        if (!data.context || !["personal", "business"].includes(data.context.mode)) throw new Error("Could not confirm your Kebu space.");
        if (cancelled) return;
        setWorkspace(data.context ?? null); await load(data.context ?? null);
      } catch (cause) { if (!cancelled) setError(cause instanceof Error ? cause.message : "Could not load your Kebu space."); }
    })();
    const currentQueues = queues.current, currentTimers = timers.current;
    return () => { cancelled = true; mounted.current = false; currentQueues.forEach(queue => queue.cancel()); currentTimers.forEach(clearTimeout); };
  }, [load]);

  const saveDoc = useCallback(async (id: string) => {
    const queue = queues.current.get(id), requested = draftsRef.current[id];
    if (!queue || !requested || deleting.current.has(id) || requested.body === requested.savedBody || queue.isBlocked()) return;
    const text = requested.body;
    const cached = cache(id, requested);
    await queue.run(async context => {
      const draft = draftsRef.current[id];
      if (!context.active() || context.blocked() || deleting.current.has(id) || !draft || draft.body !== text || draft.savedBody === text) return;
      if (!navigator.onLine) { updateDraft(id, { ...draft, status: cached ? "offline" : "error", error: cached ? "Saved on this device. Reconnect to sync." : "Device storage failed. Keep this tab open and reconnect." }); return; }
      updateDraft(id, { ...draft, status: "saving", error: undefined });
      try {
        const response = await fetch("/api/work/items", { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, body: text, expectedUpdatedAt: context.revision() }) });
        const data = await response.json().catch(() => ({}));
        if (!context.active()) return;
        if (response.status === 409) {
          context.conflict();
          const latestResponse = await fetch(`/api/work/items?kind=doc&id=${encodeURIComponent(id)}`, { credentials: "include", cache: "no-store" });
          const latest = await latestResponse.json().catch(() => ({}));
          if (!context.active()) return;
          const server = latestResponse.ok ? latest.items?.find((row: WorkItemRow) => row.id === id) : undefined;
          updateDraft(id, { ...draftsRef.current[id]!, status: "conflict", server, error: server ? "This document changed elsewhere. Choose which text to keep." : "Could not load the newer document. Your text is kept. Reload the list before retrying." }); return;
        }
        if (!response.ok) throw new Error(data.error || "Could not save document.");
        if (!validStudioSaveReceipt(data.item, id) || data.item.body !== text) {
          context.conflict(); throw new Error("Could not confirm this save. Reload the list before retrying; your text is kept.");
        }
        context.acknowledge(data.item.updated_at);
        const next = { ...draftsRef.current[id]!, savedBody: text, revision: data.item.updated_at, status: draftsRef.current[id]!.body === text ? "saved" as const : "pending" as const, error: undefined };
        updateDraft(id, next); cache(id, next);
        setItems(current => current.map(row => row.id === id ? data.item : row));
      } catch (cause) {
        if (context.active()) updateDraft(id, { ...draftsRef.current[id]!, status: "error", error: cause instanceof Error && !(cause instanceof TypeError) ? cause.message : "Save failed. Your text is kept; retry when connected." });
      }
    });
  }, [cache, updateDraft]);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (Object.values(draftsRef.current).some(draft => draft.body !== draft.savedBody)) { event.preventDefault(); event.returnValue = ""; }
    };
    const online = () => Object.keys(draftsRef.current).forEach(id => void saveDoc(id));
    window.addEventListener("beforeunload", beforeUnload); window.addEventListener("online", online);
    return () => { window.removeEventListener("beforeunload", beforeUnload); window.removeEventListener("online", online); };
  }, [saveDoc]);

  async function reloadList() {
    try {
      const response = await fetch("/api/me/workspace", { credentials: "include", cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.context || !["personal", "business"].includes(data.context.mode)) throw new Error("Could not confirm your Kebu space. Retry before creating documents.");
      if (!mounted.current) return;
      setWorkspace(data.context); await load(data.context);
    } catch (cause) { if (mounted.current) { setReady(false); setError(cause instanceof Error ? cause.message : "Could not reload your Kebu space."); } }
  }
  const selected = useMemo(() => items.find(item => item.id === selectedId) ?? null, [items, selectedId]);
  const selectedDraft = selectedId ? drafts[selectedId] : undefined;
  function edit(id: string, text: string) {
    const previous = draftsRef.current[id]; if (!previous || deleting.current.has(id)) return;
    const next = { ...previous, body: text, status: previous.status === "conflict" ? "conflict" as const : "pending" as const };
    updateDraft(id, next);
    if (!cache(id, next)) updateDraft(id, { ...next, error: "Device storage failed. Keep this tab open until the document saves." });
    clearTimeout(timers.current.get(id)); timers.current.set(id, setTimeout(() => void saveDoc(id), 900));
  }
  async function resolveConflict(id: string, keepLocal: boolean) {
    const draft = draftsRef.current[id], server = draft?.server;
    if (!draft || !server || !validStudioSaveReceipt(server, id)) return;
    const queue = queues.current.get(id)!; queue.reset(server.updated_at);
    const next: Draft = { body: keepLocal ? draft.body : server.body, savedBody: server.body, revision: server.updated_at, status: keepLocal ? "pending" : "saved" };
    updateDraft(id, next); cache(id, next); setItems(current => current.map(row => row.id === id ? server : row));
    if (keepLocal) await saveDoc(id);
  }
  async function createDoc() {
    if (!ready || !title.trim() || busy) return;
    setBusy(true); setError(null);
    const id = createId.current ?? crypto.randomUUID(); createId.current = id;
    try {
      const response = await fetch("/api/work/items", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, kind: "doc", title: title.trim(), body, status: "draft", businessId: workspace?.activeBusinessId ?? null }) });
      const data = await response.json().catch(() => ({}));
      if (!mounted.current) return;
      if (data.code === "work_create_conflict" && validStudioSaveReceipt(data.item, id)) createId.current = null;
      if (!response.ok || !validStudioSaveReceipt(data.item, id) || data.item.body !== body || data.item.title !== title.trim() || data.item.kind !== "doc" || data.item.business_id !== (workspace?.activeBusinessId ?? null)) throw new Error(data.error || "Could not confirm creation. Retry or reload the list; your text is kept.");
      const queue = new RevisionQueue(id); queue.reset(data.item.updated_at); queues.current.set(id, queue);
      updateDraft(id, { body: data.item.body, savedBody: data.item.body, revision: data.item.updated_at, status: "saved" });
      setItems(current => [data.item, ...current.filter(row => row.id !== id)]); setSelectedId(id); setTitle(""); setBody(""); setCreating(false); createId.current = null;
    } catch (cause) { if (mounted.current) setError(cause instanceof Error && !(cause instanceof TypeError) ? cause.message : "Creation failed. Your text is kept; retry when connected."); }
    finally { if (mounted.current) setBusy(false); }
  }
  async function removeDoc(id: string) {
    if (!window.confirm("Delete this document and its unsaved changes?")) return;
    const queue = queues.current.get(id); if (!queue || deleting.current.has(id)) return;
    deleting.current.add(id); setBusy(true); setError(null); clearTimeout(timers.current.get(id));
    try {
      await queue.run(async context => {
        if (!context.active()) return;
        const response = await fetch(`/api/work/items?id=${encodeURIComponent(id)}&expectedUpdatedAt=${encodeURIComponent(context.revision() ?? "")}`, { method: "DELETE", credentials: "include" });
        const data = await response.json().catch(() => ({}));
        if (!context.active()) return;
        if (!response.ok || data.ok !== true) throw new Error(data.error || "Could not confirm deletion. Your document is kept.");
        queue.cancel(); delete draftsRef.current[id]; setDrafts({ ...draftsRef.current });
        if (userId.current) { try { localStorage.removeItem(`kebu-document-v1:${userId.current}:${id}`); } catch { /* Deletion remains confirmed on the server. */ } }
        setItems(current => current.filter(item => item.id !== id)); setSelectedId(current => current === id ? null : current);
      });
    } catch (cause) { if (mounted.current) setError(cause instanceof Error && !(cause instanceof TypeError) ? cause.message : "Could not delete document. Check your connection and retry."); }
    finally { deleting.current.delete(id); if (mounted.current) setBusy(false); }
  }

  return <div>
    <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3" style={{ borderColor: KEBU.border }}>
      <div><p className="text-[12px] font-semibold">Documents</p><p className="text-[11px] text-black/50">Notes and working documents live inside Library.</p></div>
      <button type="button" disabled={!ready || busy || creating} onClick={() => { createId.current = null; setCreating(true); }} className="rounded-full bg-black px-4 py-3 text-xs font-semibold text-white disabled:opacity-40">+ New document</button>
    </div>
    {error ? <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p> : null}
    <button type="button" disabled={busy} onClick={() => void reloadList()} className="mt-2 min-h-11 text-xs underline">Reload document list</button>
    {creating ? <div className="grid gap-2 border-b py-4 lg:grid-cols-[260px_1fr_auto]" style={{ borderColor: KEBU.border }}>
      <input autoFocus aria-label="Document title" value={title} disabled={busy} maxLength={160} onChange={e => setTitle(e.target.value)} placeholder="Document title" className="min-h-11 rounded-lg border px-3 text-sm" />
      <textarea aria-label="New document text" value={body} disabled={busy} maxLength={20000} onChange={e => setBody(e.target.value)} rows={2} placeholder="Start writing…" className="rounded-lg border px-3 py-2 text-sm" />
      <div className="flex gap-2"><button type="button" onClick={() => void createDoc()} disabled={!title.trim() || busy} className="min-h-11 rounded-full bg-black px-4 text-xs font-semibold text-white disabled:opacity-40">{busy ? "Saving…" : "Create"}</button><button type="button" disabled={busy} onClick={() => { setCreating(false); createId.current = null; }} className="min-h-11 rounded-full border px-4 text-xs">Cancel</button></div>
    </div> : null}
    <div className="mt-3 grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <section className="border-y" style={{ borderColor: KEBU.border }}>
        {items.map(item => <button key={item.id} type="button" onClick={() => setSelectedId(item.id)} className="block min-h-11 w-full border-b px-2 py-3 text-left" style={{ borderColor: KEBU.border, background: selectedId === item.id ? "#FFF3EC" : "transparent" }}><p className="truncate text-sm font-semibold">{item.title}</p><p className="mt-1 text-[11px] text-black/50">{new Date(item.updated_at).toLocaleString()}</p></button>)}
        {!items.length ? <p className="py-8 text-center text-xs text-black/50">{ready ? "No documents yet." : "Loading documents…"}</p> : null}
      </section>
      <section className="min-h-[420px] min-w-0">
        {selected && selectedDraft ? <div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3"><h2 className="text-lg font-semibold">{selected.title}</h2><div className="flex gap-2"><button type="button" disabled={busy || selectedDraft.status === "saving" || selectedDraft.status === "conflict" || selectedDraft.body === selectedDraft.savedBody} onClick={() => void saveDoc(selected.id)} className="min-h-11 rounded-full border px-4 text-xs">Save document</button><button type="button" disabled={busy} onClick={() => void removeDoc(selected.id)} className="min-h-11 px-3 text-xs font-semibold text-red-700">Delete document</button></div></div>
          <p role="status" className="mt-2 text-xs text-black/60">{({ saved: "Saved", pending: "Unsaved changes", saving: "Saving…", error: "Save failed", conflict: "Version conflict", offline: "Saved on this device" })[selectedDraft.status]}</p>
          {selectedDraft.error ? <p role="alert" className="mt-2 text-xs text-red-700">{selectedDraft.error}</p> : null}
          {selectedDraft.status === "conflict" && selectedDraft.server ? <div className="mt-3 rounded-lg border border-amber-300 p-3"><p className="text-sm">A newer version is saved elsewhere.</p><details className="my-2"><summary className="cursor-pointer text-xs">Review saved text</summary><p className="whitespace-pre-wrap text-sm">{selectedDraft.server.body}</p></details><div className="flex flex-wrap gap-2"><button type="button" onClick={() => void resolveConflict(selected.id, true)} className="min-h-11 rounded-full border px-4 text-xs">Keep my text</button><button type="button" onClick={() => void resolveConflict(selected.id, false)} className="min-h-11 rounded-full border px-4 text-xs">Use saved text</button></div></div> : null}
          <textarea aria-label="Document text" value={selectedDraft.body} disabled={busy} maxLength={20000} onChange={e => edit(selected.id, e.target.value)} onBlur={() => void saveDoc(selected.id)} onKeyDown={event => { if ((event.ctrlKey || event.metaKey) && event.key === "s") { event.preventDefault(); void saveDoc(selected.id); } }} rows={18} className="mt-3 w-full resize-y rounded-xl border bg-white p-4 text-sm leading-6 outline-none focus:border-black/40" />
        </div> : <p className="py-20 text-center text-sm text-black/50">Select a document to start writing.</p>}
      </section>
    </div>
  </div>;
}
