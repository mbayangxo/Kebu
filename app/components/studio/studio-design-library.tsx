"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { designsInFolderView, type StudioFolder } from "@/lib/studio/folders";

type DesignRow = {
  id: string;
  title: string;
  design_type: string;
  updated_at: string;
  folder_id?: string | null;
  accessRole: "owner" | "editor" | "viewer";
};

type FolderView = "all" | "unfiled" | string;

/** Canva-style design library: folders · search · open · rename · duplicate · delete · move. */
export function StudioDesignLibrary({
  initialOwned,
  initialShared,
}: {
  initialOwned: Omit<DesignRow, "accessRole">[];
  initialShared: DesignRow[];
}) {
  const router = useRouter();
  const [owned, setOwned] = useState<DesignRow[]>(
    initialOwned.map((d) => ({ ...d, accessRole: "owner" as const, folder_id: d.folder_id ?? null })),
  );
  const [shared, setShared] = useState<DesignRow[]>(initialShared);
  const [folders, setFolders] = useState<StudioFolder[]>([]);
  const [unfiledCount, setUnfiledCount] = useState(0);
  const [folderView, setFolderView] = useState<FolderView>("all");
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [folderRenameValue, setFolderRenameValue] = useState("");

  const refreshFolders = useCallback(async () => {
    const res = await fetch("/api/studio/folders", { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (res.status === 503) {
      setFolders([]);
      setUnfiledCount(0);
      return;
    }
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Could not load folders.");
      return;
    }
    setFolders(Array.isArray(data.folders) ? data.folders : []);
    setUnfiledCount(typeof data.unfiledCount === "number" ? data.unfiledCount : 0);
  }, []);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/create/designs", { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Could not refresh designs.");
      return;
    }
    setOwned(Array.isArray(data.designs) ? data.designs : []);
    setShared(Array.isArray(data.shared) ? data.shared : []);
    setError(null);
    await refreshFolders();
  }, [refreshFolders]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filter = (list: DesignRow[]) => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.design_type.replace(/_/g, " ").toLowerCase().includes(q),
    );
  };

  const ownedInView = useMemo(
    () => designsInFolderView(owned, folderView),
    [owned, folderView],
  );
  const ownedFiltered = useMemo(() => filter(ownedInView), [ownedInView, query]);
  const sharedFiltered = useMemo(() => filter(shared), [shared, query]);

  async function createFolder() {
    const name = newFolderName.trim();
    if (!name) {
      setError("Folder name cannot be empty.");
      return;
    }
    setCreatingFolder(true);
    setError(null);
    try {
      const res = await fetch("/api/studio/folders", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not create folder.");
        return;
      }
      setNewFolderName("");
      await refreshFolders();
      if (data.folder?.id) setFolderView(data.folder.id as string);
    } finally {
      setCreatingFolder(false);
    }
  }

  async function saveFolderRename(id: string) {
    const name = folderRenameValue.trim();
    if (!name) {
      setError("Folder name cannot be empty.");
      return;
    }
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/studio/folders/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Rename failed.");
        return;
      }
      setRenamingFolderId(null);
      await refreshFolders();
    } finally {
      setBusyId(null);
    }
  }

  async function deleteFolder(id: string) {
    if (
      !window.confirm(
        "Delete this folder? Designs inside stay in your library (unfiled). This cannot be undone.",
      )
    ) {
      return;
    }
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/studio/folders/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Delete folder failed.");
        return;
      }
      if (folderView === id) setFolderView("all");
      await refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function moveToFolder(designId: string, folderId: string | null) {
    setBusyId(designId);
    setError(null);
    try {
      const res = await fetch(`/api/create/designs/${designId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Move failed.");
        return;
      }
      await refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function duplicate(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/create/designs/${id}/duplicate`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Duplicate failed.");
        return;
      }
      router.push(`/studio/${data.design.id}`);
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this design? This cannot be undone.")) return;
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/create/designs/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Delete failed.");
        return;
      }
      await refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function saveRename(id: string) {
    const title = renameValue.trim();
    if (!title) {
      setError("Title cannot be empty.");
      return;
    }
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/create/designs/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Rename failed.");
        return;
      }
      setRenamingId(null);
      await refresh();
    } finally {
      setBusyId(null);
    }
  }

  function DesignCard({ d, canDelete }: { d: DesignRow; canDelete: boolean }) {
    const renaming = renamingId === d.id;
    return (
      <div className="rounded-2xl border border-black/10 bg-white p-4 hover:shadow-md transition-shadow flex flex-col gap-2">
        {renaming ? (
          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              void saveRename(d.id);
            }}
          >
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className="w-full rounded-lg border border-black/10 px-2 py-1.5 text-sm font-semibold"
              maxLength={120}
            />
            <div className="flex gap-2">
              <button type="submit" disabled={busyId === d.id} className="text-xs font-bold underline">
                Save
              </button>
              <button type="button" className="text-xs opacity-60" onClick={() => setRenamingId(null)}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <Link href={`/studio/${d.id}`} className="block min-w-0">
            <p className="font-semibold truncate">{d.title}</p>
            <p className="text-xs text-muted mt-1 capitalize">{d.design_type.replace(/_/g, " ")}</p>
            {d.accessRole !== "owner" ? (
              <p className="text-[10px] font-semibold text-orange-700 mt-1">
                {d.accessRole === "editor" ? "Can edit" : "View only"}
              </p>
            ) : null}
            <p className="text-[10px] text-muted mt-2">
              Updated {new Date(d.updated_at).toLocaleDateString()}
            </p>
          </Link>
        )}
        <div className="flex flex-wrap gap-2 pt-1 border-t border-black/5 items-center">
          <Link href={`/studio/${d.id}`} className="text-[11px] font-bold underline">
            Open
          </Link>
          {canDelete ? (
            <button
              type="button"
              className="text-[11px] font-bold underline"
              disabled={busyId === d.id}
              onClick={() => {
                setRenamingId(d.id);
                setRenameValue(d.title);
              }}
            >
              Rename
            </button>
          ) : null}
          <button
            type="button"
            className="text-[11px] font-bold underline"
            disabled={busyId === d.id}
            onClick={() => void duplicate(d.id)}
          >
            Duplicate
          </button>
          {canDelete && folders.length > 0 ? (
            <label className="text-[11px] font-bold flex items-center gap-1">
              Move
              <select
                className="rounded border border-black/10 text-[11px] py-0.5 max-w-[120px]"
                disabled={busyId === d.id}
                value={d.folder_id ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  void moveToFolder(d.id, v === "" ? null : v);
                }}
              >
                <option value="">Unfiled</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {canDelete ? (
            <button
              type="button"
              className="text-[11px] font-bold underline text-red-700"
              disabled={busyId === d.id}
              onClick={() => void remove(d.id)}
            >
              Delete
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  const folderNavBtn = (active: boolean) =>
    `w-full text-left rounded-lg px-3 py-2 text-sm ${
      active ? "bg-[#0F0D33] text-white font-bold" : "hover:bg-black/5 font-medium"
    }`;

  return (
    <div className="grid lg:grid-cols-[220px_1fr] gap-6">
      <aside className="space-y-3 rounded-2xl border border-black/10 bg-white p-3 h-fit">
        <p className="text-[10px] font-bold uppercase tracking-wider opacity-50 px-1">Folders</p>
        <nav className="space-y-0.5">
          <button type="button" className={folderNavBtn(folderView === "all")} onClick={() => setFolderView("all")}>
            All designs ({owned.length})
          </button>
          <button
            type="button"
            className={folderNavBtn(folderView === "unfiled")}
            onClick={() => setFolderView("unfiled")}
          >
            Unfiled ({unfiledCount})
          </button>
          {folders.map((f) => (
            <div key={f.id} className="group">
              {renamingFolderId === f.id ? (
                <form
                  className="flex gap-1 px-1"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void saveFolderRename(f.id);
                  }}
                >
                  <input
                    autoFocus
                    value={folderRenameValue}
                    onChange={(e) => setFolderRenameValue(e.target.value)}
                    className="flex-1 rounded border border-black/10 px-2 py-1 text-xs"
                    maxLength={80}
                  />
                  <button type="submit" className="text-[10px] font-bold underline">
                    Save
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    className={`${folderNavBtn(folderView === f.id)} flex-1 truncate`}
                    onClick={() => setFolderView(f.id)}
                  >
                    {f.name} ({f.designCount ?? 0})
                  </button>
                  <button
                    type="button"
                    title="Rename folder"
                    className="opacity-0 group-hover:opacity-100 text-[10px] px-1"
                    onClick={() => {
                      setRenamingFolderId(f.id);
                      setFolderRenameValue(f.name);
                    }}
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    title="Delete folder"
                    className="opacity-0 group-hover:opacity-100 text-[10px] px-1 text-red-700"
                    disabled={busyId === f.id}
                    onClick={() => void deleteFolder(f.id)}
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          ))}
        </nav>
        <form
          className="space-y-2 pt-2 border-t border-black/5"
          onSubmit={(e) => {
            e.preventDefault();
            void createFolder();
          }}
        >
          <input
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="New folder name"
            maxLength={80}
            className="w-full rounded-lg border border-black/10 px-2 py-1.5 text-xs"
          />
          <button
            type="submit"
            disabled={creatingFolder}
            className="w-full rounded-full px-3 py-1.5 text-xs font-bold text-white"
            style={{ background: "#0F0D33" }}
          >
            {creatingFolder ? "Creating…" : "Create folder"}
          </button>
        </form>
      </aside>

      <div className="space-y-8 min-w-0">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <label className="flex-1 min-w-[200px] text-xs font-semibold">
            Search designs
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Name or type…"
              className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm"
            />
          </label>
          <Link
            href="/studio/new"
            className="rounded-full px-4 py-2 text-sm font-bold text-white"
            style={{ background: "#0F0D33" }}
          >
            Create a design
          </Link>
        </div>

        {error ? <p className="text-xs text-red-700">{error}</p> : null}

        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider opacity-60">
            {folderView === "all"
              ? "Your designs"
              : folderView === "unfiled"
                ? "Unfiled"
                : folders.find((f) => f.id === folderView)?.name ?? "Folder"}
          </h2>
          {ownedFiltered.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-black/15 p-10 text-center bg-white">
              <p className="text-lg font-semibold mb-2">{query ? "No matches" : "No designs here yet"}</p>
              <p className="text-sm text-muted mb-6">
                Start blank, from a template, or with an AI campaign pack.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <Link
                  href="/studio/new"
                  className="inline-flex rounded-full px-5 py-2.5 text-sm font-bold text-white"
                  style={{ background: "#0F0D33" }}
                >
                  Create blank / AI
                </Link>
                <Link
                  href="/studio/templates"
                  className="inline-flex rounded-full px-5 py-2.5 text-sm font-bold border border-black/10 bg-white"
                >
                  Templates
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {ownedFiltered.map((d) => (
                <DesignCard key={d.id} d={d} canDelete />
              ))}
            </div>
          )}
        </section>

        {folderView === "all" && (sharedFiltered.length > 0 || (query && shared.length > 0)) ? (
          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider opacity-60">Shared with me</h2>
            {sharedFiltered.length === 0 ? (
              <p className="text-xs opacity-50">No matches in shared designs.</p>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {sharedFiltered.map((d) => (
                  <DesignCard key={d.id} d={d} canDelete={false} />
                ))}
              </div>
            )}
          </section>
        ) : null}
      </div>
    </div>
  );
}
