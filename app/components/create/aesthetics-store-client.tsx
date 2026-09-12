"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AestheticGalleryCard } from "@/app/components/create/aesthetics-gallery-card";
import { getAestheticGalleryGroups } from "@/lib/create/aesthetics-gallery";
import { KEBU } from "@/lib/kebu-brand";
import { MY_SITES_HREF } from "@/lib/navigation/product-nav";
import { formatUsdFromCents } from "@/lib/billing/pricing";
import { UploadAestheticButton } from "@/app/components/create/upload-aesthetic-button";

type CatalogCard = {
  slug: string;
  name: string;
  category: string;
  description: string;
  kind: "catalog";
};

type MarketCard = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string | null;
  priceCents: number;
  developerName: string | null;
  salesCount: number;
  kind: "marketplace";
};

type OwnedItem = {
  id: string;
  kind: string;
  catalogSlug: string | null;
  marketplaceId: string | null;
  name: string;
  amountUsdCents: number;
  createdAt: string;
};

type SiteOption = { id: string; title: string };

type DevProfile = {
  id: string;
  displayName: string;
  bio: string | null;
  websiteUrl: string | null;
  status: string;
};

type DevListing = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string | null;
  priceCents: number;
  status: string;
  salesCount: number;
};

export function AestheticsStoreClient({ sites }: { sites: SiteOption[] }) {
  const router = useRouter();
  const search = useSearchParams();
  const sellFileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<"store" | "owned" | "sell">("store");
  const [catalog, setCatalog] = useState<CatalogCard[]>([]);
  const [marketplace, setMarketplace] = useState<MarketCard[]>([]);
  const [owned, setOwned] = useState<OwnedItem[]>([]);
  const [profile, setProfile] = useState<DevProfile | null>(null);
  const [listings, setListings] = useState<DevListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [applyProjectId, setApplyProjectId] = useState(sites[0]?.id ?? "");
  const [devName, setDevName] = useState("");
  const [sellName, setSellName] = useState("");
  const [sellPrice, setSellPrice] = useState("5");
  const [sellDesc, setSellDesc] = useState("");

  const billingNote = useMemo(() => {
    const b = search.get("billing");
    if (b === "success") return "Payment received (or pending webhook). Refresh Owned if you just paid.";
    if (b === "cancelled") return "Checkout cancelled — aesthetic not unlocked.";
    return null;
  }, [search]);

  const loadStore = useCallback(async () => {
    const res = await fetch("/api/aesthetics/marketplace", { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not load store.");
    setCatalog(Array.isArray(data.catalog) ? data.catalog : []);
    setMarketplace(Array.isArray(data.marketplace) ? data.marketplace : []);
  }, []);

  const loadOwned = useCallback(async () => {
    const res = await fetch("/api/aesthetics/library", { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not load owned aesthetics.");
    setOwned(Array.isArray(data.items) ? data.items : []);
  }, []);

  const loadDev = useCallback(async () => {
    const res = await fetch("/api/aesthetics/developer", { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not load developer account.");
    setProfile(data.profile ?? null);
    setListings(Array.isArray(data.listings) ? data.listings : []);
    if (data.profile?.displayName) setDevName(data.profile.displayName);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([loadStore(), loadOwned(), loadDev()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed.");
    } finally {
      setLoading(false);
    }
  }, [loadStore, loadOwned, loadDev]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (billingNote) setNote(billingNote);
  }, [billingNote]);

  async function acquire(kind: "catalog" | "marketplace", idOrSlug: string) {
    setBusy(idOrSlug);
    setError(null);
    setNote(null);
    try {
      const res = await fetch("/api/aesthetics/acquire", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          kind === "catalog"
            ? { kind: "catalog", catalogSlug: idOrSlug }
            : { kind: "marketplace", marketplaceId: idOrSlug },
        ),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not acquire aesthetic.");
        return;
      }
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl as string;
        return;
      }
      setNote(
        data.alreadyOwned
          ? "Already in your owned aesthetics."
          : "Accepted — it is in Owned. Add it to a site as a draft, edit, then publish.",
      );
      setTab("owned");
      await loadOwned();
    } catch {
      setError("Network error.");
    } finally {
      setBusy(null);
    }
  }

  async function applyOwned(libraryId: string) {
    if (!applyProjectId) {
      setError("Create a site first, then apply this aesthetic.");
      return;
    }
    setBusy(libraryId);
    setError(null);
    setNote(null);
    try {
      const res = await fetch("/api/aesthetics/apply", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ libraryId, projectId: applyProjectId, openInEditor: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not add to site.");
        return;
      }
      setNote(typeof data.message === "string" ? data.message : "Draft added.");
      if (typeof data.editorPath === "string") router.push(data.editorPath);
    } catch {
      setError("Network error.");
    } finally {
      setBusy(null);
    }
  }

  async function createDeveloper() {
    if (!devName.trim()) {
      setError("Enter a developer display name.");
      return;
    }
    setBusy("dev");
    setError(null);
    try {
      const res = await fetch("/api/aesthetics/developer", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: devName.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not create developer account.");
        return;
      }
      setNote("Developer account ready — upload an aesthetic to sell.");
      await loadDev();
    } catch {
      setError("Network error.");
    } finally {
      setBusy(null);
    }
  }

  async function sellFile(file: File | undefined) {
    if (!file) return;
    if (!sellName.trim()) {
      setError("Name this aesthetic before uploading.");
      return;
    }
    if (!file.name.toLowerCase().endsWith(".json")) {
      setError("Upload Kebu aesthetic JSON only — not HTML or ThemeForest zips.");
      return;
    }
    setBusy("sell");
    setError(null);
    try {
      const text = await file.text();
      const fileJson = JSON.parse(text) as unknown;
      const priceCents = Math.max(0, Math.round(Number(sellPrice) * 100) || 0);
      const res = await fetch("/api/aesthetics/marketplace", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: sellName.trim(),
          description: sellDesc.trim() || undefined,
          priceCents,
          fileJson,
          publish: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Upload failed.");
        return;
      }
      setSellName("");
      setSellDesc("");
      setSellPrice("0");
      setNote("Aesthetic published to the store. Buyers accept it into Owned — no re-upload.");
      await Promise.all([loadDev(), loadStore()]);
    } catch {
      setError("Invalid JSON or network error.");
    } finally {
      setBusy(null);
    }
  }

  async function publishListing(id: string) {
    setBusy(id);
    try {
      const res = await fetch(`/api/aesthetics/marketplace/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Publish failed.");
        return;
      }
      await loadDev();
      await loadStore();
    } finally {
      setBusy(null);
    }
  }

  const galleryGroups = useMemo(() => getAestheticGalleryGroups(), []);

  return (
    <div className="w-full">
      {/* ── Editorial gallery hero ── */}
      <div
        className="relative overflow-hidden"
        style={{ background: "#0A0A0A", minHeight: 220 }}
      >
        {/* Background gradient strips representing different template aesthetics */}
        <div className="absolute inset-0 flex pointer-events-none" aria-hidden>
          {[
            "linear-gradient(180deg,#1B4332 0%,#2D6A4F 100%)",
            "linear-gradient(180deg,#C1121F 0%,#1A0505 100%)",
            "linear-gradient(180deg,#1A1A2E 0%,#E8D5A3 100%)",
            "linear-gradient(180deg,#457B9D 0%,#0F0D33 100%)",
            "linear-gradient(180deg,#BC6C25 0%,#F4A261 100%)",
            "linear-gradient(180deg,#D4A574 0%,#FAF8F5 100%)",
          ].map((g, i) => (
            <div key={i} className="flex-1 opacity-30" style={{ background: g }} />
          ))}
          <div className="absolute inset-0" style={{ background: "linear-gradient(to right, #0A0A0A 0%, transparent 15%, transparent 85%, #0A0A0A 100%)" }} />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 40%, #0A0A0A 100%)" }} />
        </div>
        <div className="relative z-10 px-6 py-10 sm:px-8 lg:px-10">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] mb-3" style={{ color: KEBU.orange }}>
            Template Gallery
          </p>
          <h1
            className="text-3xl sm:text-4xl font-black leading-tight tracking-tight text-white"
            style={{ fontFamily: "var(--font-fraunces)", maxWidth: 520 }}
          >
            Your site should look like your business
          </h1>
          <p className="mt-3 text-sm leading-relaxed max-w-lg" style={{ color: "rgba(255,255,255,0.6)" }}>
            2 distinct looks per business type — each one designed from scratch for that industry. Try any for free,
            apply to your site, edit everything in the builder.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href="/create/new?mode=ai"
              className="inline-flex rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white"
              style={{ background: KEBU.orange }}
            >
              Let Yande design mine →
            </Link>
            <Link
              href={MY_SITES_HREF}
              className="inline-flex rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-wider border"
              style={{ borderColor: "rgba(255,255,255,0.25)", color: "rgba(255,255,255,0.8)" }}
            >
              My sites
            </Link>
          </div>
        </div>
      </div>

      <div className="px-6 sm:px-8 lg:px-10 py-6">
        {/* Tab nav */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-6 pb-4" style={{ borderBottom: `1px solid ${KEBU.border}` }}>
          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                ["store", "Aesthetics"],
                ["owned", "Owned"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className="rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider"
                style={{
                  background: tab === id ? KEBU.black : "transparent",
                  color: tab === id ? "#fff" : KEBU.muted,
                  border: tab === id ? `1px solid ${KEBU.black}` : `1px solid transparent`,
                }}
              >
                {label}
              </button>
            ))}
          </div>
          {/* Developer account is a separate program — linked from footer, not shown to all users */}
          <a
            href="/create/developers"
            className="text-[10px] font-semibold underline-offset-2 hover:underline"
            style={{ color: KEBU.muted }}
          >
            Become a creator →
          </a>
        </div>

      {error ? (
        <p className="mb-4 rounded-xl px-4 py-3 text-sm" style={{ background: "#FEE2E2", color: "#991B1B" }}>
          {error}
        </p>
      ) : null}
      {note ? (
        <p className="mb-4 rounded-xl px-4 py-3 text-sm" style={{ background: "#E8F8EE", color: "#1B6B3A" }}>
          {note}
        </p>
      ) : null}
      {loading ? (
        <p className="text-sm" style={{ color: KEBU.muted }}>
          Loading aesthetics…
        </p>
      ) : null}

      {tab === "store" && !loading ? (
        <div className="space-y-8">
          <div className="flex flex-wrap gap-2 pb-2" style={{ borderBottom: `1px solid ${KEBU.border}` }}>
            <span className="self-center text-[10px] font-bold uppercase tracking-wider mr-2" style={{ color: KEBU.muted }}>
              Jump to:
            </span>
            {galleryGroups.map((group) => (
              <a
                key={group.type}
                href={`#aes-${group.type}`}
                className="rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors hover:text-orange-600"
                style={{ border: `1px solid ${KEBU.border}`, color: KEBU.black }}
              >
                {group.label}
              </a>
            ))}
          </div>

          {galleryGroups.map((group) => (
            <section key={group.type} id={`aes-${group.type}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-5 w-0.5 rounded-full" style={{ background: KEBU.orange }} />
                <h2 className="text-base font-bold" style={{ fontFamily: "var(--font-fraunces)" }}>
                  {group.label}
                </h2>
                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: KEBU.muted }}>
                  {group.items.length} looks
                </span>
              </div>
              <ul className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {group.items.map((item, i) => (
                  <li key={item.slug} className="kebu-slide-in-up" style={{ animationDelay: `${i * 40}ms` }}>
                    <AestheticGalleryCard item={item} />
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <section>
            <h2 className="text-sm font-bold mb-3" style={{ fontFamily: "var(--font-fraunces)" }}>
              Developer aesthetics
            </h2>
            {marketplace.length === 0 ? (
              <p className="text-sm" style={{ color: KEBU.muted }}>
                No developer aesthetics published yet. Open Sell to upload yours (Kebu JSON only).
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {marketplace.map((m) => (
                  <article
                    key={m.id}
                    className="rounded-2xl bg-white p-4"
                    style={{ border: `1px solid ${KEBU.border}` }}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
                      {m.category ?? "general"}
                      {m.developerName ? ` · ${m.developerName}` : ""}
                    </p>
                    <h3 className="font-bold mt-1">{m.name}</h3>
                    <p className="text-xs mt-1 line-clamp-2" style={{ color: KEBU.muted }}>
                      {m.description || "Developer aesthetic"}
                    </p>
                    <p className="text-xs font-bold mt-2">
                      {m.priceCents > 0 ? formatUsdFromCents(m.priceCents) : "Free"}
                    </p>
                    <button
                      type="button"
                      disabled={busy === m.id}
                      onClick={() => void acquire("marketplace", m.id)}
                      className="mt-3 rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-white disabled:opacity-50"
                      style={{ background: KEBU.black }}
                    >
                      {busy === m.id ? "…" : m.priceCents > 0 ? "Buy" : "Accept"}
                    </button>
                  </article>
                ))}
              </div>
            )}
          </section>

          {catalog.length === 0 ? (
            <p className="text-xs" style={{ color: KEBU.muted }} role="status">
              Catalog API empty — gallery still shows curated pairs from product catalog.
            </p>
          ) : null}
        </div>
      ) : null}

      {tab === "owned" && !loading ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold" style={{ color: KEBU.black }}>Your aesthetics</p>
            <UploadAestheticButton sites={sites} />
          </div>
          <label className="block text-[11px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
            Add to site
            <select
              value={applyProjectId}
              onChange={(e) => setApplyProjectId(e.target.value)}
              className="mt-1 w-full max-w-md rounded-xl border px-3 py-2 text-sm font-normal normal-case tracking-normal"
              style={{ borderColor: KEBU.border }}
            >
              {sites.length === 0 ? <option value="">No sites yet</option> : null}
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </label>
          {owned.length === 0 ? (
            <p className="text-sm" style={{ color: KEBU.muted }}>
              Nothing owned yet. Accept a free aesthetic from the Store, or upload from My sites.
            </p>
          ) : (
            owned.map((item) => (
              <article
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4"
                style={{ border: `1px solid ${KEBU.border}` }}
              >
                <div>
                  <h3 className="font-bold">{item.name}</h3>
                  <p className="text-[11px]" style={{ color: KEBU.muted }}>
                    {item.kind} · already in Kebu — add as draft, no re-upload
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy === item.id || !applyProjectId}
                    onClick={() => void applyOwned(item.id)}
                    className="rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-white disabled:opacity-50"
                    style={{ background: KEBU.orange }}
                  >
                    Add to site → edit draft
                  </button>
                  {applyProjectId ? (
                    <Link
                      href={`/create/${applyProjectId}/themes`}
                      className="rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-wider"
                      style={{ border: `1px solid ${KEBU.border}` }}
                    >
                      Site aesthetics
                    </Link>
                  ) : null}
                </div>
              </article>
            ))
          )}
        </div>
      ) : null}

      {tab === "sell" && !loading ? (
        <div className="space-y-6">
          {!profile ? (
            <section className="rounded-2xl bg-white p-5" style={{ border: `1px solid ${KEBU.border}` }}>
              <h2 className="font-bold text-lg" style={{ fontFamily: "var(--font-fraunces)" }}>
                Create developer account
              </h2>
              <p className="text-sm mt-2" style={{ color: KEBU.muted }}>
                Like a Shopify partner account — upload aesthetics you built and sell them in the store.
              </p>
              <input
                value={devName}
                onChange={(e) => setDevName(e.target.value)}
                placeholder="Studio or developer name"
                className="mt-4 w-full max-w-md rounded-xl border px-3 py-2 text-sm"
                style={{ borderColor: KEBU.border }}
              />
              <button
                type="button"
                disabled={busy === "dev"}
                onClick={() => void createDeveloper()}
                className="mt-3 rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white disabled:opacity-50"
                style={{ background: KEBU.black }}
              >
                Create developer account
              </button>
            </section>
          ) : (
            <>
              <p className="text-sm">
                Selling as <strong>{profile.displayName}</strong> ({profile.status})
              </p>
              <section className="rounded-2xl bg-white p-5 space-y-3" style={{ border: `1px solid ${KEBU.border}` }}>
                <h2 className="font-bold">Upload aesthetic to sell</h2>
                <input
                  value={sellName}
                  onChange={(e) => setSellName(e.target.value)}
                  placeholder="Aesthetic name"
                  className="w-full rounded-xl border px-3 py-2 text-sm"
                  style={{ borderColor: KEBU.border }}
                />
                <textarea
                  value={sellDesc}
                  onChange={(e) => setSellDesc(e.target.value)}
                  placeholder="Short description"
                  rows={2}
                  className="w-full rounded-xl border px-3 py-2 text-sm"
                  style={{ borderColor: KEBU.border }}
                />
                <label className="block text-xs" style={{ color: KEBU.muted }}>
                  Price (USD) — use 0 for free
                  <input
                    value={sellPrice}
                    onChange={(e) => setSellPrice(e.target.value)}
                    className="mt-1 w-32 rounded-xl border px-3 py-2 text-sm block"
                    style={{ borderColor: KEBU.border }}
                  />
                </label>
                <button
                  type="button"
                  disabled={busy === "sell"}
                  onClick={() => sellFileRef.current?.click()}
                  className="rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white disabled:opacity-50"
                  style={{ background: KEBU.orange }}
                >
                  Upload Kebu JSON &amp; publish
                </button>
                <input
                  ref={sellFileRef}
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={(e) => {
                    void sellFile(e.target.files?.[0]);
                    e.currentTarget.value = "";
                  }}
                />
              </section>
              <section>
                <h3 className="font-bold mb-2">Your listings</h3>
                {listings.length === 0 ? (
                  <p className="text-sm" style={{ color: KEBU.muted }}>
                    No listings yet.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {listings.map((l) => (
                      <li
                        key={l.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white px-4 py-3"
                        style={{ border: `1px solid ${KEBU.border}` }}
                      >
                        <span className="text-sm font-semibold">
                          {l.name} · {l.status} · {l.priceCents > 0 ? formatUsdFromCents(l.priceCents) : "Free"}
                        </span>
                        {l.status !== "published" ? (
                          <button
                            type="button"
                            disabled={busy === l.id}
                            onClick={() => void publishListing(l.id)}
                            className="text-xs font-bold uppercase"
                            style={{ color: KEBU.orange }}
                          >
                            Publish
                          </button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </div>
      ) : null}
      </div>
    </div>
  );
}
