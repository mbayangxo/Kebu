"use client";

import { useState, useEffect } from "react";
import { PublicProductActions } from "@/app/components/create/public-product-actions";
import { whatsAppOrderHref } from "@/lib/create/site-commerce";
import type { SiteCommerce } from "@/lib/create/site-commerce";
import type { ThemeTokens } from "@/lib/create/website-schema";
import { cssFontStack } from "@/lib/create/site-theme-fonts";

export type ProductItem = {
  name: string;
  description?: string;
  priceLabel?: string;
  imageUrl?: string;
  whatsappMessage?: string;
  productId?: string;
  isSubscription?: boolean;
  subscriptionInterval?: "weekly" | "monthly" | "quarterly" | "yearly";
  hasVariants?: boolean;
  variants?: {
    id: string;
    name: string;
    option1: string;
    option2: string;
    option3: string;
    priceLabel?: string;
    imageUrl?: string;
  }[];
  /** Product IDs to show in "You might also like" */
  relatedProductIds?: string[];
};

export type ProductCollection = {
  id: string;
  name: string;
  productIds: string[];
};

export type ProductsSectionProps = {
  heading?: string;
  layout?: "grid" | "grid-dense" | "list" | "featured" | "carousel";
  columns?: 2 | 3 | 4;
  orderStyle?: "inline" | "sheet" | "card" | "minimal";
  orderCtaLabel?: string;
  fullWidth?: boolean;
  filterMode?: "none" | "sidebar" | "horizontal";
  filterFields?: string[];
  /** Explicit collections (from section props). If absent, auto-fetched when projectId is set. */
  collections?: ProductCollection[];
  bannerImageUrl?: string;
  bannerText?: string;
  hoverZoom?: boolean;
  items: ProductItem[];
  theme: ThemeTokens;
  merchantPhone: string;
  shopCommerce: SiteCommerce;
  paymentLabels: string[];
  liveSubdomain: string | null;
  projectId?: string;
  editor?: {
    onPatchSection?: (id: string, patch: Record<string, unknown>) => void;
    inlineEdit?: boolean;
    editDevice?: string;
  } | null;
  sectionId: string;
  anchor?: string;
  patchSection?: (patch: Record<string, unknown>) => void;
  deviceLabel?: string;
};

