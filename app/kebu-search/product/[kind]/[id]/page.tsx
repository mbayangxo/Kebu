"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { KebuMark } from "@/app/components/kebu-mark";
import { KebuAuthHeaderCTA } from "@/app/components/kebu-auth-header-cta";
import { KEBU } from "@/lib/kebu-brand";

type ShopProduct = {
  id: string;
  kind: "shop_product";
  name: string;
  description: string | null;
  priceLabel: string | null;
  imageUrl: string | null;
  siteUrl: string | null;
  updatedAt: string;
};

type MarketplaceTemplate = {
  id: string;
  kind: "marketplace_template";
  name: string;
  description: string | null;
  category: string | null;
  priceLabel: string;
  previewUrl: string | null;
  developerName: string | null;
  updatedAt: string;
};

type Product = ShopProduct | MarketplaceTemplate;

export default function ProductResultPage() {
  const params = useParams<{ kind: string; id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const r = await fetch(`/api/public/products/${encodeURIComponent(params.kind)}/${encodeURIComponent(params.id)}`);
        if (!active) return;
        if (r.status === 404) {
          setNotFound(true);
          return;
        }
        if (!r.ok) {
          setFailed(true);
          return;
        }
        const body = await r.json();
        setProduct(body.product);
      } catch {
        if (active) setFailed(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [params.kind, params.id]);

  const visitUrl = product?.kind === "shop_product" ? product.siteUrl : product?.kind === "marketplace_template" ? product.previewUrl : null;
  const visitLabel = product?.kind === "shop_product" ? "Visit shop →" : "Preview template →";

  return (
    <main className="min-h-screen" style={{ background: KEBU.bright, color: KEBU.black }}>
      <header className="flex items-center justify-between border-b px-5 py-4 sm:px-8" style={{ borderColor: KEBU.border }}>
        <Link href="/kebu-search" className="flex items-center gap-2">
          <KebuMark size={28} />
          <span className="text-sm font-black">Kebu Search</span>
        </Link>
        <KebuAuthHeaderCTA />
      </header>

      <div className="mx-auto max-w-[720px] px-5 py-10 sm:px-8">
        <Link href="/kebu-search" className="text-[11px] font-semibold" style={{ color: KEBU.muted }}>
          ← Back to search
        </Link>

        {loading ? <p className="mt-6 text-[11px]" style={{ color: KEBU.muted }}>Loading…</p> : null}

        {!loading && notFound ? (
          <div className="mt-6 rounded-[14px] border border-dashed p-10 text-center" style={{ borderColor: KEBU.border }}>
            <p className="font-semibold">This item isn&rsquo;t publicly listed.</p>
            <p className="mt-1 text-[11px]" style={{ color: KEBU.muted }}>
              It may not exist, or has been taken off sale.
            </p>
          </div>
        ) : null}

        {!loading && failed ? (
          <div className="mt-6 rounded-[14px] border p-10 text-center" style={{ borderColor: KEBU.status.errorBorder, background: KEBU.status.errorBg }}>
            <p className="font-semibold">This item could not load.</p>
            <p className="mt-1 text-[11px]" style={{ color: KEBU.status.errorText }}>
              Check your connection and try again.
            </p>
          </div>
        ) : null}

        {!loading && product ? (
          <article className="mt-6 rounded-[18px] border bg-white p-6" style={{ borderColor: KEBU.border }}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-black">{product.name}</h1>
                {product.kind === "marketplace_template" && product.developerName ? (
                  <p className="mt-1 text-[11px]" style={{ color: KEBU.muted }}>
                    by {product.developerName}
                  </p>
                ) : null}
              </div>
              <span
                className="shrink-0 rounded-full px-3 py-1.5 text-[9px] font-black uppercase tracking-wide"
                style={{ background: "#F3EEE9", color: KEBU.black }}
              >
                {product.kind === "shop_product" ? product.priceLabel : product.priceLabel}
              </span>
            </div>

            {product.description ? <p className="mt-4 text-sm leading-relaxed">{product.description}</p> : null}

            {product.kind === "marketplace_template" && product.category ? (
              <div className="mt-4 flex flex-wrap gap-2 text-[9px] font-bold uppercase tracking-wide" style={{ color: KEBU.muted }}>
                <span className="rounded-full border px-2.5 py-1" style={{ borderColor: KEBU.border }}>
                  {product.category}
                </span>
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-2">
              {visitUrl ? (
                <a
                  href={visitUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-white"
                  style={{ background: KEBU.black }}
                >
                  {visitLabel}
                </a>
              ) : null}
            </div>

            <p className="mt-6 text-[9px]" style={{ color: KEBU.faint }}>
              Source: {product.kind === "shop_product" ? "Kebu Shop" : "Kebu Studio Marketplace"} · last updated{" "}
              {new Date(product.updatedAt).toLocaleDateString()}
            </p>
          </article>
        ) : null}
      </div>
    </main>
  );
}
