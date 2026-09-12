"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppShell } from "@/app/components/app-shell";
import { BusinessReadinessCard, type ReadinessSummary } from "@/app/components/business/business-readiness-card";
import { KEBU } from "@/lib/kebu-brand";
import { useKebuUser } from "@/app/hooks/use-kebu-user";
import { AfriqueIdCard } from "@/app/components/account/afrique-id-card";
import { AccountHostingBilling } from "@/app/components/account/account-hosting-billing";
import { DataModeControls } from "@/app/components/create/data-mode-provider";
import { displayFirstName } from "@/lib/account/user-profile";
import { evaluateKb, measureResponseBytes } from "@/lib/create/kb-budget";
import { resolveClientDataMode } from "@/lib/create/data-mode";
import { MY_SITES_HREF } from "@/lib/navigation/product-nav";

type BusinessRow = {
  id: string;
  public_kebu_id: string;
  legal_name: string;
  trading_name: string | null;
  logo_url?: string | null;
};

type SectionId = "personal" | "security" | "ids" | "data" | "billing" | null;

function ListRow({
  title,
  hint,
  open,
  onClick,
}: {
  title: string;
  hint: string;
  open: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-black/[0.03]"
      aria-expanded={open}
    >
      <span>
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block text-[11px] mt-0.5" style={{ color: KEBU.muted }}>
          {hint}
        </span>
      </span>
      <span className="text-xs font-bold" style={{ color: KEBU.orange }}>
        {open ? "−" : "→"}
      </span>
    </button>
  );
}

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
  const [section, setSection] = useState<SectionId>("personal");
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

  function toggle(id: SectionId) {
    setSection((prev) => (prev === id ? null : id));
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const mode = resolveClientDataMode();
    const res = await fetch("/api/me/profile", {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-Kebu-Data-Mode": mode,
      },
      body: JSON.stringify({ name, residenceCountry: country || null }),
    });
    const bytes = await measureResponseBytes(res);
    const ev = evaluateKb({ action: "save_profile", mode, usedBytes: bytes });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Could not save.");
      return;
    }
    setNote(`${ev.summary} Profile saved.`);
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
      <div className="max-w-xl mx-auto px-5 py-8 lg:py-10">
        <div className="flex items-center gap-4 mb-6">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="relative group shrink-0 rounded-full focus:outline-none focus-visible:ring-2"
            style={{ "--ring-color": KEBU.orange } as React.CSSProperties}
            aria-label="Change profile photo"
          >
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatarUrl} alt="" className="w-16 h-16 rounded-full object-cover" />
            ) : (
              <span
                className="w-16 h-16 rounded-full flex items-center justify-center text-lg font-black text-white"
                style={{ background: KEBU.orange }}
              >
                {first.charAt(0).toUpperCase()}
              </span>
            )}
            {/* Camera overlay on hover */}
            <span
              className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: "rgba(0,0,0,0.45)" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </span>
            {busy && (
              <span className="absolute inset-0 rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }}>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </span>
            )}
          </button>
          <div className="min-w-0">
            <h1 className="text-xl font-bold truncate" style={{ fontFamily: "var(--font-fraunces)" }}>
              {first}
            </h1>
            <p className="text-xs truncate" style={{ color: KEBU.muted }}>
              {profile.email}
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: KEBU.orange }}>Tap photo to change</p>
          </div>
        </div>

        <div className="rounded-xl border bg-white overflow-hidden divide-y" style={{ borderColor: KEBU.border }}>
          <ListRow
            title="Personal info"
            hint="Name, photo, country"
            open={section === "personal"}
            onClick={() => toggle("personal")}
          />
          {section === "personal" ? (
            <div className="px-4 py-4 space-y-3 bg-[#FFFBFA]">
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
                  <span className="font-semibold">Country</span>
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
                  Save
                </button>
              </form>
            </div>
          ) : null}

          <ListRow
            title="Password & security"
            hint="Reset password via email"
            open={section === "security"}
            onClick={() => toggle("security")}
          />
          {section === "security" ? (
            <div className="px-4 py-4 bg-[#FFFBFA] text-sm" style={{ color: KEBU.muted }}>
              <p className="mb-3">Use the signed-in email flow to reset your password.</p>
              <Link href="/login?reset=1" className="font-bold underline" style={{ color: KEBU.orange }}>
                Reset password
              </Link>
            </div>
          ) : null}

          <ListRow
            title="IDs & scores"
            hint="Afri ID · Kebu ID · readiness (private)"
            open={section === "ids"}
            onClick={() => toggle("ids")}
          />
          {section === "ids" ? (
            <div className="px-4 py-4 space-y-4 bg-[#FFFBFA]">
              <p className="text-[11px]" style={{ color: KEBU.muted }}>
                Private business identity — keep this separate from everyday personal settings. Password lock for this
                drawer is planned; treat as sensitive for now.
              </p>
              {profile.afriqueId ? (
                <AfriqueIdCard
                  afriqueId={profile.afriqueId}
                  displayName={profile.name || first}
                  onRefresh={() => void refresh()}
                />
              ) : (
                <p className="text-sm" style={{ color: KEBU.muted }}>
                  No Afri ID yet.{" "}
                  <Link href="/welcome" className="font-bold underline" style={{ color: KEBU.orange }}>
                    Personalize
                  </Link>
                </p>
              )}
              {bizLoading ? (
                <p className="text-sm" style={{ color: KEBU.muted }}>
                  Loading Kebu ID…
                </p>
              ) : businesses.length === 0 ? (
                <p className="text-sm" style={{ color: KEBU.muted }}>
                  No Kebu ID yet. Register from Opportunity / signup — not buried in this menu.
                </p>
              ) : (
                <>
                  {businesses.length > 1 ? (
                    <select
                      className="w-full rounded-lg border px-3 py-2 text-sm bg-white"
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
                    <div className="rounded-lg border bg-white p-3" style={{ borderColor: KEBU.border }}>
                      <p className="font-bold text-sm">{selected.trading_name || selected.legal_name}</p>
                      <p className="text-xs font-mono" style={{ color: KEBU.orange }}>
                        {selected.public_kebu_id}
                      </p>
                    </div>
                  ) : null}
                  {readiness && selectedId ? (
                    <BusinessReadinessCard readiness={readiness} businessId={selectedId} compact />
                  ) : null}
                </>
              )}
            </div>
          ) : null}

          <ListRow
            title="Data mode"
            hint="Normal · Saver · Ultra · Offline"
            open={section === "data"}
            onClick={() => toggle("data")}
          />
          {section === "data" ? (
            <div className="px-4 py-4 bg-[#FFFBFA]">
              <DataModeControls />
            </div>
          ) : null}

          <ListRow
            title="Hosting & billing"
            hint="Plans and receipts"
            open={section === "billing"}
            onClick={() => toggle("billing")}
          />
          {section === "billing" ? (
            <div className="px-4 py-4 bg-[#FFFBFA]">
              <AccountHostingBilling />
            </div>
          ) : null}

          <Link
            href="/b2b"
            className="flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-black/[0.03]"
          >
            <span>
              <span className="block text-sm font-semibold">Alkebulan B2B profile</span>
              <span className="block text-[11px] mt-0.5" style={{ color: KEBU.muted }}>
                Trade partners — separate from My KEBU
              </span>
            </span>
            <span className="text-xs font-bold" style={{ color: KEBU.orange }}>
              →
            </span>
          </Link>

          <Link
            href={MY_SITES_HREF}
            className="flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-black/[0.03]"
          >
            <span>
              <span className="block text-sm font-semibold">My Sites</span>
              <span className="block text-[11px] mt-0.5" style={{ color: KEBU.muted }}>
                Edit websites
              </span>
            </span>
            <span className="text-xs font-bold" style={{ color: KEBU.orange }}>
              →
            </span>
          </Link>

          <Link
            href="/create/aesthetics"
            className="flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-black/[0.03]"
          >
            <span>
              <span className="block text-sm font-semibold">Aesthetic store</span>
              <span className="block text-[11px] mt-0.5" style={{ color: KEBU.muted }}>
                Browse looks
              </span>
            </span>
            <span className="text-xs font-bold" style={{ color: KEBU.orange }}>
              →
            </span>
          </Link>
        </div>

        {note ? <p className="text-sm text-green-700 mt-6">{note}</p> : null}
        {error ? <p className="text-sm text-red-600 mt-6">{error}</p> : null}
      </div>
    </AppShell>
  );
}
