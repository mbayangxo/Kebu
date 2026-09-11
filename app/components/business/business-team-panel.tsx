"use client";

import { useCallback, useEffect, useState } from "react";
import { KEBU } from "@/lib/kebu-brand";
import { inviteRoleLabel } from "@/lib/business/team-roles";

type RoleOpt = { id: string; label: string };
type InviteRow = {
  id: string;
  email: string;
  role: string;
  roleLabel: string;
  status: string;
  acceptPath: string;
  expiresAt: string;
};
type MemberRow = { id: string; user_id: string; role: string; status: string };

export function BusinessTeamPanel({ businessId }: { businessId: string }) {
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [roles, setRoles] = useState<RoleOpt[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("creative");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [lastLink, setLastLink] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/businesses/${businessId}/team`, { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not load team.");
        return;
      }
      setMembers(Array.isArray(data.members) ? data.members : []);
      setInvites(Array.isArray(data.invites) ? data.invites : []);
      setRoles(Array.isArray(data.roles) ? data.roles : []);
      if (typeof data.warning === "string" && data.warning) setError(data.warning);
      if (data.roles?.length && !data.roles.some((r: RoleOpt) => r.id === role)) {
        setRole(data.roles[0].id);
      }
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }, [businessId, role]);

  useEffect(() => {
    void load();
  }, [load]);

  async function sendInvite() {
    setBusy(true);
    setHint(null);
    setError(null);
    setLastLink(null);
    try {
      const res = await fetch(`/api/businesses/${businessId}/team`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role, message }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Invite failed.");
        return;
      }
      setHint(typeof data.hint === "string" ? data.hint : "Invite created.");
      if (typeof data.acceptUrl === "string") setLastLink(data.acceptUrl);
      setEmail("");
      setMessage("");
      await load();
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  async function revoke(inviteId: string) {
    setBusy(true);
    try {
      await fetch(`/api/businesses/${businessId}/team`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke", inviteId }),
      });
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className="rounded-2xl p-5 mb-6"
      style={{ background: KEBU.card, border: `1px solid ${KEBU.border}` }}
    >
      <h2 className="text-sm font-bold uppercase tracking-wider mb-1">Team</h2>
      <p className="mb-4 text-xs leading-relaxed" style={{ color: KEBU.muted }}>
        Invite real managers and creatives by email. They get a role on this Kebu ID — not a fake
        roster. Studio poster editor is not built yet — use Reels · MVs for video links.
      </p>

      {loading ? (
        <p className="text-sm" style={{ color: KEBU.muted }}>
          Loading team…
        </p>
      ) : (
        <>
          <h3 className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: KEBU.faint }}>
            Members
          </h3>
          <ul className="mb-4 space-y-1 text-sm">
            {members.length === 0 ? (
              <li style={{ color: KEBU.muted }}>No members yet.</li>
            ) : (
              members.map((m) => (
                <li key={m.id} style={{ color: KEBU.muted }}>
                  {inviteRoleLabel(m.role)} · {m.status}
                </li>
              ))
            )}
          </ul>

          <h3 className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: KEBU.faint }}>
            Invite someone
          </h3>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
            <label className="text-[10px] font-bold uppercase tracking-wider flex-1 min-w-[160px]">
              Email
              <input
                type="email"
                className="mt-0.5 w-full rounded-md border px-2 py-1.5 text-xs normal-case tracking-normal"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="creative@example.com"
              />
            </label>
            <label className="text-[10px] font-bold uppercase tracking-wider">
              Role
              <select
                className="mt-0.5 ml-0 sm:ml-1 block rounded-md border px-2 py-1.5 text-xs normal-case tracking-normal"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                {(roles.length ? roles : [{ id: "creative", label: "Creative" }]).map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={busy || !email.trim()}
              onClick={() => void sendInvite()}
              className="rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-white disabled:opacity-50"
              style={{ background: KEBU.orange }}
            >
              Send invite
            </button>
          </div>
          <label className="mt-2 block text-[10px] font-bold uppercase tracking-wider">
            Note (optional)
            <input
              className="mt-0.5 w-full rounded-md border px-2 py-1.5 text-xs normal-case tracking-normal"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Welcome to the DkLNS desk…"
              maxLength={400}
            />
          </label>

          {error ? <p className="mt-2 text-sm" style={{ color: "#8B1E1E" }}>{error}</p> : null}
          {hint ? (
            <p className="mt-2 text-sm" style={{ color: KEBU.muted }}>
              {hint}
            </p>
          ) : null}
          {lastLink ? (
            <p className="mt-1 break-all text-[11px]" style={{ color: KEBU.orange }}>
              {lastLink}
            </p>
          ) : null}

          {invites.filter((i) => i.status === "pending").length > 0 ? (
            <>
              <h3
                className="mt-4 text-[10px] font-bold uppercase tracking-wider mb-2"
                style={{ color: KEBU.faint }}
              >
                Pending invites
              </h3>
              <ul className="space-y-2 text-sm">
                {invites
                  .filter((i) => i.status === "pending")
                  .map((i) => (
                    <li
                      key={i.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg px-2 py-2"
                      style={{ background: KEBU.cream, border: `1px solid ${KEBU.border}` }}
                    >
                      <span>
                        {i.email} · {i.roleLabel}
                      </span>
                      <span className="flex gap-2">
                        <button
                          type="button"
                          className="text-[10px] font-bold uppercase tracking-wider underline"
                          style={{ color: KEBU.orange }}
                          onClick={() => {
                            const url =
                              typeof window !== "undefined"
                                ? `${window.location.origin}${i.acceptPath}`
                                : i.acceptPath;
                            void navigator.clipboard?.writeText(url);
                            setHint("Invite link copied.");
                          }}
                        >
                          Copy link
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          className="text-[10px] font-bold uppercase tracking-wider"
                          style={{ color: "#8B1E1E" }}
                          onClick={() => void revoke(i.id)}
                        >
                          Revoke
                        </button>
                      </span>
                    </li>
                  ))}
              </ul>
            </>
          ) : null}
        </>
      )}
    </section>
  );
}
