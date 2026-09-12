"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { AestheticGalleryItem } from "@/lib/create/aesthetics-gallery";
import { getAestheticGalleryGroups } from "@/lib/create/aesthetics-gallery";
import { AestheticCardVisual } from "@/app/components/create/aesthetic-card-visual";
import { KEBU } from "@/lib/kebu-brand";
import { MY_SITES_HREF } from "@/lib/navigation/product-nav";

type SiteOption = { id: string; title: string };

/**
 * Inspired Themes–style product page: large preview, try/use, apply to a site in My Sites.
 */
export function AestheticDetailClient({
  item,
  sites,
}: {
  item: AestheticGalleryItem;
  sites: SiteOption[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [ownedId, setOwnedId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState(sites[0]?.id ?? "");
  const [previewMode, setPreviewMode] = useState<"visual" | "live">("visual");
  const [openSection, setOpenSection] = useState<string | null>(null);

  const siblings = useMemo(() => {
    const groups = getAestheticGalleryGroups();
    const group = groups.find((g) => g.items.some((i) => i.slug === item.slug));
    return (group?.items ?? []).filter((i) => i.slug !== item.slug);
  }, [item.slug]);

  const findOwned = useCallback(async () => {
    const res = await fetch("/api/aesthetics/library", { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return;
    const items = Array.isArray(data.items) ? data.items : [];
    const hit = items.find(
      (i: { catalogSlug?: string | null; id: string }) => i.catalogSlug === item.slug,
    );
    setOwnedId(hit?.id ?? null);
  }, [item.slug]);

  useEffect(() => {
    void findOwned();
  }, [findOwned]);

  async function tryOrAccept() {
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const res = await fetch("/api/aesthetics/acquire", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "catalog", catalogSlug: item.slug }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not unlock this aesthetic.");
        return;
      }
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl as string;
        return;
      }
      setNote(
        data.alreadyOwned
          ? "Already in your Owned aesthetics."
          : "Unlocked — free try. Apply it to a site below, or start a new site with this look.",
      );
      await findOwned();
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  async function applyToSite() {
    if (!projectId) {
      setError("Create a site in My Sites first, then apply this look.");
      return;
    }
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      let libraryId = ownedId;
      if (!libraryId) {
        const acquireRes = await fetch("/api/aesthetics/acquire", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind: "catalog", catalogSlug: item.slug }),
        });
        const acquireData = await acquireRes.json().catch(() => ({}));
        if (!acquireRes.ok) {
          setError(
            typeof acquireData.error === "string" ? acquireData.error : "Could not unlock this aesthetic.",
          );
          return;
        }
        if (acquireData.paymentUrl) {
          window.location.href = acquireData.paymentUrl as string;
          return;
        }
        await findOwned();
        const libRes = await fetch("/api/aesthetics/library", { credentials: "include" });
        const libData = await libRes.json().catch(() => ({}));
        const items = Array.isArray(libData.items) ? libData.items : [];
        const hit = items.find(
          (i: { catalogSlug?: string | null; id: string }) => i.catalogSlug === item.slug,
        );
        libraryId = hit?.id ?? (typeof acquireData.libraryId === "string" ? acquireData.libraryId : null);
        if (!libraryId) {
          setError("Unlocked, but could not find it in Owned. Open Owned and apply from there.");
          return;
        }
        setOwnedId(libraryId);
      }

      const res = await fetch("/api/aesthetics/apply", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ libraryId, projectId, openInEditor: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not apply to site.");
        return;
      }
      if (typeof data.editorPath === "string") {
        router.push(data.editorPath);
        return;
      }
      setNote(typeof data.message === "string" ? data.message : "Draft theme added to your site.");
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="px-5 sm:px-8 lg:px-16 py-8 sm:py-12">
      <nav className="mb-6 text-xs font-semibold" style={{ color: KEBU.muted }}>
        <Link href="/create/aesthetics" className="hover:underline">
          Aesthetics gallery
        </Link>
        <span className="mx-2">/</span>
        <span style={{ color: KEBU.black }}>{item.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1.35fr_1fr] lg:items-start">
        <div>
          <div
            className="relative overflow-hidden rounded-2xl bg-black"
            style={{ border: `1px solid ${KEBU.border}`, minHeight: "min(70vh, 640px)" }}
          >
            {previewMode === "live" ? (
              <iframe
                title={`${item.name} live demo`}
                src={item.demoPath}
                className="absolute inset-0 h-full w-full border-0 bg-white"
              />
            ) : (
              <>
                <div className="absolute inset-0" style={{ background: item.previewGradient }} />
                {item.previewImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.previewImage}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : null}
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(10,10,10,0.15) 0%, rgba(10,10,10,0.55) 100%)",
                  }}
                >
                  <p className="text-[11px] font-black uppercase tracking-[0.3em] text-white/80 mb-3">
                    {item.wordmark ?? item.name}
                  </p>
                  <p className="text-white/90 text-sm max-w-sm">{item.tagline}</p>
                </div>
              </>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPreviewMode("visual")}
              className="rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-wider"
              style={{
                background: previewMode === "visual" ? KEBU.black : KEBU.cream,
                color: previewMode === "visual" ? "#fff" : KEBU.black,
                border: `1px solid ${KEBU.border}`,
              }}
            >
              Look
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode("live")}
              className="rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-wider"
              style={{
                background: previewMode === "live" ? KEBU.black : KEBU.cream,
                color: previewMode === "live" ? "#fff" : KEBU.black,
                border: `1px solid ${KEBU.border}`,
              }}
            >
              Live demo
            </button>
            <Link
              href={item.demoPath}
              target="_blank"
              rel="noreferrer"
              className="rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-wider"
              style={{ border: `1px solid ${KEBU.border}` }}
            >
              Open full preview
            </Link>
          </div>
        </div>

        <aside className="lg:sticky lg:top-6 space-y-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: KEBU.orange }}>
              {item.typeLabel}
            </p>
            <h1
              className="mt-2 text-3xl sm:text-4xl font-bold leading-tight"
              style={{ fontFamily: "var(--font-fraunces)" }}
            >
              {item.name}
            </h1>
            <p className="mt-3 text-sm leading-relaxed" style={{ color: KEBU.muted }}>
              {item.tagline}
            </p>
          </div>

          {item.businessStory ? (
            <div
              className="rounded-2xl p-4 space-y-1"
              style={{ background: "#FFF8F2", border: `1px solid ${KEBU.border}` }}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: KEBU.orange }}>
                The business behind this aesthetic
              </p>
              <p className="text-[13px] leading-relaxed" style={{ color: KEBU.black }}>
                {item.businessStory}
              </p>
            </div>
          ) : null}

          {item.includedPages && item.includedPages.length > 0 ? (
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: KEBU.muted }}>
                Pages included
              </p>
              <div className="flex flex-wrap gap-1.5">
                {item.includedPages.map((page) => (
                  <span
                    key={page}
                    className="rounded-full px-3 py-1 text-[11px] font-semibold"
                    style={{ background: "#F4F4F5", color: KEBU.black }}
                  >
                    {page}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <p className="text-2xl font-bold" style={{ fontFamily: "var(--font-fraunces)" }}>
            Free to try
          </p>

          {error ? (
            <p className="rounded-xl px-4 py-3 text-sm" style={{ background: "#FEE2E2", color: "#991B1B" }}>
              {error}
            </p>
          ) : null}
          {note ? (
            <p className="rounded-xl px-4 py-3 text-sm" style={{ background: "#E8F8EE", color: "#1B6B3A" }}>
              {note}
            </p>
          ) : null}

          <div className="flex flex-col gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void tryOrAccept()}
              className="w-full rounded-full px-5 py-3.5 text-sm font-bold text-white disabled:opacity-50"
              style={{ background: KEBU.orange }}
            >
              {busy ? "Working…" : ownedId ? "Already owned — ready to apply" : "Try aesthetic for free"}
            </button>
            <Link
              href={item.usePath}
              className="w-full rounded-full px-5 py-3.5 text-sm font-bold text-center"
              style={{ background: KEBU.black, color: "#fff" }}
            >
              Start a new site with this look
            </Link>
          </div>

          <div
            className="rounded-2xl p-4 space-y-3"
            style={{ background: KEBU.cream, border: `1px solid ${KEBU.border}` }}
          >
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
              Apply to an existing site (My Sites)
            </p>
            {sites.length === 0 ? (
              <p className="text-sm" style={{ color: KEBU.muted }}>
                No sites yet.{" "}
                <Link href={MY_SITES_HREF} className="font-bold underline">
                  Open My Sites
                </Link>{" "}
                or start a new site above.
              </p>
            ) : (
              <>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full rounded-xl border bg-white px-3 py-2.5 text-sm"
                  style={{ borderColor: KEBU.border }}
                >
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={busy || !projectId}
                  onClick={() => void applyToSite()}
                  className="w-full rounded-full px-4 py-2.5 text-xs font-bold uppercase tracking-wider disabled:opacity-50"
                  style={{ border: `1px solid ${KEBU.border}`, background: "#fff" }}
                >
                  Add to site → edit draft
                </button>
              </>
            )}
            <Link href={MY_SITES_HREF} className="block text-xs font-semibold underline" style={{ color: KEBU.muted }}>
              My Sites is separate — your drafts and live websites live there, not in this gallery.
            </Link>
          </div>
        </aside>
      </div>

      {/* ── Expandable "What's included" sections ── */}
      <div className="mt-10 border-t" style={{ borderColor: KEBU.border }}>
        {[
          {
            id: "sections",
            label: "What's in this template",
            body: "Hero banner, product/services grid, about section, gallery, testimonials, contact with WhatsApp CTA, newsletter sign-up, FAQ — all fully editable in the Kebu builder. No code required.",
          },
          {
            id: "mobile",
            label: "Mobile-first, offline-ready",
            body: "Every template renders pixel-perfect on phone. Critical sections (hero, products, contact) load without images in low-data mode — essential for customers in Dakar, Abidjan, and Lagos on 3G.",
          },
          {
            id: "payments",
            label: "WhatsApp + mobile money ready",
            body: "Pre-wired for WhatsApp order messages, Wave, Orange Money, and Joko checkout. Customers order with one tap — no card, no app install, no friction.",
          },
          {
            id: "publishing",
            label: "One-click publishing",
            body: "Apply this look to any site in My Sites, edit in the visual builder, then publish to your kebu.co subdomain in seconds. Custom domains available.",
          },
        ].map(({ id, label, body }) => (
          <div key={id} style={{ borderBottom: `1px solid ${KEBU.border}` }}>
            <button
              type="button"
              className="flex w-full items-center justify-between px-1 py-4 text-sm font-semibold text-left"
              onClick={() => setOpenSection(openSection === id ? null : id)}
            >
              <span>{label}</span>
              <span className="text-lg leading-none" style={{ color: KEBU.muted }}>
                {openSection === id ? "−" : "+"}
              </span>
            </button>
            {openSection === id ? (
              <p className="pb-4 px-1 text-sm leading-relaxed" style={{ color: KEBU.muted }}>
                {body}
              </p>
            ) : null}
          </div>
        ))}
      </div>

      {/* ── Pair well with / You might also like ── */}
      {siblings.length > 0 ? (
        <div className="mt-12">
          <div className="flex items-center gap-3 mb-5">
            <span className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: KEBU.muted }}>
              ≡ For the same business type, explore:
            </span>
          </div>
          <div className={`grid gap-4 ${siblings.length === 1 ? "sm:grid-cols-1 max-w-xs" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
            {siblings.map((sib) => (
              <Link
                key={sib.slug}
                href={sib.detailPath}
                className="group flex items-center gap-3 rounded-2xl p-3 transition-shadow hover:shadow-md"
                style={{ border: `1px solid ${KEBU.border}`, background: "#fff" }}
              >
                <div
                  className="relative h-16 w-24 shrink-0 overflow-hidden rounded-xl"
                  style={{ background: sib.previewGradient }}
                >
                  {sib.cardVisual ? (
                    <AestheticCardVisual visual={sib.cardVisual} name={sib.name} accent={sib.accent} />
                  ) : null}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate">{sib.name}</p>
                  <p className="text-[11px] mt-0.5 line-clamp-2 leading-snug" style={{ color: KEBU.muted }}>
                    {sib.tagline}
                  </p>
                  <p className="mt-1.5 text-[10px] font-bold" style={{ color: KEBU.orange }}>
                    Free to try →
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
