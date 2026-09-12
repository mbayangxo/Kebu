"use client";

import type { CSSProperties, ReactNode } from "react";
import { Fragment, useState } from "react";
import type { WebsiteDefinition } from "@/lib/create/website-schema";
import { VideoGrid } from "@/app/components/video-embed";
import { NewsletterSignup } from "@/app/components/create/newsletter-signup";
import { SiteEmailPopup, type EmailPopupProps } from "@/app/components/create/site-email-popup";
import { PublicShopOrder } from "@/app/components/create/public-shop-order";
import { PublicProductActions } from "@/app/components/create/public-product-actions";
import { PublicShopCart } from "@/app/components/create/public-shop-cart";
import { SiteFormSection } from "@/app/components/create/site-form-section";
import { SiteBlogSection } from "@/app/components/create/site-blog-section";
import { ProductsSection } from "@/app/components/create/products-section";
import type { ProductCollection } from "@/app/components/create/products-section";
import { readDeviceOverride, applyDeviceAwarePatch, mergeDeviceAwareSectionProps } from "@/lib/create/device-overrides";
import {
  isDirectAudioUrl,
  isDirectVideoUrl,
} from "@/lib/create/site-asset-upload";
import { supabaseImgUrl } from "@/lib/create/image-transforms";
import {
  commercePaymentLabels,
  mergeSiteCommerce,
  resolveMerchantWhatsApp,
  whatsAppOrderHref,
} from "@/lib/create/site-commerce";
import type { SiteSeo } from "@/lib/create/site-seo";
import {
  MaylecorHomeLayout,
  MaylecorMusicLayout,
  type MaylecorHomeProps,
  type MaylecorMusicProps,
} from "@/app/components/create/maylecor-layout";
import {
  LegallyBlondeHeroLayout,
  type LegallyBlondeHeroProps,
} from "@/app/components/create/legally-blonde-layout";
import { SiteThemeFonts } from "@/app/components/create/site-theme-fonts";
import { cssFontStack } from "@/lib/create/site-theme-fonts";
import {
  KdirectionHomeLayout,
  KdirectionPageLayout,
  type KdirectionHomeProps,
  type KdirectionPageProps,
} from "@/app/components/create/kdirection-layout";
import { MaylecorMotionChrome } from "@/app/components/create/maylecor-motion-chrome";
import { MaylecorSiteFooter } from "@/app/components/create/maylecor-site-footer";
import { sanitizeMaylecorNavLinks } from "@/lib/create/maylecor-nav";
import { navChromeMetrics, parseNavLayout } from "@/lib/create/nav-chrome-size";
import "./artist-motion.css";
import { KEBU_SITE_ROOT_CLASS } from "@/lib/create/site-responsive";
import { themeToCssVars } from "@/lib/create/site-aesthetics";
import { dataModeSiteClass, preferSystemFonts, type DataMode } from "@/lib/create/data-mode";
import { definitionHasShop } from "@/lib/create/site-shop";
import { labelForSectionType } from "@/lib/create/builder-section-catalog";
import { BuilderInlineSectionDivider } from "@/app/components/create/builder-inline-section-divider";
import "./kebu-site-responsive.css";

const STRUCTURAL_SECTION_TYPES = new Set([
  "legally-blonde-hero",
  "kdirection-home",
  "maylecor-home",
]);

function liveSubdomainFromBase(siteBase?: string): string | null {
  if (!siteBase) return null;
  const match = siteBase.match(/\/sites\/([a-z0-9]+(?:-[a-z0-9]+)*)/i);
  return match?.[1]?.toLowerCase() ?? null;
}

function resolvePage(definition: WebsiteDefinition, pageSlug?: string) {
  if (!definition.pages.length) return null;
  if (!pageSlug || pageSlug === "home") {
    return definition.pages.find((p) => p.slug === "home") ?? definition.pages[0]!;
  }
  return definition.pages.find((p) => p.slug === pageSlug) ?? definition.pages[0]!;
}

function sectionAnchor(section: { id?: string; type: string }): string | undefined {
  if (section.id) return section.id;
  switch (section.type) {
    case "text":
      return "about";
    case "features":
      return "services";
    case "gallery":
      return "gallery";
    case "events":
      return "events";
    case "map":
      return "map";
    case "testimonials":
      return "testimonials";
    case "faq":
      return "faq";
    case "products":
      return "products";
    case "contact":
      return "contact";
    case "newsletter":
      return "newsletter";
    case "form":
      return "contact";
    case "blog-list":
      return "blog";
    case "whatsapp":
      return "whatsapp";
    case "joko":
      return "joko";
    default:
      return undefined;
  }
}

export type SiteRendererEditor = {
  selectedSectionId?: string | null;
  inlineEdit?: boolean;
  /** Force desktop/tablet/phone layout while editing in the builder. */
  editDevice?: import("@/lib/create/builder-device").BuilderDevice;
  onSelectSection?: (sectionId: string) => void;
  onPatchSection?: (sectionId: string, patch: Record<string, unknown>) => void;
  onMoveFreeTextBlock?: (sectionId: string, blockId: string, x: number, y: number) => void;
  /** Switch the builder preview to another site page (keeps you in the editor). */
  onNavigatePage?: (slug: string) => void;
  onDuplicateSection?: (sectionId: string) => void;
  onDeleteSection?: (sectionId: string) => void;
  onMoveSection?: (sectionId: string, direction: "up" | "down") => void;
  /** B8: insert section after id (null = top of page). */
  onAddSectionAfter?: (type: string, afterSectionId: string | null) => void | Promise<void>;
};