/* ── Product Detail Modal ─────────────────────────────────────────────────── */
function ProductModal({
  product,
  allProducts,
  onClose,
  onSwitch,
  theme,
  merchantPhone,
  shopCommerce,
  liveSubdomain,
  orderStyle,
  orderCtaLabel,
}: {
  product: ProductItem;
  allProducts: ProductItem[];
  onClose: () => void;
  onSwitch: (p: ProductItem) => void;
  theme: ThemeTokens;
  merchantPhone: string;
  shopCommerce: SiteCommerce;
  liveSubdomain: string | null;
  orderStyle?: "inline" | "sheet" | "card" | "minimal";
  orderCtaLabel?: string;
}) {
  const message = product.whatsappMessage || `Hi — I want to order: ${product.name}`;
  const waHref = whatsAppOrderHref(merchantPhone, message);

  const relatedIds = product.relatedProductIds ?? [];
  const related = relatedIds.length > 0
    ? allProducts.filter((p) => p.productId && relatedIds.includes(p.productId) && p.name !== product.name)
    : allProducts.filter((p) => p.name !== product.name).slice(0, 4);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Panel — bottom sheet on mobile, centered on desktop */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={product.name}
        className="fixed z-[201] inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center sm:p-6 pointer-events-none"
      >
        <div
          className="pointer-events-auto w-full sm:max-w-3xl sm:rounded-2xl overflow-hidden shadow-2xl"
          style={{ background: "#fff", maxHeight: "90dvh", overflowY: "auto" }}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: "rgba(0,0,0,0.08)", background: "#fff" }}>
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">Product details</span>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-black/8"
              aria-label="Close"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="grid sm:grid-cols-2 gap-0">
            {/* Image */}
            <div className="bg-white flex items-center justify-center" style={{ minHeight: 280 }}>
              {product.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-72 sm:h-96 object-contain"
                  loading="eager"
                />
              ) : (
                <div className="flex h-72 items-center justify-center opacity-25 text-sm">No image</div>
              )}
            </div>

            {/* Info */}
            <div className="p-6 flex flex-col gap-4">
              <div>
                <h2
                  className="text-2xl font-bold leading-snug"
                  style={{ fontFamily: cssFontStack(theme.fontDisplay) }}
                >
                  {product.name}
                </h2>
                {product.priceLabel ? (
                  <p className="mt-2 text-xl font-black" style={{ color: theme.accent }}>
                    {product.priceLabel}
                  </p>
                ) : null}
                {product.isSubscription ? (
                  <span
                    className="mt-1 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                    style={{ background: `${theme.accent}18`, color: theme.accent }}
                  >
                    Subscription · {product.subscriptionInterval ?? "monthly"}
                  </span>
                ) : null}
              </div>

              {product.description ? (
                <p className="text-sm leading-relaxed opacity-75">{product.description}</p>
              ) : null}

              {/* Variants */}
              {product.hasVariants && product.variants && product.variants.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">Options</p>
                  <div className="flex flex-wrap gap-1.5">
                    {product.variants.map((v) => (
                      <span
                        key={v.id}
                        className="rounded-full border px-3 py-1 text-xs font-semibold"
                        style={{ borderColor: "rgba(0,0,0,0.15)" }}
                      >
                        {[v.option1, v.option2, v.option3].filter(Boolean).join(" / ")}
                        {v.priceLabel ? ` — ${v.priceLabel}` : ""}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* CTAs */}
              <div className="flex flex-col gap-2 mt-auto">
                {liveSubdomain && product.productId ? (
                  <PublicProductActions
                    subdomain={liveSubdomain}
                    productId={product.productId}
                    productName={product.name}
                    priceLabel={product.priceLabel ?? ""}
                    variants={product.variants?.map((v) => ({ ...v, priceLabel: v.priceLabel ?? "" }))}
                    commerce={shopCommerce}
                    orderStyle={orderStyle ?? "inline"}
                    ctaLabel={orderCtaLabel ?? "Place order"}
                    isSubscription={Boolean(product.isSubscription)}
                    subscriptionInterval={product.subscriptionInterval}
                  />
                ) : null}
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-bold transition-opacity hover:opacity-90"
                  style={{ background: "#25D366", color: "#fff" }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  Order via WhatsApp
                </a>
              </div>
            </div>
          </div>

          {/* You might also like */}
          {related.length > 0 ? (
            <div className="border-t px-5 py-5" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-3 opacity-60">You might also like</p>
              <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
                {related.map((p, i) => (
                  <div
                    key={`${p.productId ?? p.name}-${i}`}
                    className="shrink-0 w-28 cursor-pointer"
                    role="button"
                    tabIndex={0}
                    onClick={() => onSwitch(p)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onSwitch(p); }}
                  >
                    {p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.imageUrl}
                        alt={p.name}
                        className="w-28 h-28 rounded-xl object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-28 h-28 rounded-xl bg-black/5 flex items-center justify-center text-xs opacity-40">
                        No image
                      </div>
                    )}
                    <p className="mt-1.5 text-xs font-semibold leading-snug line-clamp-2">{p.name}</p>
                    {p.priceLabel ? (
                      <p className="text-[10px] font-bold mt-0.5" style={{ color: theme.accent }}>{p.priceLabel}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}

/* ── Main products section ────────────────────────────────────────────────── */
export function ProductsSection({
  heading,
  layout = "grid",
  columns = 3,
  orderStyle,
  orderCtaLabel,
  fullWidth,
  filterMode = "none",
  filterFields = [],
  collections: collectionsProp = [],
  bannerImageUrl,
  bannerText,
  hoverZoom,
  items = [],
  theme,
  merchantPhone,
  shopCommerce,
  paymentLabels,
  liveSubdomain,
  projectId,
  anchor,
  patchSection,
  deviceLabel,
}: ProductsSectionProps) {
  const [openProduct, setOpenProduct] = useState<ProductItem | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [fetchedCollections, setFetchedCollections] = useState<ProductCollection[]>([]);

  /* Auto-fetch collections from API when projectId is set and none are passed as props */
  useEffect(() => {
    if (collectionsProp.length > 0 || !projectId) return;
    let cancelled = false;
    fetch(`/api/projects/${projectId}/collections`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (cancelled || !data) return;
        const rows = (data as { id: string; name: string; productIds?: string[] }[]).map((c) => ({
          id: c.id,
          name: c.name,
          productIds: c.productIds ?? [],
        }));
        setFetchedCollections(rows);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [projectId, collectionsProp.length]);

  const collections = collectionsProp.length > 0 ? collectionsProp : fetchedCollections;

  /* Build filter options: prefer collections if available, fallback to filterFields */
  const useCollections = collections.length > 0;
  const filterOptions = useCollections
    ? collections.map((c) => c.name)
    : filterFields;

  /* Filtered items */
  const visibleItems = (() => {
    if (activeFilter === "All") return items;
    if (useCollections) {
      const col = collections.find((c) => c.name === activeFilter);
      if (!col) return items;
      return items.filter((item) => item.productId && col.productIds.includes(item.productId));
    }
    return items;
  })();

  const prodFullWidth = Boolean(fullWidth);
  const gridClass =
    layout === "list"
      ? "flex flex-col gap-4"
      : layout === "grid-dense"
        ? columns === 2
          ? "grid gap-4 sm:grid-cols-2"
          : columns === 4
            ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
            : "grid gap-3 sm:grid-cols-2 lg:grid-cols-3 auto-rows-fr"
        : columns === 2
          ? "grid gap-6 sm:grid-cols-2"
          : columns === 4
            ? "grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
            : "grid gap-6 sm:grid-cols-2 lg:grid-cols-3";
  const featuredFirst = layout === "featured" && visibleItems.length > 0;

  const renderCard = (item: ProductItem, opts?: { featured?: boolean }) => {
    const isList = layout === "list";
    const isFeatured = Boolean(opts?.featured);
    return (
      <article
        key={`${item.productId ?? item.name}`}
        className={`kebu-card overflow-hidden group cursor-pointer transition-shadow hover:shadow-lg ${
          isList ? "flex flex-col sm:flex-row gap-0" : ""
        } ${isFeatured ? "sm:col-span-2 lg:col-span-2" : ""}`}
        onClick={() => setOpenProduct(item)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setOpenProduct(item); }}
        aria-label={`View ${item.name}`}
      >
        <div className={`overflow-hidden relative bg-white ${isList ? "shrink-0 w-full sm:w-44" : "w-full"}`}>
          {item.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.imageUrl}
              alt={item.name}
              className={`object-contain transition-transform duration-500 ${hoverZoom ? "group-hover:scale-110" : ""} ${
                isList
                  ? "w-full h-40 sm:h-full"
                  : isFeatured
                    ? "w-full h-56 sm:h-72"
                    : layout === "grid-dense"
                      ? "w-full h-36"
                      : "w-full h-44"
              }`}
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div
              className={`flex items-center justify-center text-sm opacity-30 bg-black/5 ${
                isList ? "w-full h-40" : "w-full h-44"
              }`}
            >
              No image
            </div>
          )}
          {/* Quick-view badge on hover */}
          <div className="absolute inset-x-0 bottom-0 flex justify-center py-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <span
              className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow"
              style={{ background: "rgba(0,0,0,0.75)" }}
            >
              Quick view
            </span>
          </div>
        </div>
        <div className={`p-4 flex flex-col gap-1.5 ${isList ? "flex-1" : ""}`}>
          <h3 className={`font-semibold leading-snug ${isFeatured ? "text-xl" : "text-sm"}`}>{item.name}</h3>
          {item.priceLabel ? (
            <p className="text-sm font-black" style={{ color: theme.accent }}>
              {item.priceLabel}
            </p>
          ) : null}
          {item.description ? (
            <p className="text-xs opacity-60 leading-relaxed line-clamp-2 mt-0.5">
              {item.description}
            </p>
          ) : null}
          <button
            type="button"
            className="mt-2 self-start rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors"
            style={{
              background: `${theme.accent}15`,
              color: theme.accent,
            }}
            onClick={(e) => { e.stopPropagation(); setOpenProduct(item); }}
          >
            View details →
          </button>
        </div>
      </article>
    );
  };

  const sectionPx = prodFullWidth ? "px-5 lg:px-10" : "px-5";
  const sectionMx = prodFullWidth ? "" : " max-w-5xl mx-auto";

  /* Shared filter bar markup */
  const FilterBar = filterOptions.length > 0 ? (
    <div className="flex flex-wrap gap-2 mb-6">
      {["All", ...filterOptions].map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => setActiveFilter(opt)}
          className="rounded-full px-4 py-1.5 text-xs font-bold transition-all"
          style={{
            background: activeFilter === opt ? theme.accent : `${theme.accent}10`,
            color: activeFilter === opt ? "#fff" : theme.accent,
            border: `1.5px solid ${activeFilter === opt ? theme.accent : `${theme.accent}30`}`,
          }}
        >
          {opt}
          {useCollections && opt !== "All" ? (
            <span className="ml-1.5 opacity-60">
              ({collections.find((c) => c.name === opt)?.productIds.length ?? 0})
            </span>
          ) : null}
        </button>
      ))}
    </div>
  ) : null;

  return (
    <>
      <section id={anchor} className={`kebu-section scroll-mt-20${sectionMx}`}>
        {/* Banner */}
        {bannerImageUrl?.trim() ? (
          <div className="relative mb-8 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={bannerImageUrl}
              alt=""
              className="w-full h-52 sm:h-72 object-cover"
              loading="lazy"
              decoding="async"
            />
            {bannerText?.trim() ? (
              <div
                className="absolute inset-0 flex items-end px-6 py-6"
                style={{ background: "linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 60%)" }}
              >
                <p className="text-xl font-bold text-white">{bannerText}</p>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className={sectionPx}>
          {deviceLabel ? (
            <p className="text-[10px] uppercase tracking-wider opacity-50 mb-2">Editing {deviceLabel} copy</p>
          ) : null}

          <h2
            className="text-2xl font-bold mb-2"
            style={{ fontFamily: cssFontStack(theme.fontDisplay) }}
          >
            {heading || "Products"}
          </h2>

          {/* Payment badges */}
          {paymentLabels.length > 0 ? (
            <div className="mb-4 flex flex-wrap gap-1.5">
              {paymentLabels.map((label) => (
                <span
                  key={label}
                  className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                  style={{ background: `${theme.accent}18`, color: theme.accent }}
                >
                  {label}
                </span>
              ))}
            </div>
          ) : null}

          {/* Payment instructions */}
          {shopCommerce.paymentInstructions?.trim() && shopCommerce.acceptMobileMoney ? (
            <p className="mb-3 rounded-xl px-3 py-2 text-xs leading-relaxed opacity-80" style={{ background: "rgba(0,0,0,0.04)" }}>
              <strong>Mobile money:</strong> {shopCommerce.paymentInstructions.trim()}
            </p>
          ) : null}
          {shopCommerce.acceptCard && shopCommerce.cardInstructions?.trim() ? (
            <p className="mb-3 rounded-xl px-3 py-2 text-xs leading-relaxed opacity-80" style={{ background: "rgba(0,0,0,0.04)" }}>
              <strong>Card:</strong> {shopCommerce.cardInstructions.trim()}
            </p>
          ) : null}
          {shopCommerce.acceptPaypal && shopCommerce.paypalHandle?.trim() ? (
            <p className="mb-4 rounded-xl px-3 py-2 text-xs leading-relaxed opacity-80" style={{ background: "rgba(0,0,0,0.04)" }}>
              <strong>PayPal:</strong> {shopCommerce.paypalHandle.trim()}
            </p>
          ) : null}

          {/* Horizontal filter bar */}
          {filterMode === "horizontal" || useCollections ? FilterBar : null}

          <div className={filterMode === "sidebar" && filterOptions.length > 0 ? "flex gap-6 items-start" : ""}>
            {/* Sidebar filters */}
            {filterMode === "sidebar" && filterOptions.length > 0 ? (
              <nav className="w-40 shrink-0 hidden sm:block space-y-0.5">
                <p className="text-[10px] font-bold uppercase tracking-wider mb-2 opacity-50">Filter</p>
                {["All", ...filterOptions].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setActiveFilter(opt)}
                    className="block w-full text-left rounded-lg px-3 py-2 text-xs transition-colors"
                    style={{
                      background: activeFilter === opt ? `${theme.accent}15` : "transparent",
                      color: activeFilter === opt ? theme.accent : "inherit",
                      fontWeight: activeFilter === opt ? 700 : 400,
                    }}
                  >
                    {opt}
                    {useCollections && opt !== "All" ? (
                      <span className="ml-1 opacity-50 text-[10px]">
                        ({collections.find((c) => c.name === opt)?.productIds.length ?? 0})
                      </span>
                    ) : null}
                  </button>
                ))}
              </nav>
            ) : null}

            <div className="flex-1 min-w-0">
              {layout === "carousel" ? (
                <div className="relative">
                  {/* Horizontal scroll strip — arrow nav, snap-scroll */}
                  <div
                    className="flex gap-4 overflow-x-auto scroll-smooth pb-2"
                    style={{ scrollbarWidth: "none", scrollSnapType: "x mandatory" }}
                    id={`carousel-${anchor ?? "products"}`}
                  >
                    {visibleItems.map((item) => (
                      <article
                        key={item.productId ?? item.name}
                        className="kebu-card overflow-hidden group cursor-pointer transition-shadow hover:shadow-lg flex-shrink-0"
                        style={{ width: "clamp(180px, 40vw, 240px)", scrollSnapAlign: "start" }}
                        onClick={() => setOpenProduct(item)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === "Enter" && setOpenProduct(item)}
                      >
                        {renderCard(item)}
                      </article>
                    ))}
                  </div>
                  {/* Arrow buttons */}
                  {visibleItems.length > 2 && (
                    <div className="absolute -top-9 right-0 flex gap-1.5">
                      <button
                        type="button"
                        aria-label="Scroll left"
                        className="flex h-7 w-7 items-center justify-center rounded-full border text-sm transition-opacity hover:opacity-70"
                        style={{ borderColor: "rgba(0,0,0,0.15)" }}
                        onClick={() => {
                          const el = document.getElementById(`carousel-${anchor ?? "products"}`);
                          if (el) el.scrollBy({ left: -260, behavior: "smooth" });
                        }}
                      >
                        ←
                      </button>
                      <button
                        type="button"
                        aria-label="Scroll right"
                        className="flex h-7 w-7 items-center justify-center rounded-full border text-sm transition-opacity hover:opacity-70"
                        style={{ borderColor: "rgba(0,0,0,0.15)" }}
                        onClick={() => {
                          const el = document.getElementById(`carousel-${anchor ?? "products"}`);
                          if (el) el.scrollBy({ left: 260, behavior: "smooth" });
                        }}
                      >
                        →
                      </button>
                    </div>
                  )}
                </div>
              ) : (
              <div className={gridClass}>
                {featuredFirst
                  ? [
                      renderCard(visibleItems[0]!, { featured: true }),
                      ...visibleItems.slice(1).map((item) => renderCard(item)),
                    ]
                  : visibleItems.map((item) => renderCard(item))}
              </div>
              )}
              {items.length === 0 ? (
                <p className="text-sm opacity-60">
                  Add products in Kebu Shop (Products tab), then publish this site.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* Product detail modal */}
      {openProduct ? (
        <ProductModal
          product={openProduct}
          allProducts={items}
          onClose={() => setOpenProduct(null)}
          onSwitch={(p) => setOpenProduct(p)}
          theme={theme}
          merchantPhone={merchantPhone}
          shopCommerce={shopCommerce}
          liveSubdomain={liveSubdomain}
          orderStyle={orderStyle}
          orderCtaLabel={orderCtaLabel}
        />
      ) : null}
    </>
  );
}
