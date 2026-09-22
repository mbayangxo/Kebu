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

type TabId = "account" | "business" | "payments" | "notifications" | "security" | "appearance";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "account", label: "Account" },
  { id: "business", label: "Business" },
  { id: "payments", label: "Payments" },
  { id: "notifications", label: "Notifications" },
  { id: "security", label: "Security" },
  { id: "appearance", label: "Appearance" },
];

const PLAN_FEATURES = [
  "Unlimited sites",
  "Full access to Studio",
  "AI tools & generation",
  "Priority support",
  "Advanced analytics",
  "Custom domains",
];

const border = KEBU.borders.default;

export default function AccountPage() {
  const { profile, loading, refresh } = useKebuUser();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [country, setCountry] = useState("");
  const [businesses, setBusinesses] = useState<BusinessRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [readiness, setReadiness] = useState<ReadinessSummary | null>(null);
  const [bizLoading, setBizLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("account");
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
      <AppShell title="Settings">
        <p className="p-8 text-sm opacity-60">Loading…</p>
      </AppShell>
    );
  }

  if (!profile) {
    return (
      <AppShell title="Settings">
        <div className="max-w-lg mx-auto px-6 py-16 text-center">
          <h1 className="text-xl font-bold mb-3">Sign in to manage your settings</h1>
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
    const mode = resolveClientDataMode();
    const res = await fetch("/api/me/profile", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json", "X-Kebu-Data-Mode": mode },
      body: JSON.stringify({ name, residenceCountry: country || null }),
    });
    const bytes = await measureResponseBytes(res);
    const ev = evaluateKb({ action: "save_profile", mode, usedBytes: bytes });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (!res.ok) { setError(data.error ?? "Could not save."); return; }
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
    if (!res.ok) { setError(data.error ?? "Upload failed."); return; }
    setNote("Photo updated.");
    void refresh();
  }

  return (
    <AppShell title="Settings">
      <div className="min-h-screen px-6 py-10 sm:px-8" style={{ background: KEBU.bright }}>
        <div className="mx-auto max-w-4xl">

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-black tracking-[-.04em]" style={{ fontFamily: "var(--font-fraunces)", color: KEBU.black }}>Settings</h1>
            <p className="mt-1.5 text-sm" style={{ color: KEBU.muted }}>Manage your account, team and preferences.</p>
          </div>

          {/* Tab bar */}
          <div className="mb-8 flex gap-0 overflow-x-auto border-b scrollbar-none" style={{ borderColor: border }}>
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className="shrink-0 px-5 py-3 text-[12px] font-bold transition-colors"
                style={{
                  color: tab === t.id ? KEBU.black : KEBU.muted,
                  borderBottom: tab === t.id ? `2px solid ${KEBU.orange}` : "2px solid transparent",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Account tab */}
          {tab === "account" && (
            <div className="grid gap-5 lg:grid-cols-2">

              {/* Profile card */}
              <div className="rounded-2xl border bg-white p-6" style={{ borderColor: border }}>
                <p className="mb-5 text-[11px] font-black uppercase tracking-[.14em]" style={{ color: KEBU.black }}>Profile</p>

                {/* Avatar row */}
                <div className="mb-5 flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="relative group shrink-0 rounded-full focus:outline-none focus-visible:ring-2"
                    aria-label="Change profile photo"
                  >
                    {profile.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={profile.avatarUrl} alt="" className="w-16 h-16 rounded-full object-cover" />
                    ) : (
                      <span className="flex h-16 w-16 items-center justify-center rounded-full text-xl font-black text-white" style={{ background: KEBU.orange }}>
                        {first.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "rgba(0,0,0,0.45)" }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                    <p className="text-sm font-black truncate" style={{ color: KEBU.black }}>{first}</p>
                    <button type="button" onClick={() => fileRef.current?.click()} className="mt-0.5 text-[10px] font-bold" style={{ color: KEBU.orange }}>Edit photo</button>
                  </div>
                </div>

                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadAvatar(f); }} />

                <form onSubmit={(e) => void saveProfile(e)} className="space-y-4">
                  <Field label="Full name">
                    <input value={name} onChange={(e) => setName(e.target.value)} className="field-input" required />
                  </Field>
                  <Field label="Email">
                    <input value={profile.email ?? ""} readOnly className="field-input opacity-60 cursor-not-allowed" />
                  </Field>
                  <Field label="Phone">
                    <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 234 567 8900" className="field-input" />
                  </Field>
                  <Field label="Bio">
                    <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} placeholder="A few words about you…" className="field-input resize-none" />
                  </Field>
                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full rounded-full py-3 text-[11px] font-black text-white disabled:opacity-60 transition hover:brightness-110"
                    style={{ background: KEBU.black }}
                  >
                    {busy ? "Saving…" : "Save changes"}
                  </button>
                </form>

                {note && <p className="mt-3 text-xs text-green-700">{note}</p>}
                {error && <p className="mt-3 text-xs text-red-600">{error}</p>}
              </div>

              {/* Plan card */}
              <div className="flex flex-col gap-4">
                <div className="rounded-2xl border bg-white p-6" style={{ borderColor: border }}>
                  <p className="mb-4 text-[11px] font-black uppercase tracking-[.14em]" style={{ color: KEBU.black }}>Plan</p>
                  <div className="flex items-start justify-between gap-3 mb-5">
                    <div>
                      <p className="text-xl font-black" style={{ color: KEBU.black }}>Kebu Pro</p>
                      <p className="mt-0.5 text-sm font-bold" style={{ color: KEBU.muted }}>$8 / month</p>
                    </div>
                    <span className="rounded-full px-3 py-1 text-[9px] font-black uppercase" style={{ background: "rgba(255,85,0,.1)", color: KEBU.orange }}>Active</span>
                  </div>
                  <Link
                    href="/billing/upgrade"
                    className="mb-5 flex w-full items-center justify-center gap-2 rounded-full py-3 text-[11px] font-black text-white transition hover:brightness-110"
                    style={{ background: KEBU.orange }}
                  >
                    Upgrade →
                  </Link>
                  <ul className="space-y-2.5">
                    {PLAN_FEATURES.map((f) => (
                      <li key={f} className="flex items-center gap-2.5 text-[12px]" style={{ color: KEBU.black }}>
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[8px] font-black text-white" style={{ background: KEBU.orange }}>✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* IDs quick card */}
                {selected && (
                  <div className="rounded-2xl border bg-white p-5" style={{ borderColor: border }}>
                    <p className="mb-3 text-[11px] font-black uppercase tracking-[.14em]" style={{ color: KEBU.black }}>Kebu ID</p>
                    <p className="text-sm font-bold">{selected.trading_name || selected.legal_name}</p>
                    <p className="mt-0.5 font-mono text-xs" style={{ color: KEBU.orange }}>{selected.public_kebu_id}</p>
                  </div>
                )}

                {/* Data mode */}
                <div className="rounded-2xl border bg-white p-5" style={{ borderColor: border }}>
                  <p className="mb-3 text-[11px] font-black uppercase tracking-[.14em]" style={{ color: KEBU.black }}>Data mode</p>
                  <DataModeControls />
                </div>
              </div>
            </div>
          )}

          {/* Business tab */}
          {tab === "business" && (
            <div className="space-y-5">
              {bizLoading ? (
                <p className="text-sm" style={{ color: KEBU.muted }}>Loading…</p>
              ) : businesses.length === 0 ? (
                <div className="rounded-2xl border bg-white p-8 text-center" style={{ borderColor: border }}>
                  <p className="font-bold mb-2" style={{ color: KEBU.black }}>No business registered yet</p>
                  <p className="text-sm mb-4" style={{ color: KEBU.muted }}>Register your business to unlock workspace features.</p>
                  <Link href="/welcome" className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-xs font-black text-white" style={{ background: KEBU.orange }}>Register business →</Link>
                </div>
              ) : (
                <>
                  {businesses.length > 1 && (
                    <select className="w-full rounded-xl border bg-white px-4 py-3 text-sm" style={{ borderColor: border }} value={selectedId ?? ""} onChange={(e) => setSelectedId(e.target.value)}>
                      {businesses.map((b) => (
                        <option key={b.id} value={b.id}>{b.trading_name || b.legal_name} · {b.public_kebu_id}</option>
                      ))}
                    </select>
                  )}
                  {selected && (
                    <div className="rounded-2xl border bg-white p-6" style={{ borderColor: border }}>
                      <p className="text-[11px] font-black uppercase tracking-[.14em] mb-1" style={{ color: KEBU.orange }}>Business</p>
                      <p className="text-lg font-black" style={{ color: KEBU.black }}>{selected.trading_name || selected.legal_name}</p>
                      <p className="font-mono text-xs mt-0.5" style={{ color: KEBU.orange }}>{selected.public_kebu_id}</p>
                      {readiness && selectedId && (
                        <div className="mt-4">
                          <BusinessReadinessCard readiness={readiness} businessId={selectedId} compact />
                        </div>
                      )}
                    </div>
                  )}
                  {profile.afriqueId && (
                    <div className="rounded-2xl border bg-white p-6" style={{ borderColor: border }}>
                      <p className="text-[11px] font-black uppercase tracking-[.14em] mb-3" style={{ color: KEBU.black }}>Afri ID</p>
                      <AfriqueIdCard afriqueId={profile.afriqueId} displayName={profile.name || first} onRefresh={() => void refresh()} />
                    </div>
                  )}
                </>
              )}
              <Link href="/b2b" className="flex items-center justify-between rounded-2xl border bg-white px-5 py-4 transition hover:bg-black/[.02]" style={{ borderColor: border }}>
                <div>
                  <p className="text-sm font-bold" style={{ color: KEBU.black }}>Alkebulan B2B profile</p>
                  <p className="text-[11px]" style={{ color: KEBU.muted }}>Trade partners — separate from My KEBU</p>
                </div>
                <span className="text-sm font-black" style={{ color: KEBU.orange }}>→</span>
              </Link>
            </div>
          )}

          {/* Payments tab */}
          {tab === "payments" && (
            <div className="rounded-2xl border bg-white p-6" style={{ borderColor: border }}>
              <p className="mb-4 text-[11px] font-black uppercase tracking-[.14em]" style={{ color: KEBU.black }}>Hosting & billing</p>
              <AccountHostingBilling />
            </div>
          )}

          {/* Notifications tab */}
          {tab === "notifications" && (
            <div className="rounded-2xl border bg-white p-6" style={{ borderColor: border }}>
              <p className="mb-5 text-[11px] font-black uppercase tracking-[.14em]" style={{ color: KEBU.black }}>Notifications</p>
              {[
                { label: "Email notifications", sub: "Receive updates via email", on: true },
                { label: "Push notifications", sub: "Browser and mobile alerts", on: false },
                { label: "Marketing emails", sub: "Tips, features and product news", on: true },
                { label: "Weekly digest", sub: "Summary of your activity every Monday", on: false },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between py-3.5 border-b last:border-0" style={{ borderColor: border }}>
                  <div>
                    <p className="text-sm font-bold" style={{ color: KEBU.black }}>{row.label}</p>
                    <p className="text-[11px]" style={{ color: KEBU.muted }}>{row.sub}</p>
                  </div>
                  <button type="button" className="relative h-6 w-10 rounded-full transition-colors" style={{ background: row.on ? KEBU.orange : KEBU.borders.default }}>
                    <span className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform" style={{ transform: row.on ? "translateX(18px)" : "translateX(2px)" }} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Security tab */}
          {tab === "security" && (
            <div className="space-y-4">
              <div className="rounded-2xl border bg-white p-6" style={{ borderColor: border }}>
                <p className="mb-4 text-[11px] font-black uppercase tracking-[.14em]" style={{ color: KEBU.black }}>Password & security</p>
                <p className="text-sm mb-4" style={{ color: KEBU.muted }}>Use the signed-in email flow to reset your password. We'll send a secure link.</p>
                <Link href="/login?reset=1" className="inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-[11px] font-black transition hover:bg-black/[.04]" style={{ borderColor: border }}>
                  Reset password →
                </Link>
              </div>
              <div className="rounded-2xl border bg-white p-6" style={{ borderColor: border }}>
                <p className="mb-3 text-[11px] font-black uppercase tracking-[.14em]" style={{ color: KEBU.black }}>Active sessions</p>
                <p className="text-sm" style={{ color: KEBU.muted }}>Session management coming soon.</p>
              </div>
            </div>
          )}

          {/* Appearance tab */}
          {tab === "appearance" && (
            <div className="rounded-2xl border bg-white p-6" style={{ borderColor: border }}>
              <p className="mb-5 text-[11px] font-black uppercase tracking-[.14em]" style={{ color: KEBU.black }}>Appearance</p>
              <p className="mb-4 text-sm" style={{ color: KEBU.muted }}>Choose how Kebu looks and feels for you.</p>
              <div className="grid grid-cols-3 gap-3 max-w-xs">
                {[
                  { label: "Light", bg: "#fff", border: "#e5e5e5" },
                  { label: "Dark", bg: "#0F0F0F", border: "#333" },
                  { label: "System", bg: "linear-gradient(135deg,#fff 50%,#0F0F0F 50%)", border: "#ccc" },
                ].map((theme) => (
                  <button key={theme.label} type="button" className="flex flex-col items-center gap-2 rounded-xl border p-3 transition hover:border-orange-400" style={{ borderColor: border }}>
                    <span className="h-10 w-full rounded-lg" style={{ background: theme.bg, border: `1px solid ${theme.border}` }} />
                    <span className="text-[10px] font-bold" style={{ color: KEBU.black }}>{theme.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick links */}
          {tab === "account" && (
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                { label: "My Sites", href: MY_SITES_HREF, sub: "Edit websites" },
                { label: "Aesthetic store", href: "/create/aesthetics", sub: "Browse looks" },
                { label: "B2B Profile", href: "/b2b", sub: "Trade partners" },
              ].map((link) => (
                <Link key={link.label} href={link.href} className="flex items-center justify-between rounded-2xl border bg-white px-4 py-4 transition hover:bg-black/[.02]" style={{ borderColor: border }}>
                  <span>
                    <span className="block text-sm font-bold" style={{ color: KEBU.black }}>{link.label}</span>
                    <span className="text-[10px]" style={{ color: KEBU.muted }}>{link.sub}</span>
                  </span>
                  <span className="font-black" style={{ color: KEBU.orange }}>→</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .field-input {
          width: 100%;
          border: 1px solid ${border};
          border-radius: 12px;
          padding: 10px 14px;
          font-size: 13px;
          outline: none;
          background: #FAFAFA;
          color: ${KEBU.black};
          transition: border-color .15s;
        }
        .field-input:focus { border-color: ${KEBU.orange}; background: #fff; }
      `}</style>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[.1em]" style={{ color: "rgba(0,0,0,0.5)" }}>{label}</span>
      {children}
    </label>
  );
}