function wrapEditorSection(
  sectionId: string | undefined,
  editor: SiteRendererEditor | undefined,
  children: ReactNode,
  sectionType?: string,
  /** Only fill the viewport when this is the sole section — otherwise the page must grow/scroll. */
  fillViewport = false,
): ReactNode {
  if (!editor || !sectionId) return children;
  const selected = editor.selectedSectionId === sectionId;
  const structural = sectionType ? STRUCTURAL_SECTION_TYPES.has(sectionType) : false;
  const showToolbar = Boolean(
    editor.onDuplicateSection || editor.onDeleteSection || editor.onMoveSection,
  ) && (!structural || !fillViewport);
  return (
    <div
      data-section-id={sectionId}
      onClick={(e) => {
        e.stopPropagation();
        editor.onSelectSection?.(sectionId);
      }}
      className={`group relative ${fillViewport ? "flex h-full min-h-0 flex-1 flex-col" : ""} ${selected ? "outline outline-2 outline-[#2C6ECB] outline-offset-[-1px] z-10" : "hover:outline hover:outline-1 hover:outline-[#2C6ECB]/50"}`}
      style={{ cursor: "pointer" }}
    >
      {selected && sectionType ? (
        <div
          className="absolute -left-px top-0 z-40 flex items-center gap-1 rounded-br-md px-2 py-0.5 text-[10px] font-semibold tracking-tight text-white shadow-sm"
          style={{ background: "#2C6ECB" }}
        >
          <span aria-hidden className="opacity-80">
            ▦
          </span>
          {labelForSectionType(sectionType)}
        </div>
      ) : null}
      {showToolbar ? (
        <div
          className={`absolute right-2 top-2 z-40 flex flex-wrap gap-1 ${selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"} pointer-events-auto`}
          onClick={(e) => e.stopPropagation()}
        >
          {editor.onMoveSection ? (
            <>
              <button
                type="button"
                className="rounded-md bg-white/95 px-1.5 py-0.5 text-[10px] font-bold shadow"
                onClick={() => editor.onMoveSection?.(sectionId, "up")}
              >
                ↑
              </button>
              <button
                type="button"
                className="rounded-md bg-white/95 px-1.5 py-0.5 text-[10px] font-bold shadow"
                onClick={() => editor.onMoveSection?.(sectionId, "down")}
              >
                ↓
              </button>
            </>
          ) : null}
          {editor.onDuplicateSection ? (
            <button
              type="button"
              className="rounded-md bg-white/95 px-1.5 py-0.5 text-[10px] font-bold shadow"
              onClick={() => editor.onDuplicateSection?.(sectionId)}
            >
              Duplicate
            </button>
          ) : null}
          {editor.onDeleteSection ? (
            <button
              type="button"
              className="rounded-md bg-white/95 px-1.5 py-0.5 text-[10px] font-bold text-red-600 shadow"
              onClick={() => {
                if (typeof window !== "undefined" && window.confirm("Remove this section from the page?")) {
                  editor.onDeleteSection?.(sectionId);
                }
              }}
            >
              Remove
            </button>
          ) : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}

function EditableText({
  value,
  tag: Tag = "span",
  className,
  style,
  editor,
  onChange,
}: {
  value: string;
  tag?: "span" | "h1" | "h2" | "p";
  className?: string;
  style?: CSSProperties;
  editor?: SiteRendererEditor;
  onChange?: (next: string) => void;
}) {
  if (!editor?.inlineEdit || !onChange) {
    return (
      <Tag className={className} style={style}>
        {value}
      </Tag>
    );
  }
  return (
    <Tag
      className={`${className ?? ""} outline-none focus:ring-1 focus:ring-[#FF5500]/60 rounded-sm`}
      style={{ ...style, cursor: "text" }}
      contentEditable
      suppressContentEditableWarning
      onPointerDown={(e) => {
        // Let parent handle drag unless user is clearly editing (double-click / focus)
        if (document.activeElement !== e.currentTarget) {
          /* bubble to parent for drag */
        } else {
          e.stopPropagation();
        }
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        e.currentTarget.focus();
      }}
      onBlur={(e) => onChange(e.currentTarget.textContent ?? "")}
      onClick={(e) => e.stopPropagation()}
    >
      {value}
    </Tag>
  );
}

function findEmailPopup(
  definition: WebsiteDefinition,
): { sectionId?: string; props: EmailPopupProps } | null {
  for (const p of definition.pages) {
    for (const s of p.sections) {
      if (s.type === "email-popup" && !(s.props as { hidden?: boolean }).hidden) {
        return { sectionId: s.id, props: s.props as EmailPopupProps };
      }
    }
  }
  return null;
}

function findMotionHeroProps(definition: WebsiteDefinition): LegallyBlondeHeroProps | null {
  for (const p of definition.pages) {
    for (const s of p.sections) {
      if (s.type === "legally-blonde-hero") {
        return s.props as LegallyBlondeHeroProps;
      }
    }
  }
  return null;
}

/** Click-based dropdown for nav links with sub-items. Works on touch screens. */
function NavDropdown({
  label,
  href,
  items,
  bg,
  resolveHref,
  onNavigate,
}: {
  label: string;
  href: string;
  items: { label: string; href: string }[];
  bg: string;
  resolveHref: (h: string) => string;
  onNavigate?: (slug: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const slug = href ? href.replace(/^\//, "").split(/[?#]/)[0] || "home" : null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="opacity-80 hover:opacity-100 text-left flex items-center gap-1"
      >
        {label}
        <span aria-hidden style={{ fontSize: "0.7em", opacity: 0.7, display: "inline-block", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>▾</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div
            className="absolute left-0 top-full z-50 flex min-w-[160px] flex-col overflow-hidden rounded-lg shadow-lg"
            style={{ background: bg, paddingBlock: 4 }}
          >
            {href && href !== "#" && (
              onNavigate && slug ? (
                <button
                  type="button"
                  onClick={() => { onNavigate(slug); setOpen(false); }}
                  className="text-left px-4 py-2 opacity-80 hover:opacity-100 text-sm border-b"
                  style={{ borderColor: "rgba(255,255,255,0.15)" }}
                >
                  {label} (overview)
                </button>
              ) : (
                <a
                  href={resolveHref(href)}
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 opacity-80 hover:opacity-100 text-sm block border-b"
                  style={{ borderColor: "rgba(255,255,255,0.15)" }}
                >
                  {label} (overview)
                </a>
              )
            )}
            {items.map((child) => {
              const childSlug = child.href ? child.href.replace(/^\//, "").split(/[?#]/)[0] || "home" : null;
              return onNavigate && childSlug ? (
                <button
                  key={child.href}
                  type="button"
                  onClick={() => { onNavigate(childSlug); setOpen(false); }}
                  className="text-left px-4 py-2 opacity-80 hover:opacity-100 text-sm"
                >
                  {child.label}
                </button>
              ) : (
                <a
                  key={child.href}
                  href={resolveHref(child.href)}
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 opacity-80 hover:opacity-100 text-sm block"
                >
                  {child.label}
                </a>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/** Full-width mega dropdown panel — Fashion Nova / Best Buy pattern. */
function MegaDropdown({
  label,
  href,
  items,
  bg,
  textColor,
  resolveHref,
  onNavigate,
}: {
  label: string;
  href: string;
  items: { label: string; href: string; columnLabel?: string; grandchildren?: { label: string; href: string }[]; featuredImage?: string; featuredImageAlt?: string }[];
  bg: string;
  textColor: string;
  resolveHref: (h: string) => string;
  onNavigate?: (slug: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const slug = href ? href.replace(/^\//, "").split(/[?#]/)[0] || "home" : null;
  const hasCols = items.some((i) => i.grandchildren && i.grandchildren.length > 0);
  const featuredItem = items.find((i) => i.featuredImage);

  return (
    <div className="relative">
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
        className="opacity-80 hover:opacity-100 text-left flex items-center gap-1"
      >
        {label}
        <span aria-hidden style={{ fontSize: "0.7em", opacity: 0.7, display: "inline-block", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>▾</span>
      </button>
      {open && (
        <div
          className="fixed left-0 right-0 z-50 shadow-xl"
          style={{ top: "var(--nav-height, 56px)", background: bg }}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
        >
          <div className="fixed inset-0 -z-10" onClick={() => setOpen(false)} aria-hidden />
          <div className="mx-auto max-w-7xl px-6 py-8 flex gap-8">
            {/* Column groups */}
            <div className="flex flex-1 gap-6">
              {hasCols ? (
                items.map((col, ci) => (
                  <div key={ci} className="flex-1 min-w-0">
                    {col.columnLabel && (
                      <div className="text-[10px] font-bold uppercase tracking-[0.2em] mb-3 opacity-50" style={{ color: textColor }}>{col.columnLabel}</div>
                    )}
                    {/* Parent link as section header */}
                    {col.label && (
                      onNavigate && col.href && col.href !== "#" ? (
                        <button type="button" onClick={() => { const s = col.href.replace(/^\//, "").split(/[?#]/)[0]; onNavigate(s || "home"); setOpen(false); }}
                          className="block text-sm font-semibold mb-2 hover:opacity-70" style={{ color: textColor }}>
                          {col.label}
                        </button>
                      ) : col.href && col.href !== "#" ? (
                        <a href={resolveHref(col.href)} onClick={() => setOpen(false)} className="block text-sm font-semibold mb-2 hover:opacity-70" style={{ color: textColor }}>{col.label}</a>
                      ) : (
                        <div className="text-sm font-semibold mb-2 opacity-80" style={{ color: textColor }}>{col.label}</div>
                      )
                    )}
                    <div className="flex flex-col gap-1">
                      {(col.grandchildren ?? []).map((gc, gi) => {
                        const gcSlug = gc.href ? gc.href.replace(/^\//, "").split(/[?#]/)[0] || "home" : null;
                        return onNavigate && gcSlug ? (
                          <button key={gi} type="button" onClick={() => { onNavigate(gcSlug); setOpen(false); }}
                            className="text-left text-sm opacity-60 hover:opacity-100 py-0.5" style={{ color: textColor }}>{gc.label}</button>
                        ) : (
                          <a key={gi} href={resolveHref(gc.href)} onClick={() => setOpen(false)}
                            className="text-sm opacity-60 hover:opacity-100 py-0.5 block" style={{ color: textColor }}>{gc.label}</a>
                        );
                      })}
                    </div>
                  </div>
                ))
              ) : (
                /* Flat list mode — no grandchildren */
                <div className="flex flex-wrap gap-x-8 gap-y-1">
                  {href && href !== "#" && (
                    <div className="w-full mb-1">
                      {onNavigate && slug ? (
                        <button type="button" onClick={() => { onNavigate(slug); setOpen(false); }}
                          className="text-sm font-bold opacity-80 hover:opacity-100" style={{ color: textColor }}>{label} — overview</button>
                      ) : (
                        <a href={resolveHref(href)} onClick={() => setOpen(false)} className="text-sm font-bold opacity-80 hover:opacity-100" style={{ color: textColor }}>{label} — overview</a>
                      )}
                    </div>
                  )}
                  {items.map((child, ci) => {
                    const cs = child.href ? child.href.replace(/^\//, "").split(/[?#]/)[0] || "home" : null;
                    return onNavigate && cs ? (
                      <button key={ci} type="button" onClick={() => { onNavigate(cs); setOpen(false); }}
                        className="text-sm opacity-60 hover:opacity-100 py-0.5 text-left" style={{ color: textColor }}>{child.label}</button>
                    ) : (
                      <a key={ci} href={resolveHref(child.href)} onClick={() => setOpen(false)}
                        className="text-sm opacity-60 hover:opacity-100 py-0.5 block" style={{ color: textColor }}>{child.label}</a>
                    );
                  })}
                </div>
              )}
            </div>
            {/* Featured image panel */}
            {featuredItem?.featuredImage && (
              <div className="w-48 flex-shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={featuredItem.featuredImage} alt={featuredItem.featuredImageAlt ?? ""} className="w-full h-36 object-cover rounded-lg" />
                {featuredItem.columnLabel && (
                  <div className="text-xs mt-2 font-semibold opacity-70" style={{ color: textColor }}>{featuredItem.columnLabel}</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Public/preview renderer — approved section types only. */
export function SiteRenderer({
  definition,
  mode = "live",
  pageSlug,
  siteBase = "",
  liveSubdomain,
  projectId,
  editor,
  dataMode = "normal",
}: {
  definition: WebsiteDefinition;
  mode?: "live" | "preview";
  pageSlug?: string;
  /** e.g. /sites/maylecor for multi-page links */
  siteBase?: string;
  /** Publish subdomain for shop orders (works on custom domains too). */
  liveSubdomain?: string;
  /** Required for live newsletter capture */
  projectId?: string;
  editor?: SiteRendererEditor;
  /** Africa low-data mode from DataModeProvider / public site. */
  dataMode?: DataMode;
}) {
  const theme = definition.theme;
  const merchantPhone = resolveMerchantWhatsApp(definition, definition.seo as SiteSeo | undefined);
  const shopCommerce = mergeSiteCommerce((definition.seo as SiteSeo | undefined)?.commerce);
  const paymentLabels = commercePaymentLabels(shopCommerce);
  const page = resolvePage(definition, pageSlug);
  if (!page) return null;

  const maylecorOnly = page.sections.every((s) =>
    s.type === "maylecor-home" || s.type === "maylecor-music",
  );
  const legallyBlondeOnly = page.sections.every((s) => s.type === "legally-blonde-hero");
  const hasKdirection = page.sections.some(
    (s) => s.type === "kdirection-home" || s.type === "kdirection-page",
  );
  const motionHero = findMotionHeroProps(definition);
  const emailPopup = findEmailPopup(definition);
  const motionSite = motionHero !== null;
  const activeSlug = pageSlug && pageSlug !== "home" ? pageSlug : "home";
  const viewportHome =
    motionSite && activeSlug === "home" && motionHero?.scrollMode === "viewport";

  const editingPreview = mode === "preview" && Boolean(editor);
  const motionBuilderPreview = editingPreview && motionSite;
  const themeVars = themeToCssVars(theme);
  const freeTextExtraFonts: string[] = [];
  for (const p of definition.pages) {
    for (const s of p.sections) {
      if (s.type !== "free-text") continue;
      const blocks = (s.props as { blocks?: { fontFamily?: string }[] }).blocks ?? [];
      for (const b of blocks) {
        if (b.fontFamily?.trim()) freeTextExtraFonts.push(b.fontFamily.trim());
      }
    }
  }
  const shellStyle = maylecorOnly
    ? {
        background: editingPreview ? "#FFE4F0" : "#000",
        color: editingPreview ? "#111" : "#fff",
        minHeight: mode === "preview" ? "100%" : "100vh",
      }
    : legallyBlondeOnly
      ? {
          background: editingPreview ? "#FFE4F0" : "#fff",
          color: "#111",
          minHeight: mode === "preview" ? "100%" : "100vh",
          ...(editingPreview
            ? { height: "100%", display: "flex", flexDirection: "column" as const }
            : {}),
        }
      : hasKdirection
        ? { background: "transparent", color: "#111", minHeight: mode === "preview" ? "100%" : "100vh" }
      : motionSite && activeSlug !== "home"
        ? {
            background: motionBuilderPreview ? "#FFE4F0" : "#0a0a0a",
            color: motionBuilderPreview ? "#111" : "#fff",
            minHeight: mode === "preview" ? "100%" : "100vh",
          }
        : viewportHome
          ? {
              background: "#fff",
              color: "#111",
              minHeight: mode === "preview" ? "100%" : "100vh",
              overflowX: "clip" as const,
            }
        : {
          background: theme.background,
          color: theme.text,
          minHeight: mode === "preview" ? "100%" : "100vh",
          fontFamily: cssFontStack(theme.fontBody),
        };

  const rootClass =
    mode === "preview"
      ? `${KEBU_SITE_ROOT_CLASS} kebu-site--preview ${dataModeSiteClass(dataMode)}`
      : `${KEBU_SITE_ROOT_CLASS} ${dataModeSiteClass(dataMode)}`;

  const sideNav = Boolean(motionSite && motionHero && parseNavLayout(motionHero.navLayout) === "side");

  const hideOuterChrome = editingPreview && activeSlug === "home" && Boolean(motionHero);
  const chrome =
    motionSite && motionHero && !hideOuterChrome ? (
      <MaylecorMotionChrome
        siteBase={siteBase}
        brandLabel={motionHero.brandLabel ?? motionHero.title}
        titleLogo={
          motionHero.showChromeLogo === false
            ? undefined
            : String(motionHero.chromeLogo ?? "").trim() ||
              "/templates/maylecor/logo-stacked.png"
        }
        showChromeLogo={motionHero.showChromeLogo !== false}
        currentSlug={activeSlug}
        accentColor={motionHero.accentColor}
        contained={mode === "preview"}
        overlayOnSite
        navLinks={sanitizeMaylecorNavLinks(motionHero.navLinks)}
        navDisplay={
          motionHero.navDisplay === "icons" || motionHero.navDisplay === "photos"
            ? motionHero.navDisplay
            : "text"
        }
        socialLinks={motionHero.socialLinks}
        navScale={motionHero.navScale}
        navSize={motionHero.navSize}
        navLayout={parseNavLayout(motionHero.navLayout)}
        onNavigate={editor?.onNavigatePage}
      />
    ) : null;

  const body = (
    <>
      {motionSite && activeSlug !== "home" ? (
        <div
          className={`border-b border-white/10 bg-black/90 px-4 py-2 backdrop-blur-md ${
            mode === "preview" ? "relative z-20" : "sticky top-[52px] z-20"
          }`}
        >
          {editor?.onNavigatePage ? (
            <button
              type="button"
              onClick={() => editor.onNavigatePage!("home")}
              className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-white/80 hover:text-white"
            >
              ← Back
            </button>
          ) : (
            <a
              href={siteBase || "/"}
              className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-white/80 hover:text-white"
            >
              ← Back
            </a>
          )}
        </div>
      ) : null}
      {(() => {
        const visibleSections = page.sections.filter(
          (s) => !(s.props && (s.props as { hidden?: boolean }).hidden),
        );
        const showInlineStack = editingPreview && Boolean(editor?.onAddSectionAfter);

        function renderDivider(afterSectionId: string | null) {
          if (!showInlineStack || !editor?.onAddSectionAfter) return null;
          return (
            <BuilderInlineSectionDivider
              afterSectionId={afterSectionId}
              selectedSectionId={editor.selectedSectionId}
              onAdd={editor.onAddSectionAfter}
            />
          );
        }

        if (showInlineStack && visibleSections.length === 0) {
          return renderDivider(null);
        }

        if (editingPreview && visibleSections.length === 0) {
          return (
            <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 px-6 py-16 text-center">
              <p className="text-sm font-semibold" style={{ color: "#1a1a1a" }}>
                This page is empty
              </p>
              <p className="max-w-sm text-xs leading-relaxed" style={{ color: "#6b6b6b" }}>
                Open Sections in the left rail and use + Add section to build this page. The canvas stays clean —
                add and remove only from the nav.
              </p>
            </div>
          );
        }

        return (
          <>
            {visibleSections.map((section, idx) => {
        const key = section.id ?? `${section.type}-${idx}`;
        const sectionId = section.id ?? key;
        const anchor = sectionAnchor(section);
        const fillViewport =
          STRUCTURAL_SECTION_TYPES.has(section.type) && visibleSections.length === 1;
        const wrap = (node: ReactNode) =>
          wrapEditorSection(sectionId, editor, node, section.type, fillViewport);
        const sectionEl = (() => {
        switch (section.type) {
          case "maylecor-home":
            return wrap(
              <MaylecorHomeLayout
                key={key}
                props={section.props as MaylecorHomeProps}
                siteBase={siteBase}
                sectionId={sectionId}
                editor={editor}
              />,
            );
          case "maylecor-music":
            return wrap(
              <MaylecorMusicLayout
                key={key}
                props={section.props as MaylecorMusicProps}
                siteBase={siteBase}
                sectionId={sectionId}
                editor={editor}
              />,
            );
          case "kdirection-home":
            return wrap(
              <KdirectionHomeLayout
                key={key}
                props={section.props as KdirectionHomeProps}
                siteBase={siteBase}
                sectionId={sectionId}
                editor={editor}
                projectId={projectId}
              />,
            );
          case "kdirection-page":
            return wrap(
              <KdirectionPageLayout
                key={key}
                props={section.props as KdirectionPageProps}
                siteBase={siteBase}
                sectionId={sectionId}
                editor={editor}
                projectId={projectId}
              />,
            );
          case "legally-blonde-hero": {
            const raw = section.props as Record<string, unknown>;
            const device = editor?.editDevice ?? "desktop";
            const resolved = mergeDeviceAwareSectionProps(raw, device);
            return wrap(
              <LegallyBlondeHeroLayout
                key={key}
                props={resolved as LegallyBlondeHeroProps}
                contained={mode === "preview"}
                fillCanvas={fillViewport}
                sectionId={sectionId}
                editor={
                  editor
                    ? {
                        ...editor,
                        onPatchSection: (id, patch) => {
                          applyDeviceAwarePatch(editor.onPatchSection, id, raw, device, patch);
                        },
                      }
                    : undefined
                }
                projectId={projectId}
                siteBase={siteBase}
                pageSlug={activeSlug}
              />,
            );
          }
          case "navigation": {
            const raw = section.props as Record<string, unknown>;
            const device = editor?.editDevice ?? "desktop";
            const p = {
              brand: String(readDeviceOverride(raw, device, "brand") ?? ""),
              links: (raw.links as { label: string; href: string; children?: { label: string; href: string; columnLabel?: string; grandchildren?: { label: string; href: string }[]; featuredImage?: string; featuredImageAlt?: string }[] }[] | undefined) ?? [],
              navScale: raw.navScale as number | undefined,
              navSize: raw.navSize as "compact" | "comfortable" | "large" | "fullscreen" | undefined,
              navLayout: raw.navLayout as "top" | "side" | undefined,
              logoAlign: (raw.logoAlign as "left" | "center" | "right" | undefined) ?? "left",
              navSticky: raw.navSticky !== false,
              navStyle: (raw.navStyle as "standard" | "mega" | undefined) ?? "standard",
            };
            const patchNav = (patch: Record<string, unknown>) =>
              applyDeviceAwarePatch(editor?.onPatchSection, sectionId, raw, device, patch);
            const m = navChromeMetrics({ scale: p.navScale, size: p.navSize });
            const side = parseNavLayout(p.navLayout) === "side";
            const stickyClass = p.navSticky ? "sticky top-0 z-30" : "relative z-20";
            const resolveNavHref = (href: string) => {
              const h = (href || "").trim();
              if (!h || h === "#") return siteBase || "/";
              if (h.startsWith("http") || h.startsWith("#") || h.startsWith("mailto:")) return h;
              if (h.startsWith("/")) {
                const base = siteBase.replace(/\/$/, "");
                return base ? `${base}${h === "/" ? "" : h}` : h;
              }
              const base = siteBase.replace(/\/$/, "");
              return base ? `${base}/${h}` : `/${h}`;
            };
            const slugFromHref = (href: string): string | null => {
              const h = (href || "").trim();
              if (!h || h === "#" || h.startsWith("http") || h.startsWith("mailto:") || h.startsWith("#")) {
                return null;
              }
              const path = h.startsWith("/") ? h : `/${h}`;
              const base = siteBase.replace(/\/$/, "");
              let rest = path;
              if (base && path.startsWith(base)) {
                rest = path.slice(base.length) || "/";
              }
              const cleaned = rest.replace(/^\//, "").split(/[?#]/)[0] ?? "";
              return cleaned || "home";
            };
            const renderNavLink = (l: { label: string; href: string; children?: { label: string; href: string; columnLabel?: string; grandchildren?: { label: string; href: string }[]; featuredImage?: string; featuredImageAlt?: string }[] }) => {
              const slug = slugFromHref(l.href);
              const hasChildren = l.children && l.children.length > 0;
              if (hasChildren) {
                if (p.navStyle === "mega") {
                  return (
                    <MegaDropdown
                      key={`${l.label}-${l.href}-mega`}
                      label={l.label}
                      href={l.href}
                      items={l.children!}
                      bg={String(theme.primary ?? "#000")}
                      textColor={String(theme.text ?? "#fff")}
                      resolveHref={resolveNavHref}
                      onNavigate={editor?.onNavigatePage}
                    />
                  );
                }
                return (
                  <NavDropdown
                    key={`${l.label}-${l.href}-group`}
                    label={l.label}
                    href={l.href}
                    items={l.children!}
                    bg={String(theme.primary ?? "#000")}
                    resolveHref={resolveNavHref}
                    onNavigate={editor?.onNavigatePage}
                  />
                );
              }
              return editor?.onNavigatePage && slug ? (
                <button
                  key={`${l.label}-${l.href}`}
                  type="button"
                  onClick={() => editor.onNavigatePage!(slug)}
                  className="opacity-80 hover:opacity-100 text-left"
                >
                  {l.label}
                </button>
              ) : (
                <a
                  key={`${l.label}-${l.href}`}
                  href={resolveNavHref(l.href)}
                  className="opacity-80 hover:opacity-100"
                >
                  {l.label}
                </a>
              );
            };
            const brandEl = (
              <EditableText
                tag="span"
                className="kebu-site-nav__brand font-bold tracking-wide"
                style={{ fontSize: m.brandPx }}
                value={p.brand}
                editor={editor}
                onChange={(brand) => patchNav({ brand })}
              />
            );
            if (side) {
              return wrap(
                <aside
                  key={key}
                  className={`kebu-site-nav kebu-site-nav--side flex flex-col shrink-0 self-stretch ${stickyClass}`}
                  style={{
                    background: theme.primary,
                    color: "#fff",
                    width: m.sideWidth,
                    paddingTop: m.padY + 8,
                    paddingBottom: m.padY + 8,
                    paddingLeft: m.padX,
                    paddingRight: m.padX,
                    gap: Math.max(10, m.gap * 0.65),
                  }}
                >
                  {brandEl}
                  <nav className="kebu-site-nav__links flex flex-col" style={{ gap: Math.max(10, m.gap * 0.65), fontSize: m.fontPx }}>
                    {p.links.map((l) => renderNavLink(l))}
                  </nav>
                </aside>,
              );
            }
            const navBg = theme.primary;
            const navIsLight = (() => {
              const hex = String(navBg || "").replace(/\s/g, "");
              if (hex.startsWith("#") && hex.length >= 7) {
                const r = parseInt(hex.slice(1, 3), 16);
                const g = parseInt(hex.slice(3, 5), 16);
                const b = parseInt(hex.slice(5, 7), 16);
                if ([r, g, b].every((n) => !Number.isNaN(n))) {
                  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55;
                }
              }
              return false;
            })();
            const logoJustify = p.logoAlign === "center" ? "justify-center" : p.logoAlign === "right" ? "justify-end" : "justify-start";
            return wrap(
              <header
                key={key}
                className={`kebu-site-nav ${stickyClass}`}
                style={{
                  background: navBg,
                  color: navIsLight ? (theme.text || "#0A0A0A") : "#fff",
                  paddingTop: m.padY,
                  paddingBottom: m.padY,
                  paddingLeft: m.padX,
                  paddingRight: m.padX,
                  borderBottom: navIsLight ? "1px solid rgba(0,0,0,0.08)" : "none",
                }}
              >
                <div
                  className={`mx-auto flex w-full flex-wrap items-center gap-3 ${p.logoAlign === "center" ? "justify-center" : "justify-between"}`}
                  style={{ maxWidth: m.maxWidth }}
                >
                  {p.logoAlign === "right" && (
                    <nav className="kebu-site-nav__links flex flex-wrap" style={{ gap: m.gap, fontSize: m.fontPx }}>
                      {p.links.map((l) => renderNavLink(l))}
                    </nav>
                  )}
                  <div className={`flex ${logoJustify} ${p.logoAlign === "center" ? "w-full" : ""}`}>
                    {brandEl}
                  </div>
                  {p.logoAlign !== "right" && (
                    <nav className="kebu-site-nav__links flex flex-wrap" style={{ gap: m.gap, fontSize: m.fontPx }}>
                      {p.links.map((l) => renderNavLink(l))}
                    </nav>
                  )}
                </div>
              </header>,
            );
          }
          case "hero": {
            const raw = section.props as Record<string, unknown>;
            const device = editor?.editDevice ?? "desktop";
            const p = {
              heading: String(readDeviceOverride(raw, device, "heading") ?? ""),
              subheading: String(readDeviceOverride(raw, device, "subheading") ?? ""),
              buttonLabel: String(readDeviceOverride(raw, device, "buttonLabel") ?? ""),
              buttonHref: String(raw.buttonHref ?? "#"),
              align: String(raw.align ?? "center"),
              background: raw.background as string | undefined,
              image: raw.image as string | undefined,
              overlayOpacity: (raw.overlayOpacity as number | undefined) ?? 0.42,
              minHeight: (raw.minHeight as string | undefined) ?? "80vh",
            };
            const patchHero = (patch: Record<string, unknown>) =>
              applyDeviceAwarePatch(editor?.onPatchSection, sectionId, raw, device, patch);
            const hasImage = Boolean(p.image?.trim());
            const bg = p.background || theme.primary;
            const textColor = (() => {
              if (hasImage) return "#fff";
              const hex = String(bg || "").replace(/\s/g, "");
              if (hex.startsWith("#") && hex.length >= 7) {
                const r = parseInt(hex.slice(1, 3), 16);
                const g = parseInt(hex.slice(3, 5), 16);
                const b = parseInt(hex.slice(5, 7), 16);
                if ([r, g, b].every((n) => !Number.isNaN(n))) {
                  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
                  return luminance > 0.55 ? (theme.text || "#1F1A17") : "#fff";
                }
              }
              return "#fff";
            })();
            const heroIsLight = textColor !== "#fff";
            const isCenter = p.align === "center";
            return wrap(
              <section
                key={key}
                className="relative flex items-end overflow-hidden"
                style={{ minHeight: p.minHeight, background: hasImage ? "#111" : bg, color: textColor }}
              >
                {hasImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={supabaseImgUrl(p.image!, 1400)}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                    style={{ opacity: 0.88 }}
                    fetchPriority={idx === 0 ? "high" : "auto"}
                    decoding="async"
                  />
                ) : null}
                <div
                  className="absolute inset-0"
                  style={{
                    background: hasImage
                      ? `linear-gradient(to top, rgba(0,0,0,${(p.overlayOpacity + 0.28).toFixed(2)}) 0%, rgba(0,0,0,${(p.overlayOpacity * 0.2).toFixed(2)}) 60%, transparent 100%)`
                      : `linear-gradient(150deg, transparent 50%, rgba(0,0,0,0.1) 100%)`,
                  }}
                />
                <div className={`relative z-10 w-full px-6 pb-16 pt-32 sm:px-12 ${isCenter ? "text-center" : ""}`}>
                  <div className={isCenter ? "mx-auto max-w-2xl" : "max-w-2xl"}>
                    {device !== "desktop" && editor?.inlineEdit ? (
                      <p className="mb-2 text-[10px] uppercase tracking-wider opacity-60">
                        Editing {device} copy
                      </p>
                    ) : null}
                    <EditableText
                      tag="h1"
                      className="text-5xl font-bold leading-[1.04] tracking-tight sm:text-7xl"
                      style={{ fontFamily: cssFontStack(theme.fontDisplay) }}
                      value={p.heading}
                      editor={editor}
                      onChange={(heading) => patchHero({ heading })}
                    />
                    {p.subheading ? (
                      <EditableText
                        tag="p"
                        className="mt-5 text-base leading-relaxed sm:text-lg"
                        style={{ opacity: hasImage ? 0.85 : 0.72 }}
                        value={p.subheading}
                        editor={editor}
                        onChange={(subheading) => patchHero({ subheading })}
                      />
                    ) : null}
                    {p.buttonLabel ? (
                      <a
                        href={p.buttonHref || "#"}
                        className="mt-8 inline-block rounded-full px-8 py-3.5 text-sm font-bold tracking-wide transition-opacity hover:opacity-90"
                        style={{
                          background: heroIsLight ? theme.primary : "#fff",
                          color: heroIsLight ? "#fff" : "#0A0A0A",
                        }}
                      >
                        {p.buttonLabel}
                      </a>
                    ) : null}
                  </div>
                </div>
              </section>,
            );
          }
          case "text": {
            const raw = section.props as Record<string, unknown>;
            const device = editor?.editDevice ?? "desktop";
            const p = {
              heading: readDeviceOverride(raw, device, "heading") as string | undefined,
              body: String(readDeviceOverride(raw, device, "body") ?? ""),
            };
            const patchText = (patch: Record<string, unknown>) =>
              applyDeviceAwarePatch(editor?.onPatchSection, sectionId, raw, device, patch);
            return wrap(
              <section key={key} id={anchor} className="kebu-section px-5 sm:px-8 lg:px-16 scroll-mt-20">
                <div className="max-w-3xl">
                {device !== "desktop" && editor?.inlineEdit ? (
                  <p className="text-[10px] uppercase tracking-wider opacity-50 mb-2">Editing {device} copy</p>
                ) : null}
                {p.heading && (
                  <EditableText
                    tag="h2"
                    className="text-2xl font-bold mb-3"
                    style={{ fontFamily: cssFontStack(theme.fontDisplay) }}
                    value={p.heading}
                    editor={editor}
                    onChange={(heading) => patchText({ heading })}
                  />
                )}
                <EditableText
                  tag="p"
                  className="leading-relaxed opacity-80 whitespace-pre-wrap"
                  value={p.body}
                  editor={editor}
                  onChange={(body) => patchText({ body })}
                />
                </div>
              </section>,
            );
          }
          case "features": {
            const raw = section.props as Record<string, unknown>;
            const device = editor?.editDevice ?? "desktop";
            const layout = (raw.layout as "grid" | "moodboard" | undefined) ?? "grid";
            const heading = String(readDeviceOverride(raw, device, "heading") ?? "Features");
            const items =
              (readDeviceOverride(raw, device, "items") as
                | { title: string; body: string; href?: string; image?: string }[]
                | undefined) ?? [];
            const patchFeatures = (patch: Record<string, unknown>) =>
              applyDeviceAwarePatch(editor?.onPatchSection, sectionId, raw, device, patch);
            const moodboard = layout === "moodboard";
            return wrap(
              <section
                key={key}
                id={anchor}
                className="kebu-section px-5 sm:px-8 lg:px-16 scroll-mt-20"
              >
                {device !== "desktop" && editor?.inlineEdit ? (
                  <p className="text-[10px] uppercase tracking-wider opacity-50 mb-2">Editing {device} copy</p>
                ) : null}
                <EditableText
                  tag="h2"
                  className="text-2xl font-bold mb-6"
                  style={{ fontFamily: cssFontStack(theme.fontDisplay) }}
                  value={heading}
                  editor={editor}
                  onChange={(nextHeading) => patchFeatures({ heading: nextHeading })}
                />
                <div
                  className={
                    moodboard
                      ? "mays-world-moodboard"
                      : "grid sm:grid-cols-3 gap-6"
                  }
                >
                  {items.map((item, itemIdx) => {
                    const img = String(item.image ?? "").trim();
                    const accentColor = theme.accent || theme.primary;
                    const card = moodboard ? (
                      <>
                        {img ? (
                          <div className="mays-world-moodboard__media" aria-hidden>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={supabaseImgUrl(img, 800)} alt="" loading="lazy" decoding="async" />
                          </div>
                        ) : null}
                        <div className="mays-world-moodboard__copy">
                          <EditableText
                            tag="h2"
                            className="font-semibold mb-2 text-base"
                            value={item.title}
                            editor={editor}
                            onChange={(title) => {
                              const next = items.map((it, i) => (i === itemIdx ? { ...it, title } : it));
                              patchFeatures({ items: next });
                            }}
                          />
                          <EditableText
                            tag="p"
                            className="text-sm opacity-70"
                            value={item.body}
                            editor={editor}
                            onChange={(body) => {
                              const next = items.map((it, i) => (i === itemIdx ? { ...it, body } : it));
                              patchFeatures({ items: next });
                            }}
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        {img ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={supabaseImgUrl(img, 800)}
                            alt={item.title}
                            className="w-full rounded-xl object-cover mb-5"
                            style={{ height: 200 }}
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <div
                            className="mb-5 flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold"
                            style={{ background: `${accentColor}18`, color: accentColor }}
                          >
                            {String(itemIdx + 1).padStart(2, "0")}
                          </div>
                        )}
                        <EditableText
                          tag="h2"
                          className="font-semibold mb-2 text-lg leading-snug"
                          style={{ fontFamily: cssFontStack(theme.fontDisplay) }}
                          value={item.title}
                          editor={editor}
                          onChange={(title) => {
                            const next = items.map((it, i) => (i === itemIdx ? { ...it, title } : it));
                            patchFeatures({ items: next });
                          }}
                        />
                        <EditableText
                          tag="p"
                          className="text-sm leading-relaxed opacity-68"
                          value={item.body}
                          editor={editor}
                          onChange={(body) => {
                            const next = items.map((it, i) => (i === itemIdx ? { ...it, body } : it));
                            patchFeatures({ items: next });
                          }}
                        />
                        {item.href?.trim() && !editor?.inlineEdit ? (
                          <p className="mt-4 text-sm font-semibold" style={{ color: accentColor }}>
                            Learn more →
                          </p>
                        ) : null}
                      </>
                    );
                    const tileClass = moodboard
                      ? `mays-world-moodboard__tile mays-world-moodboard__tile--${(itemIdx % 6) + 1}`
                      : "rounded-2xl p-6";
                    const tileStyle = moodboard ? undefined : {
                      background: theme.surface || (theme.background === "#0A0A0A" || theme.background === "#0D0D0D" ? "#161616" : "#fff"),
                      border: "1px solid rgba(0,0,0,0.07)",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                    };
                    if (!moodboard && item.href?.trim() && !editor?.inlineEdit) {
                      return (
                        <a
                          key={`${item.title}-${itemIdx}`}
                          href={item.href.trim()}
                          className={`${tileClass} block transition-all hover:shadow-md`}
                          style={tileStyle}
                        >
                          {card}
                        </a>
                      );
                    }
                    return (
                      <div key={`${item.title}-${itemIdx}`} className={tileClass} style={tileStyle}>
                        {card}
                      </div>
                    );
                  })}
                </div>
              </section>,
            );
          }
          case "testimonials": {
            const p = section.props as { heading?: string; items?: { quote: string; name: string; role?: string }[] };
            const items = p.items ?? [];
            const accentColor = theme.accent || theme.primary;
            return wrap(
              <section key={key} id={anchor} className="kebu-section px-5 sm:px-8 lg:px-16 scroll-mt-20">
                <h2
                  className="text-2xl font-bold mb-10 tracking-tight"
                  style={{ fontFamily: cssFontStack(theme.fontDisplay) }}
                >
                  {p.heading || "What clients say"}
                </h2>
                <div className={`grid gap-5 ${items.length > 2 ? "sm:grid-cols-2 lg:grid-cols-3" : items.length === 2 ? "sm:grid-cols-2" : ""}`}>
                  {items.map((item, i) => (
                    <blockquote
                      key={`${item.name}-${i}`}
                      className="relative rounded-2xl p-7 overflow-hidden"
                      style={{
                        background: theme.surface || (theme.background === "#0A0A0A" ? "#1A1A1A" : "#fff"),
                        border: `1px solid ${accentColor}1A`,
                        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                      }}
                    >
                      <span
                        className="absolute top-2 left-4 text-8xl font-black leading-none select-none pointer-events-none"
                        style={{ color: accentColor, opacity: 0.12 }}
                        aria-hidden
                      >
                        "
                      </span>
                      <p className="relative text-[15px] leading-relaxed" style={{ opacity: 0.82 }}>
                        {item.quote}
                      </p>
                      <footer className="mt-5 flex items-center gap-3">
                        <div
                          className="h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-xs font-bold"
                          style={{ background: `${accentColor}22`, color: accentColor }}
                        >
                          {item.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <cite className="not-italic text-sm font-semibold block">{item.name}</cite>
                          {item.role ? <span className="text-xs opacity-55">{item.role}</span> : null}
                        </div>
                      </footer>
                    </blockquote>
                  ))}
                </div>
              </section>,
            );
          }
          case "faq": {
            const raw = section.props as Record<string, unknown>;
            const device = editor?.editDevice ?? "desktop";
            const heading = String(readDeviceOverride(raw, device, "heading") ?? "FAQ");
            const items =
              (readDeviceOverride(raw, device, "items") as
                | { question: string; answer: string }[]
                | undefined) ?? [];
            const patchFaq = (patch: Record<string, unknown>) =>
              applyDeviceAwarePatch(editor?.onPatchSection, sectionId, raw, device, patch);
            return wrap(
              <section key={key} id={anchor} className="kebu-section px-5 sm:px-8 lg:px-16 scroll-mt-20">
                <div className="max-w-3xl">
                {device !== "desktop" && editor?.inlineEdit ? (
                  <p className="text-[10px] uppercase tracking-wider opacity-50 mb-2">Editing {device} copy</p>
                ) : null}
                <EditableText
                  tag="h2"
                  className="text-2xl font-bold mb-6"
                  style={{ fontFamily: cssFontStack(theme.fontDisplay) }}
                  value={heading}
                  editor={editor}
                  onChange={(next) => patchFaq({ heading: next })}
                />
                <div className="space-y-4">
                  {items.map((item, itemIdx) => (
                    <div key={`${item.question}-${itemIdx}`}>
                      <EditableText
                        tag="p"
                        className="font-semibold"
                        value={item.question}
                        editor={editor}
                        onChange={(question) => {
                          const next = items.map((it, i) => (i === itemIdx ? { ...it, question } : it));
                          patchFaq({ items: next });
                        }}
                      />
                      <EditableText
                        tag="p"
                        className="text-sm opacity-70 mt-1"
                        value={item.answer}
                        editor={editor}
                        onChange={(answer) => {
                          const next = items.map((it, i) => (i === itemIdx ? { ...it, answer } : it));
                          patchFaq({ items: next });
                        }}
                      />
                    </div>
                  ))}
                </div>
                </div>
              </section>,
            );
          }
          case "products": {
            const raw = section.props as Record<string, unknown>;
            const device = editor?.editDevice ?? "desktop";
            const heading = String(readDeviceOverride(raw, device, "heading") ?? "Products");
            const patchProducts = (patch: Record<string, unknown>) =>
              applyDeviceAwarePatch(editor?.onPatchSection, sectionId, raw, device, patch);
            const liveSub =
              mode === "live" ? (liveSubdomain ?? liveSubdomainFromBase(siteBase)) : null;

            return wrap(
              <ProductsSection
                key={key}
                sectionId={sectionId}
                anchor={anchor}
                heading={heading}
                layout={raw.layout as "grid" | "grid-dense" | "list" | "featured" | "carousel" | undefined}
                columns={raw.columns as 2 | 3 | 4 | undefined}
                orderStyle={raw.orderStyle as "inline" | "sheet" | "card" | "minimal" | undefined}
                orderCtaLabel={raw.orderCtaLabel as string | undefined}
                fullWidth={raw.fullWidth as boolean | undefined}
                filterMode={raw.filterMode as "none" | "sidebar" | "horizontal" | undefined}
                filterFields={raw.filterFields as string[] | undefined}
                collections={raw.collections as ProductCollection[] | undefined}
                bannerImageUrl={raw.bannerImageUrl as string | undefined}
                bannerText={raw.bannerText as string | undefined}
                hoverZoom={raw.hoverZoom as boolean | undefined}
                items={(raw.items as import("@/app/components/create/products-section").ProductItem[] | undefined) ?? []}
                theme={theme}
                merchantPhone={merchantPhone}
                shopCommerce={shopCommerce}
                paymentLabels={paymentLabels}
                liveSubdomain={liveSub}
                projectId={projectId}
                patchSection={patchProducts}
                deviceLabel={device !== "desktop" && editor?.inlineEdit ? device : undefined}
              />,
            );
          }
          case "contact": {
            const cp = section.props as { heading?: string; subheading?: string; email?: string; phone?: string; address?: string; whatsapp?: string };
            return wrap(
              <section key={key} id={anchor} className="kebu-section px-5 sm:px-8 lg:px-16 scroll-mt-20">
                <div className="max-w-3xl">
                  <EditableText
                    tag="h2"
                    className="text-2xl sm:text-3xl font-bold mb-2"
                    value={cp.heading || "Contact"}
                    editor={editor}
                    onChange={(heading) => editor?.onPatchSection?.(sectionId, { heading })}
                  />
                  {cp.subheading && (
                    <EditableText
                      tag="p"
                      className="text-base opacity-70 mb-6"
                      value={cp.subheading}
                      editor={editor}
                      onChange={(subheading) => editor?.onPatchSection?.(sectionId, { subheading })}
                    />
                  )}
                  <div className="grid gap-3 sm:grid-cols-2">
                    {cp.whatsapp && (
                      <a
                        href={`https://wa.me/${cp.whatsapp.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 rounded-xl px-4 py-3 font-medium text-sm transition-opacity hover:opacity-80"
                        style={{ background: "#25D366", color: "#fff" }}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.1.546 4.072 1.5 5.786L.057 23.571l5.93-1.558A11.952 11.952 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.888 0-3.657-.52-5.163-1.424l-.37-.22-3.52.925.938-3.437-.24-.386A10.001 10.001 0 0112 2c5.514 0 10 4.486 10 10s-4.486 10-10 10z"/></svg>
                        WhatsApp
                      </a>
                    )}
                    {cp.email && (
                      <a
                        href={`mailto:${cp.email}`}
                        className="flex items-center gap-3 rounded-xl px-4 py-3 font-medium text-sm border transition-opacity hover:opacity-80"
                        style={{ borderColor: "rgba(0,0,0,0.12)", color: "inherit" }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                        {cp.email}
                      </a>
                    )}
                    {cp.phone && (
                      <a
                        href={`tel:${cp.phone}`}
                        className="flex items-center gap-3 rounded-xl px-4 py-3 font-medium text-sm border transition-opacity hover:opacity-80"
                        style={{ borderColor: "rgba(0,0,0,0.12)", color: "inherit" }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.81a19.79 19.79 0 01-3.07-8.68A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.18 6.18l1.27-.36a2 2 0 012.11.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                        {cp.phone}
                      </a>
                    )}
                    {cp.address && (
                      <div className="flex items-start gap-3 rounded-xl px-4 py-3 text-sm border" style={{ borderColor: "rgba(0,0,0,0.12)" }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0" aria-hidden><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        <span className="opacity-80">{cp.address}</span>
                      </div>
                    )}
                    {!cp.email && !cp.phone && !cp.address && !cp.whatsapp && (
                      <p className="text-sm opacity-50 col-span-2">Contact details coming soon.</p>
                    )}
                  </div>
                </div>
              </section>,
            );
          }
          case "form": {
            const p = section.props as import("@/lib/create/site-forms").SiteFormSectionProps;
            const liveSubForm =
              mode === "live" ? (liveSubdomain ?? liveSubdomainFromBase(siteBase)) : undefined;
            return wrap(
              <section key={key} id={anchor} className="kebu-section px-5 sm:px-8 lg:px-16 scroll-mt-20">
                <div className="max-w-3xl">
                <EditableText
                  tag="h2"
                  className="text-2xl font-bold mb-2"
                  value={p.heading || "Contact us"}
                  editor={editor}
                  onChange={(heading) => editor?.onPatchSection?.(sectionId, { heading })}
                />
                <EditableText
                  tag="p"
                  className="text-sm opacity-70 mb-2"
                  value={p.subheading || ""}
                  editor={editor}
                  onChange={(subheading) => editor?.onPatchSection?.(sectionId, { subheading })}
                />
                <SiteFormSection
                  sectionId={sectionId}
                  subdomain={liveSubForm}
                  props={p}
                  preview={mode !== "live"}
                />
                </div>
              </section>,
            );
          }
          case "blog-list": {
            const p = section.props as {
              heading?: string;
              subheading?: string;
              postsPerPage?: number;
            };
            const liveSubBlog =
              mode === "live" ? (liveSubdomain ?? liveSubdomainFromBase(siteBase)) : liveSubdomain;
            return wrap(
              <SiteBlogSection
                key={key}
                heading={p.heading || "Blog"}
                subheading={p.subheading || ""}
                postsPerPage={p.postsPerPage ?? 6}
                siteBase={siteBase}
                subdomain={liveSubBlog ?? undefined}
                preview={mode === "preview"}
              />,
            );
          }
          case "newsletter": {
            const p = section.props as {
              heading?: string;
              subheading?: string;
              buttonLabel?: string;
              successMessage?: string;
            };
            return wrap(
              <NewsletterSignup
                key={key}
                projectId={mode === "live" ? projectId : undefined}
                preview={mode === "preview"}
                heading={p.heading || "Stay in the loop"}
                subheading={p.subheading || "Get updates by email."}
                buttonLabel={p.buttonLabel || "Subscribe"}
                successMessage={p.successMessage || "Thanks — you're on the list."}
              />,
            );
          }
          case "email-popup": {
            // Overlay mounts once at root — show a builder placeholder only.
            if (mode !== "preview") return null;
            return wrap(
              <section
                key={key}
                className="kebu-section mx-5 my-4 rounded-xl border border-dashed px-4 py-6 text-center text-sm opacity-70"
                style={{ borderColor: "#DDE0F0" }}
              >
                Email / consent popup (shows as overlay on the live site)
              </section>,
            );
          }
          case "whatsapp": {
            const p = section.props as { label?: string; phone: string; message?: string };
            const phone = p.phone.replace(/\D/g, "");
            const href = `https://wa.me/${phone}${p.message ? `?text=${encodeURIComponent(p.message)}` : ""}`;
            return wrap(
              <section key={key} id={anchor} className="kebu-section px-5 text-center scroll-mt-20">
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block rounded-full px-6 py-3 text-sm font-bold"
                  style={{ background: "#25D366", color: "#fff" }}
                >
                  {p.label || "WhatsApp"}
                </a>
              </section>,
            );
          }
          case "joko": {
            const p = section.props as { label?: string; phone?: string; jokoPayLink?: string; message?: string };
            const phone = (p.phone ?? "").replace(/\D/g, "");
            const href = p.jokoPayLink?.trim()
              ? p.jokoPayLink.trim()
              : phone
                ? `https://joko.com/pay/${phone}`
                : "#";
            return wrap(
              <section key={key} id={anchor} className="kebu-section px-5 text-center scroll-mt-20">
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold"
                  style={{ background: "#0070F3", color: "#fff" }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
                    <path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" />
                  </svg>
                  {p.label || "Payer via Joko"}
                </a>
              </section>,
            );
          }
          case "image": {
            const p = section.props as { src?: string; alt?: string; caption?: string };
            if (!p.src) return null;
            return wrap(
              <figure key={key} className="kebu-section px-5 sm:px-8 lg:px-16">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={supabaseImgUrl(p.src, 1200)}
                  alt={p.alt || ""}
                  className="w-full rounded-2xl"
                  loading="lazy"
                  decoding="async"
                />
                {p.caption && <figcaption className="text-xs mt-2 opacity-60">{p.caption}</figcaption>}
              </figure>,
            );
          }
          case "gallery": {
            const p = section.props as {
              heading?: string;
              items?: { src: string; alt?: string; href?: string }[];
              layout?: "grid" | "single" | "featured";
              columns?: 1 | 2 | 3;
            };
            const rawItems = p.items ?? [];
            const items = rawItems.filter((item) => item.src);
            const editingGallery = Boolean(editor?.inlineEdit);
            if (!items.length && !editingGallery) return null;
            const layout = p.layout ?? "grid";
            const columns = p.columns ?? 3;
            if (editingGallery && rawItems.some((i) => !i.src)) {
              return wrap(
                <section key={key} id={anchor} className="px-5 sm:px-8 lg:px-16 py-8 scroll-mt-20 space-y-4">
                  {p.heading ? (
                    <h2 className="text-2xl font-bold" style={{ fontFamily: cssFontStack(theme.fontDisplay) }}>
                      {p.heading}
                    </h2>
                  ) : null}
                  <p className="text-xs opacity-60">
                    Photo slots — upload in Media, then drop onto a slot or set the image URL in Content.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {rawItems.map((item, i) =>
                      item.src ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={`g-${i}`}
                          src={item.src}
                          alt={item.alt || ""}
                          className="rounded-xl w-full object-cover aspect-square"
                        />
                      ) : (
                        <div
                          key={`g-empty-${i}`}
                          className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-black/25 bg-black/[0.03] text-center text-[11px] opacity-60"
                        >
                          Empty slot {i + 1}
                          <br />
                          Drop photo here
                        </div>
                      ),
                    )}
                  </div>
                </section>,
              );
            }
            if (layout === "single") {
              const first = items[0]!;
              return wrap(
                <section key={key} id={anchor} className="px-5 sm:px-8 lg:px-16 py-8 scroll-mt-20 space-y-4">
                  {p.heading ? (
                    <h2 className="text-2xl font-bold" style={{ fontFamily: cssFontStack(theme.fontDisplay) }}>
                      {p.heading}
                    </h2>
                  ) : null}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={supabaseImgUrl(first.src, 1200)}
                    alt={first.alt || ""}
                    className="w-full rounded-2xl object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                </section>,
              );
            }
            const featured = layout === "featured" && items.length > 1;
            const rest = featured ? items.slice(1) : items;
            const colClass =
              columns === 1
                ? ""
                : columns === 2
                  ? "sm:grid-cols-2"
                  : "sm:grid-cols-2 lg:grid-cols-3";
            return wrap(
              <section key={key} id={anchor} className="px-5 sm:px-8 lg:px-16 py-8 scroll-mt-20 space-y-4">
                {p.heading ? (
                  <h2 className="text-2xl font-bold" style={{ fontFamily: cssFontStack(theme.fontDisplay) }}>
                    {p.heading}
                  </h2>
                ) : null}
                {featured ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={supabaseImgUrl(items[0]!.src, 1400)}
                    alt={items[0]!.alt || ""}
                    className="w-full rounded-2xl object-cover max-h-[28rem]"
                    loading="lazy"
                    decoding="async"
                  />
                ) : null}
                <div className={`grid gap-3 ${colClass}`}>
                  {rest.map((item, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={`${item.src}-${i}`}
                      src={supabaseImgUrl(item.src, 800)}
                      alt={item.alt || ""}
                      className="rounded-xl w-full object-cover aspect-square"
                      loading="lazy"
                      decoding="async"
                    />
                  ))}
                </div>
              </section>,
            );
          }
          case "video": {
            const p = section.props as {
              heading?: string;
              src?: string;
              title?: string;
              caption?: string;
              thumbnail?: string;
              layout?: "grid" | "single" | "featured" | "fullscreen";
              columns?: 1 | 2 | 3;
              fullWidth?: boolean;
              items?: { src?: string; title?: string; caption?: string; thumbnail?: string }[];
            };
            const fromItems = (p.items ?? [])
              .map((it) => ({
                src: String(it.src ?? "").trim(),
                title: it.title,
                caption: it.caption,
                thumbnail: it.thumbnail,
              }))
              .filter((it) => it.src || it.thumbnail || it.title);
            const legacy =
              p.src?.trim()
                ? [{ src: p.src.trim(), title: p.title, caption: p.caption, thumbnail: p.thumbnail }]
                : [];
            const videos = fromItems.length ? fromItems : legacy;
            if (!videos.length) return null;
            const videoFullWidth = Boolean(p.fullWidth) || p.layout === "fullscreen";
            return wrap(
              <section
                key={key}
                id={anchor}
                className={`kebu-heavy-media py-12 scroll-mt-20${videoFullWidth ? "" : " px-5 sm:px-8 lg:px-16"}${dataMode === "ultra" || dataMode === "offline" ? " kebu-mode-hide-video" : ""}`}
              >
                {p.heading && (
                  <h2 className={`text-2xl font-bold mb-6 ${videoFullWidth ? "px-5" : ""}`} style={{ fontFamily: cssFontStack(theme.fontDisplay) }}>
                    {p.heading}
                  </h2>
                )}
                {dataMode === "ultra" || dataMode === "offline" ? (
                  <p className="text-sm opacity-70 px-5">
                    Video hidden in {dataMode === "ultra" ? "Ultra" : "Offline"} mode to save data. Switch to Data
                    Saver or Normal to play.
                  </p>
                ) : (
                  <VideoGrid
                    videos={videos}
                    layout={p.layout ?? (videos.length > 1 ? "grid" : "single")}
                    columns={p.columns ?? 2}
                    fullWidth={videoFullWidth}
                  />
                )}
              </section>,
            );
          }
          case "audio": {
            const p = section.props as { heading?: string; src: string; title?: string; artist?: string };
            if (!p.src) return null;
            const src = p.src.trim();
            const isHosted = isDirectAudioUrl(src);
            const spotifyEmbed = !isHosted && src.includes("open.spotify.com")
              ? src.replace("open.spotify.com/", "open.spotify.com/embed/")
              : null;
            return wrap(
              <section key={key} id={anchor} className="px-5 sm:px-8 lg:px-16 py-12 scroll-mt-20"><div className="max-w-2xl">
                {p.heading && <h2 className="text-2xl font-bold mb-4">{p.heading}</h2>}
                {(p.title || p.artist) && (
                  <p className="text-sm opacity-70 mb-3">
                    {p.title}
                    {p.artist ? ` · ${p.artist}` : ""}
                  </p>
                )}
                {isHosted ? (
                  // eslint-disable-next-line jsx-a11y/media-has-caption
                  <audio controls preload="metadata" className="w-full" src={src} />
                ) : spotifyEmbed ? (
                  <iframe
                    src={spotifyEmbed}
                    title={p.title || "Audio"}
                    className="w-full rounded-xl"
                    style={{ height: 152, border: 0 }}
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    loading="lazy"
                  />
                ) : (
                  <iframe
                    src={src}
                    title={p.title || "Audio embed"}
                    className="w-full rounded-xl"
                    style={{ height: 166, border: 0 }}
                    allow="autoplay"
                    loading="lazy"
                  />
                )}
              </div></section>,
            );
          }
          case "free-text": {
            const p = section.props as {
              heading?: string;
              minHeight?: number;
              backgroundImage?: string;
              blocks?: {
                id: string;
                text: string;
                x: number;
                y: number;
                width: number;
                fontSize: "sm" | "md" | "lg" | "xl" | "hero";
                align: "left" | "center" | "right";
                color?: string;
                fontFamily?: string;
              }[];
            };
            const fontSizeMap = { sm: "0.875rem", md: "1rem", lg: "1.25rem", xl: "1.75rem", hero: "2.5rem" };
            return wrap(
              <section
                key={key}
                id={anchor}
                className="relative w-full scroll-mt-20 overflow-hidden"
                style={{
                  minHeight: p.minHeight ?? 420,
                  background: p.backgroundImage
                    ? `center/cover no-repeat url(${p.backgroundImage})`
                    : theme.background,
                }}
              >
                {p.heading ? (
                  <p className="absolute top-3 left-4 text-[10px] font-bold uppercase tracking-wider opacity-40 z-10">
                    {p.heading}
                  </p>
                ) : null}
                {(p.blocks ?? []).map((block) => (
                  <div
                    key={block.id}
                    className="absolute px-2 select-none"
                    style={{
                      left: `${block.x}%`,
                      top: `${block.y}%`,
                      width: `${block.width}%`,
                      textAlign: block.align,
                      fontSize: fontSizeMap[block.fontSize] ?? fontSizeMap.md,
                      fontFamily: block.fontFamily
                        ? cssFontStack(block.fontFamily)
                        : cssFontStack(theme.fontDisplay),
                      color: block.color || theme.text,
                      cursor: editor ? "grab" : "default",
                      touchAction: editor ? "none" : undefined,
                      userSelect: editor ? "none" : undefined,
                    }}
                    onPointerDown={(e) => {
                      if (!editor?.onMoveFreeTextBlock) return;
                      // Double-click / text edit: don't start drag when targeting focused editable
                      if ((e.target as HTMLElement).isContentEditable) return;
                      if ((e.target as HTMLElement).dataset?.resize === "1") return;
                      e.stopPropagation();
                      e.preventDefault();
                      const parent = e.currentTarget.offsetParent as HTMLElement | null;
                      if (!parent) return;
                      const el = e.currentTarget;
                      try {
                        el.setPointerCapture(e.pointerId);
                      } catch {
                        /* ignore */
                      }
                      const startX = e.clientX;
                      const startY = e.clientY;
                      const originX = block.x;
                      const originY = block.y;
                      let lastX = originX;
                      let lastY = originY;
                      let didMove = false;
                      function onMove(ev: PointerEvent) {
                        const rect = parent!.getBoundingClientRect();
                        const dx = ((ev.clientX - startX) / rect.width) * 100;
                        const dy = ((ev.clientY - startY) / rect.height) * 100;
                        if (Math.abs(dx) + Math.abs(dy) > 0.5) didMove = true;
                        lastX = Math.min(95, Math.max(0, originX + dx));
                        lastY = Math.min(95, Math.max(0, originY + dy));
                        el.style.left = `${lastX}%`;
                        el.style.top = `${lastY}%`;
                      }
                      function onUp(ev: PointerEvent) {
                        window.removeEventListener("pointermove", onMove);
                        window.removeEventListener("pointerup", onUp);
                        window.removeEventListener("pointercancel", onUp);
                        try {
                          el.releasePointerCapture(ev.pointerId);
                        } catch {
                          /* ignore */
                        }
                        if (didMove) {
                          editor?.onMoveFreeTextBlock?.(sectionId, block.id, lastX, lastY);
                        }
                      }
                      window.addEventListener("pointermove", onMove);
                      window.addEventListener("pointerup", onUp);
                      window.addEventListener("pointercancel", onUp);
                    }}
                  >
                    <EditableText
                      tag="p"
                      className="leading-snug whitespace-pre-wrap"
                      value={block.text}
                      editor={editor}
                      onChange={(text) => {
                        const blocks = (p.blocks ?? []).map((b) =>
                          b.id === block.id ? { ...b, text } : b,
                        );
                        editor?.onPatchSection?.(sectionId, { blocks });
                      }}
                    />
                    {editor ? (
                      <button
                        type="button"
                        data-resize="1"
                        aria-label="Scale text"
                        className="absolute -bottom-1 -right-1 h-5 w-5 cursor-nwse-resize rounded-full border-2 border-white bg-[#FF5500]"
                        style={{ touchAction: "none" }}
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          const parent = (e.currentTarget.parentElement?.offsetParent ??
                            null) as HTMLElement | null;
                          if (!parent) return;
                          const startX = e.clientX;
                          const originW = block.width;
                          const parentW = parent.getBoundingClientRect().width;
                          const onMove = (ev: PointerEvent) => {
                            const delta = ((ev.clientX - startX) / parentW) * 100;
                            const nextW = Math.min(90, Math.max(8, originW + delta));
                            const blocks = (p.blocks ?? []).map((b) =>
                              b.id === block.id ? { ...b, width: nextW } : b,
                            );
                            editor?.onPatchSection?.(sectionId, { blocks });
                          };
                          const onUp = () => {
                            window.removeEventListener("pointermove", onMove);
                            window.removeEventListener("pointerup", onUp);
                          };
                          window.addEventListener("pointermove", onMove);
                          window.addEventListener("pointerup", onUp);
                        }}
                      />
                    ) : null}
                  </div>
                ))}
              </section>,
            );
          }
          case "map": {
            const p = section.props as {
              heading?: string;
              address?: string;
              latitude: number;
              longitude: number;
              zoom?: number;
            };
            const z = p.zoom ?? 14;
            const bbox = `${p.longitude - 0.02},${p.latitude - 0.02},${p.longitude + 0.02},${p.latitude + 0.02}`;
            const embed = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${p.latitude}%2C${p.longitude}`;
            return (
              <section key={key} id={anchor} className="px-5 sm:px-8 lg:px-16 py-12 scroll-mt-20">
                <h2 className="text-2xl font-bold mb-2">{p.heading || "Find us"}</h2>
                {p.address && <p className="text-sm opacity-70 mb-4">{p.address}</p>}
                <iframe
                  title={p.heading || "Map"}
                  src={embed}
                  className="w-full rounded-2xl border border-black/10"
                  style={{ height: 320 }}
                  loading="lazy"
                />
              </section>
            );
          }
          case "events": {
            const p = section.props as {
              heading?: string;
              items?: {
                title: string;
                date: string;
                location?: string;
                description?: string;
                ticketUrl?: string;
              }[];
            };
            const items = p.items ?? [];
            if (!items.length) return null;
            return (
              <section key={key} id={anchor} className="px-5 sm:px-8 lg:px-16 py-12 scroll-mt-20">
                <h2 className="text-2xl font-bold mb-6">{p.heading || "Events"}</h2>
                <ul className="space-y-4">
                  {items.map((ev) => (
                    <li
                      key={`${ev.title}-${ev.date}`}
                      className="rounded-2xl p-5"
                      style={{ background: "#fff", border: "1px solid #E8E6DF" }}
                    >
                      <p className="text-xs font-bold uppercase tracking-wider opacity-50">{ev.date}</p>
                      <h3 className="font-semibold text-lg mt-1">{ev.title}</h3>
                      {ev.location && <p className="text-sm opacity-70 mt-1">{ev.location}</p>}
                      {ev.description && <p className="text-sm opacity-80 mt-2">{ev.description}</p>}
                      {ev.ticketUrl && ev.ticketUrl !== "#" && (
                        <a
                          href={ev.ticketUrl}
                          className="inline-block mt-3 text-sm font-bold"
                          style={{ color: theme.primary }}
                        >
                          Tickets / RSVP →
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            );
          }
          case "footer": {
            const p = section.props as {
              text?: string;
              legalName?: string;
              copyrightYear?: number;
              fontFamily?: string;
              links?: { label: string; href: string }[];
              bgColor?: string;
              textColor?: string;
            };
            const hasCustomBg = Boolean(p.bgColor);
            const copyrightLine = p.text ||
              (p.legalName
                ? `© ${p.copyrightYear ?? new Date().getFullYear()} ${p.legalName}`
                : p.copyrightYear
                ? `© ${p.copyrightYear}`
                : "");
            return (
              <footer
                key={key}
                className={`px-4 sm:px-5 py-8 mt-8 text-center text-sm${hasCustomBg ? "" : " opacity-60"}`}
                style={{
                  borderTop: "1px solid #E8E6DF",
                  background: p.bgColor || undefined,
                  color: p.textColor || undefined,
                  fontFamily: p.fontFamily || undefined,
                }}
              >
                {copyrightLine ? <p>{copyrightLine}</p> : null}
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-2">
                  {(p.links ?? []).map((l) => (
                    <a key={l.label} href={l.href} style={{ color: p.textColor ? "inherit" : undefined }}>
                      {l.label}
                    </a>
                  ))}
                </div>
              </footer>
            );
          }
          case "announcement-bar": {
            const p = section.props as {
              text?: string;
              background?: string;
              color?: string;
              link?: string;
              paddingTop?: number;
              paddingBottom?: number;
            };
            const padY = `${p.paddingTop ?? 10}px`;
            const padYB = `${p.paddingBottom ?? 10}px`;
            const inner = (
              <p className="text-xs font-medium tracking-wide text-center leading-tight">
                {p.text || "Welcome — free shipping on orders over 10,000 XOF"}
              </p>
            );
            return wrap(
              <div
                key={key}
                style={{
                  background: p.background || theme.primary,
                  color: p.color || "#fff",
                  paddingTop: padY,
                  paddingBottom: padYB,
                  paddingLeft: "1rem",
                  paddingRight: "1rem",
                }}
              >
                {p.link ? (
                  <a href={p.link} className="block hover:opacity-90">
                    {inner}
                  </a>
                ) : (
                  inner
                )}
              </div>,
            );
          }
          case "marquee": {
            const p = section.props as {
              items?: string[];
              speed?: number;
              background?: string;
              color?: string;
              separator?: string;
            };
            const items = p.items?.length
              ? p.items
              : ["New arrivals", "Shop now", "Free delivery", "Made in Africa"];
            const sep = p.separator ?? " · ";
            const text = items.join(sep) + sep;
            const duration = `${p.speed ?? 28}s`;
            return wrap(
              <div
                key={key}
                className="overflow-hidden py-3"
                style={{ background: p.background || theme.primary, color: p.color || "#fff" }}
              >
                <style>{`@keyframes kebu-marquee{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}`}</style>
                <div
                  style={{
                    display: "flex",
                    whiteSpace: "nowrap",
                    animation: `kebu-marquee ${duration} linear infinite`,
                    width: "max-content",
                  }}
                >
                  <span className="pr-8 text-sm font-semibold tracking-wide">{text}</span>
                  <span aria-hidden className="pr-8 text-sm font-semibold tracking-wide">{text}</span>
                  <span aria-hidden className="pr-8 text-sm font-semibold tracking-wide">{text}</span>
                  <span aria-hidden className="pr-8 text-sm font-semibold tracking-wide">{text}</span>
                </div>
              </div>,
            );
          }
          case "editorial-hero": {
            const raw = section.props as Record<string, unknown>;
            const device = editor?.editDevice ?? "desktop";
            const p = {
              heading: String(readDeviceOverride(raw, device, "heading") ?? "Your headline here"),
              subheading: String(readDeviceOverride(raw, device, "subheading") ?? ""),
              buttonLabel: String(readDeviceOverride(raw, device, "buttonLabel") ?? ""),
              buttonHref: String(raw.buttonHref ?? "#"),
              image: String(raw.image ?? ""),
              overlayOpacity: (raw.overlayOpacity as number | undefined) ?? 0.35,
              align: (raw.align as "left" | "center" | undefined) ?? "left",
              minHeight: (raw.minHeight as string | undefined) ?? "70vh",
            };
            const patchHero = (patch: Record<string, unknown>) =>
              applyDeviceAwarePatch(editor?.onPatchSection, sectionId, raw, device, patch);
            const overlayBg = `rgba(0,0,0,${p.overlayOpacity})`;
            const contentMaxW = p.align === "center" ? "max-w-2xl mx-auto text-center" : "max-w-2xl";
            return wrap(
              <section
                key={key}
                className="relative flex items-end overflow-hidden"
                style={{ minHeight: p.minHeight, background: "#111" }}
              >
                {p.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.image}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                    style={{ opacity: 1 - p.overlayOpacity * 0.3 }}
                  />
                ) : (
                  <div className="absolute inset-0" style={{ background: theme.primary }} />
                )}
                <div className="absolute inset-0" style={{ background: overlayBg }} />
                <div className={`relative z-10 w-full px-8 pb-16 pt-32 ${p.align === "center" ? "text-center" : ""}`}>
                  <div className={contentMaxW}>
                    {device !== "desktop" && editor?.inlineEdit ? (
                      <p className="mb-2 text-[10px] uppercase tracking-wider text-white/60">
                        Editing {device} copy
                      </p>
                    ) : null}
                    <EditableText
                      tag="h1"
                      className="text-4xl font-bold leading-tight text-white sm:text-6xl"
                      style={{ fontFamily: cssFontStack(theme.fontDisplay) }}
                      value={p.heading}
                      editor={editor}
                      onChange={(heading) => patchHero({ heading })}
                    />
                    {p.subheading ? (
                      <EditableText
                        tag="p"
                        className="mt-5 text-base text-white/80 sm:text-lg"
                        value={p.subheading}
                        editor={editor}
                        onChange={(subheading) => patchHero({ subheading })}
                      />
                    ) : null}
                    {p.buttonLabel ? (
                      <a
                        href={p.buttonHref || "#"}
                        className="mt-8 inline-block rounded-full px-7 py-3 text-sm font-bold transition-opacity hover:opacity-90"
                        style={{ background: "#fff", color: "#000" }}
                      >
                        {p.buttonLabel}
                      </a>
                    ) : null}
                  </div>
                </div>
              </section>,
            );
          }
          case "split": {
            const raw = section.props as Record<string, unknown>;
            const device = editor?.editDevice ?? "desktop";
            const p = {
              heading: String(readDeviceOverride(raw, device, "heading") ?? "Your heading"),
              body: String(readDeviceOverride(raw, device, "body") ?? ""),
              buttonLabel: String(readDeviceOverride(raw, device, "buttonLabel") ?? ""),
              buttonHref: String(raw.buttonHref ?? "#"),
              image: String(raw.image ?? ""),
              imagePosition: (raw.imagePosition as "left" | "right" | undefined) ?? "left",
              background: (raw.background as string | undefined) ?? "",
            };
            const patchSplit = (patch: Record<string, unknown>) =>
              applyDeviceAwarePatch(editor?.onPatchSection, sectionId, raw, device, patch);
            const imgEl = p.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={p.image}
                alt=""
                className="h-full w-full object-cover"
                style={{ minHeight: 320, maxHeight: 560 }}
              />
            ) : (
              <div
                className="flex items-center justify-center text-center text-xs opacity-40"
                style={{ minHeight: 320, background: theme.primary + "22" }}
              >
                {editor ? "No image — set in section props" : null}
              </div>
            );
            const textEl = (
              <div className="flex flex-col justify-center px-8 py-14">
                {device !== "desktop" && editor?.inlineEdit ? (
                  <p className="mb-2 text-[10px] uppercase tracking-wider opacity-50">Editing {device}</p>
                ) : null}
                <EditableText
                  tag="h2"
                  className="text-3xl font-bold leading-tight"
                  style={{ fontFamily: cssFontStack(theme.fontDisplay) }}
                  value={p.heading}
                  editor={editor}
                  onChange={(heading) => patchSplit({ heading })}
                />
                {p.body ? (
                  <EditableText
                    tag="p"
                    className="mt-4 text-base leading-relaxed opacity-70"
                    value={p.body}
                    editor={editor}
                    onChange={(body) => patchSplit({ body })}
                  />
                ) : null}
                {p.buttonLabel ? (
                  <a
                    href={p.buttonHref || "#"}
                    className="kebu-cta mt-8 self-start inline-block rounded-full px-6 py-2.5 text-sm font-bold"
                  >
                    {p.buttonLabel}
                  </a>
                ) : null}
              </div>
            );
            return wrap(
              <section
                key={key}
                className="overflow-hidden"
                style={{ background: p.background || "transparent" }}
              >
                <div className="grid md:grid-cols-2">
                  {p.imagePosition === "right" ? (
                    <>
                      {textEl}
                      {imgEl}
                    </>
                  ) : (
                    <>
                      {imgEl}
                      {textEl}
                    </>
                  )}
                </div>
              </section>,
            );
          }
          case "category-tiles": {
            const p = section.props as {
              title?: string;
              items?: { label: string; image?: string; href?: string }[];
              columns?: 2 | 3 | 4;
              background?: string;
              tileBackground?: string;
              tileColor?: string;
            };
            const items = p.items?.length
              ? p.items
              : [
                  { label: "Women", href: "#" },
                  { label: "Men", href: "#" },
                  { label: "Kids", href: "#" },
                ];
            const cols = p.columns ?? 3;
            const colClass = cols === 2 ? "grid-cols-2" : cols === 4 ? "grid-cols-2 md:grid-cols-4" : "grid-cols-2 md:grid-cols-3";
            return wrap(
              <section
                key={key}
                className="py-10 px-5 sm:px-8 lg:px-16"
                style={{ background: p.background || "transparent" }}
              >
                {p.title ? (
                  <h2
                    className="mb-6 text-center text-xl font-bold tracking-tight"
                    style={{ fontFamily: cssFontStack(theme.fontDisplay) }}
                  >
                    {p.title}
                  </h2>
                ) : null}
                <div className={`grid gap-3 ${colClass}`}>
                  {items.map((item, i) => (
                    <a
                      key={i}
                      href={item.href || "#"}
                      className="group relative overflow-hidden rounded-xl"
                      style={{ aspectRatio: "4/5" }}
                    >
                      {item.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.image}
                          alt={item.label}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div
                          className="h-full w-full"
                          style={{ background: p.tileBackground || theme.primary + "18" }}
                        />
                      )}
                      <div
                        className="absolute inset-x-0 bottom-0 p-4"
                        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.6), transparent)" }}
                      >
                        <p
                          className="text-sm font-bold tracking-wide"
                          style={{ color: p.tileColor || "#fff" }}
                        >
                          {item.label}
                        </p>
                      </div>
                    </a>
                  ))}
                </div>
              </section>,
            );
          }
          default:
            return null;
        }
      })();
      return (
        <Fragment key={key}>
          {renderDivider(idx === 0 ? null : visibleSections[idx - 1]?.id ?? null)}
          {sectionEl}
        </Fragment>
      );
    })}
            {showInlineStack && visibleSections.length > 0
              ? renderDivider(visibleSections[visibleSections.length - 1]?.id ?? null)
              : null}
          </>
        );
      })()}
      {motionSite && motionHero ? (
        <MaylecorSiteFooter
          brandLabel={motionHero.brandLabel ?? motionHero.title}
          accentColor={motionHero.accentColor}
          socialLinks={motionHero.socialLinks}
          siteBase={siteBase}
        />
      ) : null}
    </>
  );

  return (
    <div
      className={`${rootClass} relative${sideNav ? " md:flex md:flex-row md:items-stretch" : ""}${
        editingPreview && legallyBlondeOnly ? " flex h-full min-h-0 flex-col" : ""
      }`}
      data-kebu-button={theme.buttonStyle ?? "solid"}
      style={{
        ...themeVars,
        ...shellStyle,
        width: "100%",
        maxWidth: "100%",
        overflowX: "clip" as const,
      }}
    >
      <SiteThemeFonts
        fontDisplay={theme.fontDisplay}
        fontBody={theme.fontBody}
        extraFamilies={freeTextExtraFonts}
        loadRemote={!preferSystemFonts(dataMode)}
      />
      {theme.customCss ? <style>{theme.customCss}</style> : null}
      {chrome}
      {sideNav ? <div className="min-w-0 flex-1">{body}</div> : body}
      {emailPopup && emailPopup.props.enabled !== false ? (
        <SiteEmailPopup
          projectId={mode === "live" ? projectId : undefined}
          sectionId={emailPopup.sectionId}
          preview={mode === "preview"}
          props={emailPopup.props}
        />
      ) : null}
      {(() => {
        const cartSub =
          mode === "live" ? (liveSubdomain ?? liveSubdomainFromBase(siteBase)) : null;
        const shopReady = definitionHasShop(definition);
        return cartSub && shopReady && !editor ? (
          <PublicShopCart subdomain={cartSub} commerce={shopCommerce} preview={false} />
        ) : null;
      })()}
    </div>
  );
}
