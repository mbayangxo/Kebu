"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppShell } from "@/app/components/app-shell";
import { BusinessReadinessCard, type ReadinessSummary } from "@/app/components/business/business-readiness-card";
import { KEBU } from "@/lib/kebu-brand";
import { useKebuUser } from "@/app/hooks/use-kebu-user";
import { AfriqueIdCard } from "@/app/components/account/afrique-id-card";
import { displayFirstName } from "@/lib/account/user-profile";

type BusinessRow = {
  id: string;
  public_kebu_id: string;
  legal_name: string;
  trading_name: string | null;
  logo_url?: string | null;
};

export default function AccountPage() {
  const { profile, loading, refresh } = useKebuUser();
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [businesses, setBusinesses] = useState<BusinessRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [readiness, setReadiness] = useState<ReadinessSummary | null>(null);
  const [bizLoading, setBizLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setName(profile.name ?? "");
      setCountry(profile.residenceCountry ?? "");
    }
  }, [profile]);

  const loadBusinesses = useCallback(async () => {
    setBizLoading(true);
    try {
      const res = await fetch("/api/businesses", { credentials: "include" });
      const data = (await res.json().catch(() => ({}))) as { businesses?: BusinessRow[] };
      if (res.ok) {
        const list = data.businesses ?? [];
        setBusinesses(list);
        setSelectedId((prev) => prev ?? list[0]?.id ?? null);
      }
    } finally {
      setBizLoading(false);
    }
  }, []);

  const loadReadiness = useCallback(async (id: string) => {
    const res = await fetch(`/api/businesses/${id}`, { credentials: "include" });
    const data = (await res.json().catch(() => ({}))) as { readiness?: ReadinessSummary | null };
    if (res.ok) setReadiness(data.readiness ?? null);
    else setReadiness(null);
  }, []);

  useEffect(() => {
    if (profile) void loadBusinesses();
  }, [profile, loadBusinesses]);

  useEffect(() => {
    if (selectedId) void loadReadiness(selectedId);
  }, [selectedId, loadReadiness]);

  if (loading) {
    return (
      <AppShell title="My Account">
        <p className="p-8 text-sm opacity-60">Loading…</p>
      </AppShell>
    );
  }

  if (!profile) {
    return (
      <AppShell title="My Account">
        <div className="max-w-lg mx-auto px-6 py-16 text-center">
          <h1 className="text-xl font-bold mb-3">Sign in to see your profile</h1>
          <Link href="/login?next=/account" className="font-bold text-sm underline" style={{ color: KEBU.orange }}>
            Sign in
          </Link>
        </div>
      </AppShell>
    );
  }

  const first = displayFirstName(profile.name, profile.email);
  const selected = businesses.find((b) => b.id === selectedId);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/me/profile", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, residenceCountry: country || null }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Could not save.");
      return;
    }
    setNote("Profile saved.");
    void refresh();
  }

  async function uploadAvatar(file: File) {
    setBusy(true);
    setError(null);
    const form = new FormData();
    form.set("file", file);
    const res = await fetch("/api/me/avatar", { method: "POST", credentials: "include", body: form });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Upload failed.");
      return;
    }
    setNote("Photo updated.");
    void refresh();
  }

  return (
    <AppShell title="My Account">
      <div className="max-w-2xl mx-auto px-5 py-8 lg:py-12">
        <h1 className="text-2xl lg:text-3xl font-bold mb-1" style={{ fontFamily: "var(--font-fraunces)" }}>
          Welcome back, {first}
        </h1>
        <p className="text-sm mt-1" style={{ color: KEBU.muted }}>
          Your personal Kebu — name, photo, Afrique ID. Business identity lives in{" "}
          <Link href="/business" className="font-semibold underline" style={{ color: KEBU.orange }}>
            Kebu Business
          </Link>
          . Home overview:{" "}
          <Link href="/dashboard" className="font-semibold underline" style={{ color: KEBU.orange }}>
            Your Kebu
          </Link>
          .
        </p>

        <section className="rounded-2xl border bg-white p-5 mb-6" style={{ borderColor: KEBU.border }}>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-4" style={{ color: KEBU.faint }}>
            Personal account
          </p>
          <div className="flex items-center gap-4 mb-5">
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatarUrl} alt="" className="w-16 h-16 rounded-full object-cover" />
            ) : (
              <span
                className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white"
                style={{ background: KEBU.orange }}
              >
                {first.charAt(0).toUpperCase()}
              </span>
            )}
            <div>
              <p className="font-semibold">{profile.name || first}</p>
              <p className="text-xs" style={{ color: KEBU.muted }}>
                {profile.email}
              </p>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadAvatar(f);
                }}
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => fileRef.current?.click()}
                className="mt-2 text-[11px] font-bold underline disabled:opacity-60"
                style={{ color: KEBU.orange }}
              >
                {busy ? "Uploading…" : "Change photo"}
              </button>
            </div>
          </div>
          <form onSubmit={(e) => void saveProfile(e)} className="space-y-3">
            <label className="block text-sm">
              <span className="font-semibold">Name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                required
              />
            </label>
            <label className="block text-sm">
              <span className="font-semibold">Country you live in</span>
              <input
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                placeholder="e.g. Senegal"
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="rounded-full px-5 py-2 text-xs font-bold text-white disabled:opacity-60"
              style={{ background: KEBU.black }}
            >
              Save personal info
            </button>
          </form>
        </section>

        {profile.afriqueId ? (
          <AfriqueIdCard
            afriqueId={profile.afriqueId}
            displayName={profile.name || first}
            onRefresh={() => void refresh()}
          />
        ) : null}

        <section className="mb-6">
          <p className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: KEBU.faint }}>
            Kebu ID & score
          </p>
          {bizLoading ? (
            <p className="text-sm" style={{ color: KEBU.muted }}>
              Loading businesses…
            </p>
          ) : businesses.length === 0 ? (
            <div className="rounded-2xl border bg-white p-6" style={{ borderColor: KEBU.border }}>
              <p className="text-sm mb-4" style={{ color: KEBU.muted }}>
                No Kebu ID yet. Register a business to get your permanent ID and readiness score.
              </p>
              <Link
                href="/business/register"
                className="inline-flex rounded-full px-5 py-2.5 text-xs font-bold text-white"
                style={{ background: KEBU.orange }}
              >
                Register your business
              </Link>
            </div>
          ) : (
            <>
              {businesses.length > 1 ? (
                <select
                  className="w-full rounded-lg border px-3 py-2 text-sm mb-4 bg-white"
                  style={{ borderColor: KEBU.border }}
                  value={selectedId ?? ""}
                  onChange={(e) => setSelectedId(e.target.value)}
                >
                  {businesses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.trading_name || b.legal_name} · {b.public_kebu_id}
                    </option>
                  ))}
                </select>
              ) : null}

              {selected ? (
                <div
                  className="rounded-2xl border bg-white p-5 mb-4 flex items-center gap-4"
                  style={{ borderColor: KEBU.border }}
                >
                  {selected.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={selected.logo_url} alt="" className="w-12 h-12 rounded-xl object-cover" />
                  ) : (
                    <span
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold text-white"
                      style={{ background: KEBU.orange }}
                    >
                      {(selected.trading_name || selected.legal_name).charAt(0)}
                    </span>
                  )}
                  <div>
                    <p className="font-bold">{selected.trading_name || selected.legal_name}</p>
                    <p className="text-xs font-mono" style={{ color: KEBU.orange }}>
                      {selected.public_kebu_id}
                    </p>
                  </div>
                </div>
              ) : null}

              {readiness && selectedId ? (
                <BusinessReadinessCard readiness={readiness} businessId={selectedId} compact />
              ) : (
                <p className="text-sm" style={{ color: KEBU.faint }}>
                  No readiness score yet — complete your business profile and documents.
                </p>
              )}
            </>
          )}
        </section>

        <div className="flex flex-wrap gap-4 text-sm">
          <Link href="/b2b" className="font-semibold underline" style={{ color: KEBU.orange }}>
            B2B trade profile
          </Link>
          <Link href="/create" className="font-semibold underline" style={{ color: KEBU.orange }}>
            Kebu Builder
          </Link>
        </div>

        {note ? <p className="text-sm text-green-700 mt-6">{note}</p> : null}
        {error ? <p className="text-sm text-red-600 mt-6">{error}</p> : null}
      </div>
    </AppShell>
  );
}
