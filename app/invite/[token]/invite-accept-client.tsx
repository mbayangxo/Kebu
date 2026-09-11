"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KEBU } from "@/lib/kebu-brand";
import { inviteRoleLabel } from "@/lib/business/team-roles";
import { AppShell } from "@/app/components/app-shell";

export function InviteAcceptClient({ token }: { token: string }) {
  const router = useRouter();
  const [preview, setPreview] = useState<{
    email: string;
    role: string;
    status: string;
    businessName: string;
    expiresAt: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`/api/invites/${encodeURIComponent(token)}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(typeof data.error === "string" ? data.error : "Invite not found.");
          return;
        }
        setPreview({
          email: data.email,
          role: data.role,
          status: data.status,
          businessName: data.businessName,
          expiresAt: data.expiresAt,
        });
      } catch {
        setError("Network error.");
      }
    })();
  }, [token]);

  async function accept() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/invites/${encodeURIComponent(token)}`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not accept.");
        if (res.status === 401) {
          router.push(`/login?next=${encodeURIComponent(`/invite/${token}`)}`);
        }
        return;
      }
      if (typeof data.redirectTo === "string") {
        router.push(data.redirectTo);
      }
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <main className="mx-auto max-w-lg px-4 py-12">
        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.orange }}>
          Team invite
        </p>
        {error && !preview ? (
          <p className="mt-4 text-sm" style={{ color: "#8B1E1E" }}>{error}</p>
        ) : !preview ? (
          <p className="mt-4 text-sm" style={{ color: KEBU.muted }}>
            Loading invite…
          </p>
        ) : (
          <>
            <h1 className="mt-2 text-2xl font-bold" style={{ color: KEBU.black }}>
              Join {preview.businessName}
            </h1>
            <p className="mt-2 text-sm" style={{ color: KEBU.muted }}>
              Role: <strong>{inviteRoleLabel(preview.role)}</strong>
              <br />
              Sign in as <strong>{preview.email}</strong> to accept.
            </p>
            <p className="mt-1 text-[11px] opacity-60">
              Expires {new Date(preview.expiresAt).toLocaleString()} · status {preview.status}
            </p>
            {error ? <p className="mt-3 text-sm" style={{ color: "#8B1E1E" }}>{error}</p> : null}
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={busy || preview.status !== "pending"}
                onClick={() => void accept()}
                className="rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white disabled:opacity-50"
                style={{ background: KEBU.orange }}
              >
                Accept invite
              </button>
              <Link
                href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`}
                className="rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-wider"
                style={{ border: `1px solid ${KEBU.border}` }}
              >
                Sign in first
              </Link>
            </div>
          </>
        )}
      </main>
    </AppShell>
  );
}
