"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { KebuIcon } from "@/app/components/kebu/kebu-icon";
import { KEBU } from "@/lib/kebu-brand";

type NodeRow = {
  id: string;
  owner_id: string;
  parent_id: string | null;
  kind: string;
  title: string;
  starred: boolean;
  trashed_at: string | null;
  updated_at: string;
};

type ConnectionRow = {
  id: string;
  status: string;
  direction: "incoming" | "outgoing";
  other: { id: string; name: string | null; avatar_url: string | null };
};

export function LibraryDrivePanel() {
  const [nodes, setNodes] = useState<NodeRow[]>([]);
  const [path, setPath] = useState<Array<{ id: string | null; title: string }>>([{ id: null, title: "Library" }]);
  const [folderName, setFolderName] = useState("");
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<NodeRow | null>(null);
  const [connections, setConnections] = useState<ConnectionRow[]>([]);
  const [shareUserId, setShareUserId] = useState("");
  const [sharePermission, setSharePermission] = useState<"viewer" | "editor">("viewer");
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parentId = path[path.length - 1]?.id ?? null;

  const load = useCallback(async () => {
    setError(null);
    const params = new URLSearchParams();
    if (parentId) params.set("parentId", parentId);
    const res = await fetch("/api/library/nodes?" + params.toString(), { credentials: "include", cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Could not load Library.");
      return;
    }
    setNodes(Array.isArray(data.nodes) ? data.nodes : []);
  }, [parentId]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    void fetch("/api/people/connections?status=accepted", { credentials: "include", cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setConnections(Array.isArray(data.connections) ? data.connections : []))
      .catch(() => setConnections([]));
  }, []);

  async function createFolder(event: React.FormEvent) {
    event.preventDefault();
    if (creating || !folderName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/library/nodes", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "folder", title: folderName.trim(), parentId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not create folder.");
      setFolderName("");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create folder.");
    } finally {
      setCreating(false);
    }
  }

  async function patchNode(id: string, patch: Record<string, unknown>) {
    const res = await fetch("/api/library/nodes", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Could not update item.");
      return;
    }
    if (selected?.id === id) setSelected(data.node ?? null);
    await load();
  }

  async function shareSelected(event: React.FormEvent) {
    event.preventDefault();
    if (!selected || !shareUserId || sharing) return;
    setSharing(true);
    setError(null);
    try {
      const res = await fetch("/api/library/shares", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodeId: selected.id, userId: shareUserId, permission: sharePermission }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not share item.");
      setShareUserId("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not share item.");
    } finally {
      setSharing(false);
    }
  }

  const folders = useMemo(() => nodes.filter((node) => node.kind === "folder"), [nodes]);
  const items = useMemo(() => nodes.filter((node) => node.kind !== "folder"), [nodes]);

  return (
    <section className="rounded-[24px] border bg-white p-4 sm:p-5" style={{ borderColor: KEBU.borders.default }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1 text-[10px] font-black uppercase tracking-[.1em] text-black/35">
            {path.map((part, index) => (
              <button
                key={(part.id ?? "root") + index}
                type="button"
                onClick={() => setPath((current) => current.slice(0, index + 1))}
                className="rounded-full px-2 py-1 hover:bg-black/[.04]"
              >
                {part.title}{index < path.length - 1 ? " /" : ""}
              </button>
            ))}
          </div>
          <h2 className="mt-1 text-xl font-black">Folders & shared work</h2>
        </div>
        <form onSubmit={(event) => void createFolder(event)} className="flex items-center gap-2">
          <input
            value={folderName}
            onChange={(event) => setFolderName(event.target.value)}
            placeholder="New folder"
            maxLength={240}
            className="min-h-10 w-36 rounded-full border px-3 text-[11px] font-semibold outline-none focus:ring-2 focus:ring-[#FF6A00] sm:w-48"
            style={{ borderColor: KEBU.borders.default }}
          />
          <button
            type="submit"
            disabled={creating || !folderName.trim()}
            className="min-h-10 rounded-full bg-black px-4 text-[9px] font-black uppercase tracking-wide text-white disabled:opacity-40"
          >
            {creating ? "Creating…" : "+ Folder"}
          </button>
        </form>
      </div>

      {error ? <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</p> : null}

      <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {folders.map((node) => (
          <div key={node.id} className="group rounded-[18px] border p-3" style={{ borderColor: KEBU.borders.default }}>
            <button
              type="button"
              onClick={() => setPath((current) => [...current, { id: node.id, title: node.title }])}
              className="flex min-h-16 w-full items-center gap-3 text-left"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px]" style={{ background: "rgba(255,106,0,.09)", color: KEBU.orange }}>
                <KebuIcon name="library" size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] font-black">{node.title}</span>
                <span className="mt-1 block text-[9px] uppercase tracking-wide" style={{ color: KEBU.muted }}>Folder</span>
              </span>
            </button>
            <div className="mt-2 flex items-center gap-1 border-t pt-2" style={{ borderColor: KEBU.borders.subtle }}>
              <button type="button" onClick={() => void patchNode(node.id, { starred: !node.starred })} className="rounded-full px-2 py-1 text-[9px] font-bold hover:bg-black/[.04]">
                {node.starred ? "★ Starred" : "☆ Star"}
              </button>
              <button type="button" onClick={() => setSelected(node)} className="rounded-full px-2 py-1 text-[9px] font-bold hover:bg-black/[.04]">Share</button>
              <button type="button" onClick={() => void patchNode(node.id, { trashed: true })} className="ml-auto rounded-full px-2 py-1 text-[9px] font-bold text-black/35 hover:bg-black/[.04]">Trash</button>
            </div>
          </div>
        ))}
        {items.map((node) => (
          <div key={node.id} className="rounded-[18px] border p-3" style={{ borderColor: KEBU.borders.default }}>
            <p className="truncate text-[12px] font-black">{node.title}</p>
            <p className="mt-1 text-[9px] uppercase tracking-wide" style={{ color: KEBU.muted }}>{node.kind}</p>
          </div>
        ))}
      </div>

      {!nodes.length ? (
        <div className="mt-5 rounded-[18px] border border-dashed p-8 text-center" style={{ borderColor: KEBU.borders.default }}>
          <p className="text-sm font-black">This folder is empty.</p>
          <p className="mt-1 text-[10px]" style={{ color: KEBU.muted }}>Create a folder now. Files and Kebu documents can be organized here as their integrations are connected.</p>
        </div>
      ) : null}

      {selected ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/30 p-4" onClick={() => setSelected(null)}>
          <div className="w-full max-w-md rounded-[24px] bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[.14em]" style={{ color: KEBU.orange }}>Share</p>
                <h3 className="mt-1 text-xl font-black">{selected.title}</h3>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="rounded-full px-2 py-1 text-black/40">×</button>
            </div>

            {connections.length ? (
              <form onSubmit={(event) => void shareSelected(event)} className="mt-5 space-y-3">
                <label className="block">
                  <span className="text-[10px] font-black">Kebu connection</span>
                  <select value={shareUserId} onChange={(event) => setShareUserId(event.target.value)} required className="mt-1.5 min-h-11 w-full rounded-xl border bg-white px-3 text-sm" style={{ borderColor: KEBU.borders.default }}>
                    <option value="">Choose someone</option>
                    {connections.map((connection) => (
                      <option key={connection.id} value={connection.other.id}>{connection.other.name || "Kebu connection"}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-[10px] font-black">Access</span>
                  <select value={sharePermission} onChange={(event) => setSharePermission(event.target.value as "viewer" | "editor")} className="mt-1.5 min-h-11 w-full rounded-xl border bg-white px-3 text-sm" style={{ borderColor: KEBU.borders.default }}>
                    <option value="viewer">Can view</option>
                    <option value="editor">Can edit</option>
                  </select>
                </label>
                <button type="submit" disabled={!shareUserId || sharing} className="min-h-11 w-full rounded-full bg-black text-[10px] font-black uppercase tracking-wide text-white disabled:opacity-40">
                  {sharing ? "Sharing…" : "Share"}
                </button>
              </form>
            ) : (
              <p className="mt-5 text-sm leading-6" style={{ color: KEBU.muted }}>Add someone in People first. Library sharing is limited to accepted Kebu connections.</p>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
