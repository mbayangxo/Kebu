"use client";

import { useCallback, useEffect, useState } from "react";
import { KEBU } from "@/lib/kebu-brand";

type Connection = {
  id: string;
  status: "pending" | "accepted" | "declined" | "blocked";
  direction: "incoming" | "outgoing";
  other: { id: string; name: string | null; avatar_url: string | null; public_kebu_id?: string | null };
};

type Person = { id: string; name: string | null; avatar_url: string | null; public_kebu_id: string };

export function PersonalPeoplePanel() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<Person | null>(null);
  const [searching, setSearching] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/people/connections", { credentials: "include", cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (res.ok) setConnections(Array.isArray(data.connections) ? data.connections : []);
    else setError(data.error || "Could not load your people.");
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function search(event: React.FormEvent) {
    event.preventDefault();
    const q = query.trim().toUpperCase();
    if (!q) return;
    setSearching(true);
    setError(null);
    setFound(null);
    try {
      const res = await fetch("/api/people/find?q=" + encodeURIComponent(q), { credentials: "include", cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Search failed.");
      setFound(data.person ?? null);
      if (!data.person) setError("No Kebu account found with that public Kebu ID.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Search failed.");
    } finally {
      setSearching(false);
    }
  }

  async function requestFriend(person: Person) {
    setBusyId(person.id);
    setError(null);
    const res = await fetch("/api/people/connections", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addresseeId: person.id }),
    });
    const data = await res.json().catch(() => ({}));
    setBusyId(null);
    if (!res.ok) {
      setError(data.error || "Could not send request.");
      return;
    }
    setFound(null);
    setQuery("");
    await load();
  }

  async function act(id: string, action: "accept" | "decline" | "block") {
    setBusyId(id);
    setError(null);
    const res = await fetch("/api/people/connections", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    const data = await res.json().catch(() => ({}));
    setBusyId(null);
    if (!res.ok) {
      setError(data.error || "Could not update request.");
      return;
    }
    await load();
  }

  const friends = connections.filter((item) => item.status === "accepted");
  const incoming = connections.filter((item) => item.status === "pending" && item.direction === "incoming");
  const outgoing = connections.filter((item) => item.status === "pending" && item.direction === "outgoing");

  return (
    <div className="space-y-6">
      <section className="rounded-[22px] border bg-white p-5 sm:p-6" style={{ borderColor: KEBU.borders.default }}>
        <p className="text-[9px] font-black uppercase tracking-[.16em]" style={{ color: KEBU.orange }}>Add a person</p>
        <h2 className="mt-2 text-xl font-black">Use their public Kebu ID.</h2>
        <p className="mt-1 max-w-xl text-[11px] leading-relaxed" style={{ color: KEBU.muted }}>
          Personal People is separate from business staff. Search an exact ID such as KBU-P-XXXXXXXXXX; internal database IDs and email addresses are never exposed.
        </p>
        <form onSubmit={(event) => void search(event)} className="mt-4 flex max-w-xl gap-2">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="KBU-P-XXXXXXXXXX"
            className="min-h-11 min-w-0 flex-1 rounded-full border px-4 text-sm font-semibold uppercase outline-none focus:ring-2 focus:ring-[#FF6A00]"
            style={{ borderColor: KEBU.borders.default }}
          />
          <button type="submit" disabled={searching || !query.trim()} className="rounded-full bg-black px-5 text-[10px] font-black uppercase tracking-wide text-white disabled:opacity-40">
            {searching ? "Finding…" : "Find"}
          </button>
        </form>

        {found ? (
          <div className="mt-4 flex max-w-xl items-center gap-3 rounded-[18px] border p-3" style={{ borderColor: KEBU.borders.default }}>
            {found.avatar_url ? <img src={found.avatar_url} alt="" className="h-11 w-11 rounded-full object-cover" /> : <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black text-sm font-black text-white">{(found.name || "K").charAt(0).toUpperCase()}</span>}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-black">{found.name || "Kebu person"}</p>
              <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wide" style={{ color: KEBU.muted }}>{found.public_kebu_id}</p>
            </div>
            <button type="button" disabled={busyId === found.id} onClick={() => void requestFriend(found)} className="rounded-full px-4 py-2 text-[9px] font-black uppercase tracking-wide text-white disabled:opacity-40" style={{ background: KEBU.orange }}>
              {busyId === found.id ? "Sending…" : "Add"}
            </button>
          </div>
        ) : null}
        {error ? <p className="mt-3 text-xs font-semibold text-red-700">{error}</p> : null}
      </section>

      {incoming.length ? (
        <section>
          <h2 className="mb-3 text-sm font-black">Requests</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {incoming.map((item) => (
              <PersonCard key={item.id} connection={item}>
                <button disabled={busyId === item.id} onClick={() => void act(item.id, "accept")} className="rounded-full bg-black px-3 py-1.5 text-[9px] font-black uppercase tracking-wide text-white">Accept</button>
                <button disabled={busyId === item.id} onClick={() => void act(item.id, "decline")} className="rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-wide" style={{ borderColor: KEBU.borders.default }}>Decline</button>
              </PersonCard>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-black">Friends</h2>
          <span className="text-[9px] font-black uppercase tracking-wide" style={{ color: KEBU.muted }}>{friends.length} connected</span>
        </div>
        {friends.length ? (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {friends.map((item) => <PersonCard key={item.id} connection={item} />)}
          </div>
        ) : (
          <div className="rounded-[22px] border border-dashed bg-white p-8 text-center" style={{ borderColor: KEBU.borders.default }}>
            <p className="text-sm font-black">Your personal People network starts here.</p>
            <p className="mt-1 text-[10px]" style={{ color: KEBU.muted }}>Friends are not automatically added to any business.</p>
          </div>
        )}
      </section>

      {outgoing.length ? <p className="text-[10px]" style={{ color: KEBU.muted }}>{outgoing.length} friend request{outgoing.length === 1 ? "" : "s"} waiting for a response.</p> : null}
    </div>
  );
}

function PersonCard({ connection, children }: { connection: Connection; children?: React.ReactNode }) {
  const person = connection.other;
  return (
    <article className="rounded-[20px] border bg-white p-4" style={{ borderColor: KEBU.borders.default }}>
      <div className="flex items-center gap-3">
        {person.avatar_url ? <img src={person.avatar_url} alt="" className="h-11 w-11 rounded-full object-cover" /> : <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black text-sm font-black text-white">{(person.name || "K").charAt(0).toUpperCase()}</span>}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-black">{person.name || "Kebu person"}</p>
          {person.public_kebu_id ? <p className="mt-0.5 truncate text-[9px] font-bold uppercase tracking-wide" style={{ color: KEBU.muted }}>{person.public_kebu_id}</p> : null}
        </div>
      </div>
      {children ? <div className="mt-4 flex flex-wrap gap-2">{children}</div> : null}
    </article>
  );
}
