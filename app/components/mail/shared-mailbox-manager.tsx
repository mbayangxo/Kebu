"use client";

import { useCallback, useEffect, useState } from "react";
import { KEBU } from "@/lib/kebu-brand";

type Member = { userId: string; role: "manager" | "member"; name: string | null; email: string | null };
type Candidate = { userId: string; name: string | null; email: string | null };
type SharedMailbox = {
  id: string;
  address: string;
  display_name: string;
  canManage: boolean;
  members: Member[];
  candidates: Candidate[];
};
type SharedMailState = {
  businessId: string;
  canCreate: boolean;
  mailboxes: SharedMailbox[];
};

function personLabel(person: { name: string | null; email: string | null }) {
  return person.name?.trim() || person.email || "Unnamed teammate";
}

export function SharedMailboxManager({ onMailboxCreated }: { onMailboxCreated?: () => void }) {
  const [state, setState] = useState<SharedMailState | null>(null);
  const [verifiedDomain, setVerifiedDomain] = useState<{ id: string; domain: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [localPart, setLocalPart] = useState("support");
  const [displayName, setDisplayName] = useState("Support");
  const [addRoleByMailbox, setAddRoleByMailbox] = useState<Record<string, "manager" | "member">>({});
  const [addUserByMailbox, setAddUserByMailbox] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setError(null);
    const [sharedRes, businessRes] = await Promise.all([
      fetch("/api/mail/shared", { credentials: "include" }),
      fetch("/api/mail/business", { credentials: "include" }),
    ]);
    const sharedData = await sharedRes.json().catch(() => ({}));
    if (!sharedRes.ok) {
      setError(sharedData.error || "Could not load shared mailboxes.");
      return;
    }
    setState(sharedData as SharedMailState);

    const businessData = await businessRes.json().catch(() => ({}));
    if (businessRes.ok) {
      const verified = (businessData.mailDomains ?? []).find((domain: { status: string }) => domain.status === "verified");
      setVerifiedDomain(verified ? { id: verified.id, domain: verified.domain } : null);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function action(payload: Record<string, unknown>, key: string) {
    if (busy) return;
    setBusy(key);
    setError(null);
    const res = await fetch("/api/mail/shared", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      setError(data.error || "Shared mailbox action failed.");
      return;
    }
    await load();
    if (payload.action === "create") onMailboxCreated?.();
  }

  if (!state && !error) {
    return <p className="text-[10px]" style={{ color: KEBU.muted }}>Loading shared mailboxes…</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[9px] font-black uppercase tracking-[.14em]" style={{ color: KEBU.orange }}>Shared Mailboxes</p>
        <h2 className="mt-1 text-lg font-black">Team access, no shared password</h2>
        <p className="mt-1 text-[10px] leading-relaxed" style={{ color: KEBU.muted }}>
          A shared mailbox like <strong>support@</strong> lets specific teammates send and read as that address,
          each signed in with their own Kebu Account. Only people you add below can see it.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border px-3 py-2 text-[10px]" style={{ borderColor: KEBU.status.errorBorder, background: KEBU.status.errorBg, color: KEBU.status.errorText }}>
          {error}
        </div>
      ) : null}

      {state?.canCreate ? (
        <section className="rounded-[16px] border p-3" style={{ borderColor: KEBU.borders.default }}>
          <p className="text-[10px] font-black">Create a shared mailbox</p>
          {!verifiedDomain ? (
            <p className="mt-2 text-[10px]" style={{ color: KEBU.muted }}>
              Verify a business mail domain in Business Mail settings first — shared mailboxes need a verified domain to live under.
            </p>
          ) : (
            <>
              <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
                <div className="flex min-h-10 items-center rounded-xl border bg-white" style={{ borderColor: KEBU.borders.default }}>
                  <input
                    value={localPart}
                    onChange={(event) => setLocalPart(event.target.value)}
                    placeholder="support"
                    className="min-w-0 flex-1 bg-transparent px-3 text-[10px] font-bold outline-none"
                  />
                  <span className="pr-3 text-[9px]" style={{ color: KEBU.muted }}>@{verifiedDomain.domain}</span>
                </div>
                <input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Display name"
                  className="min-h-10 rounded-xl border bg-white px-3 text-[10px] font-bold outline-none"
                  style={{ borderColor: KEBU.borders.default }}
                />
              </div>
              <button
                type="button"
                disabled={!localPart.trim() || !displayName.trim() || Boolean(busy)}
                onClick={() => void action({ action: "create", mailDomainId: verifiedDomain.id, localPart, displayName }, "create")}
                className="mt-3 rounded-full px-4 py-2 text-[9px] font-black uppercase tracking-wide text-white disabled:opacity-35"
                style={{ background: "linear-gradient(90deg,#FF6A00,#FF1F1F)" }}
              >
                {busy === "create" ? "Creating…" : "Create shared mailbox →"}
              </button>
            </>
          )}
        </section>
      ) : null}

      {(state?.mailboxes ?? []).length === 0 ? (
        <p className="text-[10px]" style={{ color: KEBU.muted }}>No shared mailboxes yet.</p>
      ) : null}

      {(state?.mailboxes ?? []).map((mailbox) => (
        <section key={mailbox.id} className="rounded-[16px] border p-3" style={{ borderColor: KEBU.borders.default }}>
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[10px] font-black">{mailbox.display_name}</p>
              <p className="text-[9px]" style={{ color: KEBU.muted }}>{mailbox.address}</p>
            </div>
            <span className="rounded-full bg-black/[.05] px-2 py-1 text-[8px] font-black uppercase tracking-wide" style={{ color: KEBU.muted }}>
              {mailbox.members.length} {mailbox.members.length === 1 ? "person" : "people"}
            </span>
          </div>

          {!mailbox.canManage ? (
            <p className="mt-2 text-[9px]" style={{ color: KEBU.muted }}>You have access to this mailbox but can't manage its team.</p>
          ) : (
            <>
              <div className="mt-3 space-y-1.5">
                {mailbox.members.map((member) => (
                  <div key={member.userId} className="flex items-center justify-between gap-2 rounded-xl bg-black/[.025] px-2.5 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-[9px] font-semibold">{personLabel(member)}</p>
                      <p className="text-[8px] uppercase tracking-wide" style={{ color: KEBU.muted }}>{member.role}</p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        disabled={Boolean(busy)}
                        aria-label={(member.role === "manager" ? "Make member: " : "Make manager: ") + personLabel(member)}
                        onClick={() =>
                          void action(
                            { action: "update_role", mailboxId: mailbox.id, userId: member.userId, role: member.role === "manager" ? "member" : "manager" },
                            `role-${member.userId}`,
                          )
                        }
                        className="rounded-full border px-2 py-1 text-[8px] font-bold"
                        style={{ borderColor: KEBU.borders.default }}
                      >
                        {member.role === "manager" ? "Make member" : "Make manager"}
                      </button>
                      <button
                        type="button"
                        disabled={Boolean(busy)}
                        aria-label={"Remove: " + personLabel(member)}
                        onClick={() => void action({ action: "remove_member", mailboxId: mailbox.id, userId: member.userId }, `remove-${member.userId}`)}
                        className="rounded-full border px-2 py-1 text-[8px] font-bold"
                        style={{ borderColor: KEBU.status.errorBorder, color: KEBU.status.errorText }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {mailbox.candidates.length ? (
                <div className="mt-3 flex gap-2">
                  <select
                    value={addUserByMailbox[mailbox.id] ?? mailbox.candidates[0]?.userId ?? ""}
                    onChange={(event) => setAddUserByMailbox((prev) => ({ ...prev, [mailbox.id]: event.target.value }))}
                    className="min-h-9 min-w-0 flex-1 rounded-xl border bg-white px-2 text-[9px] font-bold"
                    style={{ borderColor: KEBU.borders.default }}
                  >
                    {mailbox.candidates.map((candidate) => (
                      <option key={candidate.userId} value={candidate.userId}>{personLabel(candidate)}</option>
                    ))}
                  </select>
                  <select
                    value={addRoleByMailbox[mailbox.id] ?? "member"}
                    onChange={(event) => setAddRoleByMailbox((prev) => ({ ...prev, [mailbox.id]: event.target.value as "manager" | "member" }))}
                    className="min-h-9 rounded-xl border bg-white px-2 text-[9px] font-bold"
                    style={{ borderColor: KEBU.borders.default }}
                  >
                    <option value="member">Member</option>
                    <option value="manager">Manager</option>
                  </select>
                  <button
                    type="button"
                    disabled={Boolean(busy) || !addUserByMailbox[mailbox.id] && !mailbox.candidates[0]}
                    onClick={() =>
                      void action(
                        {
                          action: "add_member",
                          mailboxId: mailbox.id,
                          userId: addUserByMailbox[mailbox.id] ?? mailbox.candidates[0]?.userId,
                          role: addRoleByMailbox[mailbox.id] ?? "member",
                        },
                        `add-${mailbox.id}`,
                      )
                    }
                    className="shrink-0 rounded-full bg-black px-3 text-[9px] font-black uppercase tracking-wide text-white disabled:opacity-35"
                  >
                    Add
                  </button>
                </div>
              ) : (
                <p className="mt-3 text-[9px]" style={{ color: KEBU.muted }}>Everyone active on this Business Kebu already has access.</p>
              )}
            </>
          )}
        </section>
      ))}
    </div>
  );
}
