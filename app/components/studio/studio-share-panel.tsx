"use client";

import { useCallback, useEffect, useState } from "react";
import type { StudioDesignAccess } from "@/lib/studio/design-access";
import { studioRoleLabel } from "@/lib/studio/design-access";

type CollabRow = {
  id: string;
  email: string;
  role: string;
  status: string;
  user_id: string;
  created_at: string;
};

/** Owner invite panel — share Studio design with existing Kebu accounts. */
export function StudioSharePanel({
  designId,
  access,
}: {
  designId: string;
  access: StudioDesignAccess;
}) {
  const [collaborators, setCollaborators] = useState<CollabRow[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor" | "viewer">("editor");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/create/designs/${designId}/collaborators`, {
      credentials: "include",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Could not load share list.");
      return;
    }
    setCollaborators(Array.isArray(data.collaborators) ? data.collaborators : []);
    setError(null);
  }, [designId]);

  useEffect(() => {
    if (access.canShare) void load();
  }, [access.canShare, load]);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const res = await fetch(`/api/create/designs/${designId}/collaborators`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Invite failed.");
        return;
      }
      setEmail("");
      setNote(`Invited ${data.collaborator?.email ?? "collaborator"} (${role}).`);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function revoke(collabId: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/create/designs/${designId}/collaborators/${collabId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not remove.");
        return;
      }
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (!access.canShare) {
    return (
      <div className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm">
        <p className="text-[10px] font-bold uppercase tracking-wider text-orange-600">Access</p>
        <p className="mt-1 font-semibold">{studioRoleLabel(access.role)}</p>
        <p className="text-xs opacity-60 mt-1">
          Shared with you — only the owner can invite others. Live cursors show when both of you have the
          design open. You edit the same saved design.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-black/10 bg-white px-4 py-3 space-y-3">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-orange-600">Share & collaborate</p>
        <p className="text-xs opacity-60 mt-1 leading-relaxed">
          Invite someone who already has a Kebu account. Editors can save; viewers are read-only. Live
          cursors appear when collaborators are in the editor at the same time.
        </p>
      </div>

      <form onSubmit={(e) => void invite(e)} className="flex flex-wrap gap-2 items-end">
        <label className="flex-1 min-w-[180px] text-xs font-semibold">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="teammate@email.com"
            className="mt-1 w-full rounded-lg border border-black/10 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs font-semibold">
          Role
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "editor" | "viewer")}
            className="mt-1 block rounded-lg border border-black/10 px-2 py-1.5 text-sm"
          >
            <option value="editor">Can edit</option>
            <option value="viewer">View only</option>
          </select>
        </label>
        <button
          type="submit"
          disabled={busy}
          className="rounded-full px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
          style={{ background: "#0F0D33" }}
        >
          {busy ? "…" : "Invite"}
        </button>
      </form>

      {error ? <p className="text-xs text-red-700">{error}</p> : null}
      {note ? <p className="text-xs text-emerald-800">{note}</p> : null}

      {collaborators.length === 0 ? (
        <p className="text-xs opacity-50">No collaborators yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {collaborators.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-black/5 px-2 py-1.5 text-xs"
            >
              <span>
                <span className="font-semibold">{c.email}</span>
                <span className="opacity-50 ml-2">{c.role === "editor" ? "Can edit" : "View only"}</span>
              </span>
              <button
                type="button"
                disabled={busy}
                className="underline opacity-60"
                onClick={() => void revoke(c.id)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
