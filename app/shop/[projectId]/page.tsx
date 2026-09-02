"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/app/components/app-shell";
import { SiteProductsPanel } from "@/app/components/create/site-products-panel";
import { defaultSiteSeo, type SiteSeo } from "@/lib/create/site-seo";
import { KEBU } from "@/lib/kebu-brand";

/**
 * Per-storefront shop admin — catalog lives here, not in the website builder.
 */
export default function ShopAdminPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();
  const [title, setTitle] = useState("Shop");
  const [subdomain, setSubdomain] = useState<string | null>(null);
  const [seo, setSeo] = useState<SiteSeo>(() => defaultSiteSeo());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState<string | null>(null);
  const [addingSection, setAddingSection] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}`, { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        router.replace(`/login?next=/shop/${projectId}`);
        return;
      }
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Shop not found.");
        return;
      }
      setTitle(data.project?.title ?? "Shop");
      setSubdomain(data.project?.subdomain ?? null);
      const nextSeo = data.project?.seo;
      if (nextSeo && typeof nextSeo === "object") {
        setSeo({ ...defaultSiteSeo(), ...nextSeo, commerce: { ...defaultSiteSeo().commerce, ...(nextSeo as SiteSeo).commerce } });
      }
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }, [projectId, router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveMerchantWhatsApp(merchantWhatsApp: string) {
    setSeo((prev) => ({
      ...prev,
      commerce: {
        merchantWhatsApp,
        preferJokoCheckout: prev.commerce?.preferJokoCheckout ?? false,
      },
    }));
    const res = await fetch(`/api/projects/${projectId}/settings`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        seo: {
          commerce: {
            merchantWhatsApp,
            preferJokoCheckout: seo.commerce?.preferJokoCheckout ?? false,
          },
        },
      }),
    });
    if (!res.ok) {
      setNote("Could not save WhatsApp number.");
      return;
    }
    setNote("Order phone saved.");
  }

  async function ensureProductsOnSite() {
    setAddingSection(true);
    setNote(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/sections`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "products" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNote(typeof data.error === "string" ? data.error : "Could not add products block.");
        return;
      }
      setNote("Products block added to your website. Publish from the builder when ready.");
    } finally {
      setAddingSection(false);
    }
  }

  return (
    <AppShell title={title}>
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: KEBU.orange }}>
          Kebu Shop · not the website editor
        </p>
        <h1
          className="mt-2 text-3xl font-bold"
          style={{ fontFamily: "var(--font-fraunces)", color: KEBU.black }}
        >
          {title}
        </h1>
        <p className="mt-1 text-xs font-mono" style={{ color: KEBU.muted }}>
          {subdomain ? `${subdomain}.kebu.africa` : "Set a site address in the builder"}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/shop"
            className="rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider"
            style={{ border: `1px solid ${KEBU.border}`, color: KEBU.black }}
          >
            All shops
          </Link>
          <Link
            href={`/create/${projectId}`}
            className="rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white"
            style={{ background: KEBU.black }}
          >
            Edit website
          </Link>
          <button
            type="button"
            disabled={addingSection}
            onClick={() => void ensureProductsOnSite()}
            className="rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white disabled:opacity-50"
            style={{ background: KEBU.orange }}
          >
            {addingSection ? "Adding…" : "Show products on website"}
          </button>
        </div>

        {note ? (
          <p className="mt-4 rounded-xl px-3 py-2 text-xs" style={{ background: KEBU.cream, color: KEBU.black }}>
            {note}
          </p>
        ) : null}

        {loading ? (
          <p className="mt-8 text-sm" style={{ color: KEBU.muted }}>
            Loading catalog…
          </p>
        ) : error ? (
          <p className="mt-8 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
        ) : (
          <div
            className="mt-8 rounded-2xl bg-white p-4 sm:p-6"
            style={{ border: `1px solid ${KEBU.border}` }}
          >
            <SiteProductsPanel
              projectId={projectId}
              merchantWhatsApp={seo.commerce?.merchantWhatsApp ?? ""}
              onMerchantWhatsAppChange={(phone) => void saveMerchantWhatsApp(phone)}
            />
          </div>
        )}
      </div>
    </AppShell>
  );
}
