"use client";

import type { CSSProperties, ReactNode } from "react";
import type { WebsiteDefinition } from "@/lib/create/website-schema";
import { VideoEmbed } from "@/app/components/video-embed";
import { NewsletterSignup } from "@/app/components/create/newsletter-signup";
import {
  isDirectAudioUrl,
  isDirectVideoUrl,
} from "@/lib/create/site-asset-upload";
import {
  jokoCheckoutAvailable,
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
import {
  KdirectionHomeLayout,
  KdirectionPageLayout,
  type KdirectionHomeProps,
  type KdirectionPageProps,
} from "@/app/components/create/kdirection-layout";
import { MaylecorMotionChrome } from "@/app/components/create/maylecor-motion-chrome";
import { MaylecorSiteFooter } from "@/app/components/create/maylecor-site-footer";
import { KEBU_SITE_ROOT_CLASS } from "@/lib/create/site-responsive";
import "./kebu-site-responsive.css";

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
    case "whatsapp":
      return "whatsapp";
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
};

function wrapEditorSection(
  sectionId: string | undefined,
  editor: SiteRendererEditor | undefined,
  children: ReactNode,
): ReactNode {
  if (!editor || !sectionId) return children;
  const selected = editor.selectedSectionId === sectionId;
  return (
    <div
      data-section-id={sectionId}
      onClick={(e) => {
        e.stopPropagation();
        editor.onSelectSection?.(sectionId);
      }}
      onKeyDown={() => {}}
      role="button"
      tabIndex={0}
      className={`relative ${selected ? "ring-2 ring-[#FF5500] ring-offset-2 z-10" : "hover:ring-1 hover:ring-[#FF5500]/50"}`}
      style={{ cursor: "pointer" }}
    >
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
      style={style}
      contentEditable
      suppressContentEditableWarning
      onBlur={(e) => onChange(e.currentTarget.textContent ?? "")}
      onClick={(e) => e.stopPropagation()}
    >
      {value}
    </Tag>
  );
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

/** Public/preview renderer — approved section types only. */
export function SiteRenderer({
  definition,
  mode = "live",
  pageSlug,
  siteBase = "",
  projectId,
  editor,
}: {
  definition: WebsiteDefinition;
  mode?: "live" | "preview";
  pageSlug?: string;
  /** e.g. /sites/maylecor for multi-page links */
  siteBase?: string;
  /** Required for live newsletter capture */
  projectId?: string;
  editor?: SiteRendererEditor;
}) {
  const theme = definition.theme;
  const merchantPhone = resolveMerchantWhatsApp(definition, definition.seo as SiteSeo | undefined);
  const preferJoko = Boolean((definition.seo as SiteSeo | undefined)?.commerce?.preferJokoCheckout);
  const jokoLive = jokoCheckoutAvailable();
  const page = resolvePage(definition, pageSlug);
  if (!page) return null;

  const maylecorOnly = page.sections.every((s) =>
    s.type === "maylecor-home" || s.type === "maylecor-music",
  );
  const legallyBlondeOnly = page.sections.every((s) => s.type === "legally-blonde-hero");
  const kdirectionOnly = page.sections.every(
    (s) => s.type === "kdirection-home" || s.type === "kdirection-page",
  );
  const motionHero = findMotionHeroProps(definition);
  const motionSite = motionHero !== null;
  const activeSlug = pageSlug && pageSlug !== "home" ? pageSlug : "home";
  const viewportHome =
    motionSite && activeSlug === "home" && motionHero?.scrollMode === "viewport";

  const editingPreview = mode === "preview" && Boolean(editor);
  const shellStyle = maylecorOnly
    ? {
        background: editingPreview ? "#1a1a1a" : "#000",
        color: "#fff",
        minHeight: mode === "preview" ? "100%" : "100vh",
      }
    : legallyBlondeOnly
      ? {
          background: editingPreview ? "#FFE4F0" : "#fff",
          color: "#111",
          minHeight: mode === "preview" ? "100%" : "100vh",
        }
      : kdirectionOnly
        ? { background: "transparent", color: "#111", minHeight: mode === "preview" ? "100%" : "100vh" }
      : motionSite && activeSlug !== "home"
        ? { background: "#0a0a0a", color: "#fff", minHeight: mode === "preview" ? "100%" : "100vh" }
        : viewportHome
          ? {
              background: "#fff",
              color: "#111",
              height: mode === "preview" ? "100%" : "100vh",
              overflow: "hidden",
            }
        : {
          background: theme.background,
          color: theme.text,
          minHeight: mode === "preview" ? "100%" : "100vh",
          fontFamily: theme.fontBody,
        };

  const rootClass =
    mode === "preview"
      ? `${KEBU_SITE_ROOT_CLASS} kebu-site--preview`
      : KEBU_SITE_ROOT_CLASS;

  return (
    <div
      className={rootClass}
      style={{
        ...shellStyle,
        width: "100%",
        maxWidth: "100%",
        overflowX: "clip" as const,
      }}
    >
      {motionSite && motionHero && !(editingPreview && legallyBlondeOnly) ? (
        <MaylecorMotionChrome
          siteBase={siteBase}
          brandLabel={motionHero.brandLabel ?? motionHero.title}
          titleLogo={motionHero.titleLogo}
          currentSlug={activeSlug}
          accentColor={motionHero.accentColor}
          contained={mode === "preview"}
        />
      ) : null}
      {motionSite && activeSlug !== "home" ? (
        <div className="sticky top-[52px] z-20 border-b border-white/10 bg-black/90 px-4 py-2 backdrop-blur-md">
          <a
            href={siteBase || "/"}
            className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-white/80 hover:text-white"
          >
            ← Back
          </a>
        </div>
      ) : null}
      {page.sections.map((section, idx) => {
        if (section.props && (section.props as { hidden?: boolean }).hidden) return null;
        const key = section.id ?? `${section.type}-${idx}`;
        const sectionId = section.id ?? key;
        const anchor = sectionAnchor(section);
        const wrap = (node: ReactNode) => wrapEditorSection(sectionId, editor, node);
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
          case "legally-blonde-hero":
            return wrap(
              <LegallyBlondeHeroLayout
                key={key}
                props={section.props as LegallyBlondeHeroProps}
                contained={mode === "preview"}
                sectionId={sectionId}
                editor={editor}
                projectId={projectId}
              />,
            );
          case "navigation": {
            const p = section.props as { brand: string; links?: { label: string; href: string }[] };
            return (
              <header
                key={key}
                className="kebu-site-nav px-4 py-3 sm:px-5 sm:py-4"
                style={{ background: theme.primary, color: "#fff" }}
              >
                <span className="kebu-site-nav__brand font-bold tracking-wide text-sm sm:text-base">
                  {p.brand}
                </span>
                <nav className="kebu-site-nav__links text-sm">
                  {(p.links ?? []).map((l) => (
                    <a key={l.label} href={l.href} className="opacity-80 hover:opacity-100">
                      {l.label}
                    </a>
                  ))}
                </nav>
              </header>
            );
          }
          case "hero": {
            const p = section.props as {
              heading: string;
              subheading?: string;
              buttonLabel?: string;
              buttonHref?: string;
              align?: string;
              background?: string;
            };
            return wrap(
              <section
                key={key}
                className="px-5 py-16 sm:py-24"
                style={{
                  background: p.background || theme.primary,
                  color: "#fff",
                  textAlign: p.align === "left" ? "left" : "center",
                }}
              >
                <EditableText
                  tag="h1"
                  className="text-3xl sm:text-5xl font-bold max-w-3xl mx-auto"
                  style={{ fontFamily: theme.fontDisplay }}
                  value={p.heading}
                  editor={editor}
                  onChange={(heading) => editor?.onPatchSection?.(sectionId, { heading })}
                />
                {p.subheading && (
                  <EditableText
                    tag="p"
                    className="mt-4 text-base sm:text-lg opacity-80 max-w-2xl mx-auto"
                    value={p.subheading}
                    editor={editor}
                    onChange={(subheading) => editor?.onPatchSection?.(sectionId, { subheading })}
                  />
                )}
                {p.buttonLabel && (
                  <a
                    href={p.buttonHref || "#"}
                    className="inline-block mt-8 rounded-full px-6 py-3 text-sm font-bold"
                    style={{ background: theme.accent, color: theme.primary }}
                  >
                    {p.buttonLabel}
                  </a>
                )}
              </section>,
            );
          }
          case "text": {
            const p = section.props as { heading?: string; body: string };
            return wrap(
              <section key={key} id={anchor} className="px-5 py-12 max-w-3xl mx-auto scroll-mt-20">
                {p.heading && (
                  <EditableText
                    tag="h2"
                    className="text-2xl font-bold mb-3"
                    style={{ fontFamily: theme.fontDisplay }}
                    value={p.heading}
                    editor={editor}
                    onChange={(heading) => editor?.onPatchSection?.(sectionId, { heading })}
                  />
                )}
                <EditableText
                  tag="p"
                  className="leading-relaxed opacity-80 whitespace-pre-wrap"
                  value={p.body}
                  editor={editor}
                  onChange={(body) => editor?.onPatchSection?.(sectionId, { body })}
                />
              </section>,
            );
          }
          case "features": {
            const p = section.props as { heading?: string; items?: { title: string; body: string }[] };
            return (
              <section key={key} id={anchor} className="px-5 py-12 max-w-5xl mx-auto scroll-mt-20">
                <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: theme.fontDisplay }}>
                  {p.heading || "Features"}
                </h2>
                <div className="grid sm:grid-cols-3 gap-6">
                  {(p.items ?? []).map((item) => (
                    <div key={item.title} className="rounded-2xl p-5" style={{ background: "#fff", border: "1px solid #E8E6DF" }}>
                      <h3 className="font-semibold mb-2">{item.title}</h3>
                      <p className="text-sm opacity-70">{item.body}</p>
                    </div>
                  ))}
                </div>
              </section>
            );
          }
          case "testimonials": {
            const p = section.props as { heading?: string; items?: { quote: string; name: string }[] };
            return (
              <section key={key} id={anchor} className="px-5 py-12 max-w-4xl mx-auto scroll-mt-20">
                <h2 className="text-2xl font-bold mb-6">{p.heading || "Testimonials"}</h2>
                <div className="space-y-4">
                  {(p.items ?? []).map((item) => (
                    <blockquote key={item.name} className="rounded-2xl p-5" style={{ background: "#fff", border: "1px solid #E8E6DF" }}>
                      <p className="text-sm italic opacity-80">“{item.quote}”</p>
                      <cite className="text-xs not-italic mt-2 block font-semibold">{item.name}</cite>
                    </blockquote>
                  ))}
                </div>
              </section>
            );
          }
          case "faq": {
            const p = section.props as { heading?: string; items?: { question: string; answer: string }[] };
            return (
              <section key={key} id={anchor} className="px-5 py-12 max-w-3xl mx-auto scroll-mt-20">
                <h2 className="text-2xl font-bold mb-6">{p.heading || "FAQ"}</h2>
                <div className="space-y-4">
                  {(p.items ?? []).map((item) => (
                    <div key={item.question}>
                      <p className="font-semibold">{item.question}</p>
                      <p className="text-sm opacity-70 mt-1">{item.answer}</p>
                    </div>
                  ))}
                </div>
              </section>
            );
          }
          case "products": {
            const p = section.props as {
              heading?: string;
              items?: {
                name: string;
                description?: string;
                priceLabel?: string;
                imageUrl?: string;
                whatsappMessage?: string;
              }[];
            };
            return wrap(
              <section key={key} id={anchor} className="px-5 py-12 max-w-5xl mx-auto scroll-mt-20">
                <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: theme.fontDisplay }}>
                  {p.heading || "Products"}
                </h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {(p.items ?? []).map((item) => {
                    const message = item.whatsappMessage || `Hi — I want to order: ${item.name}`;
                    const waHref = whatsAppOrderHref(merchantPhone, message);
                    return (
                      <article
                        key={item.name}
                        className="rounded-2xl overflow-hidden"
                        style={{ background: "#fff", border: "1px solid #E8E6DF" }}
                      >
                        {item.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-full h-40 object-cover"
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <div className="w-full h-40 flex items-center justify-center text-sm opacity-40 bg-black/5">
                            No image
                          </div>
                        )}
                        <div className="p-4">
                          <h3 className="font-semibold">{item.name}</h3>
                          {item.priceLabel ? (
                            <p className="text-sm font-bold mt-1" style={{ color: theme.accent }}>
                              {item.priceLabel}
                            </p>
                          ) : null}
                          {item.description ? (
                            <p className="text-sm opacity-70 mt-2 line-clamp-3">{item.description}</p>
                          ) : null}
                          <div className="flex flex-wrap gap-2 mt-3">
                            <a
                              href={waHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-block rounded-full px-4 py-2 text-xs font-bold"
                              style={{ background: "#25D366", color: "#fff" }}
                            >
                              Order on WhatsApp
                            </a>
                            {preferJoko && jokoLive ? (
                              <span
                                className="inline-block rounded-full px-4 py-2 text-xs font-bold opacity-60"
                                style={{ background: theme.accent, color: theme.background }}
                                title="JOKO product checkout — coming in next Kebu slice"
                              >
                                JOKO (soon)
                              </span>
                            ) : null}
                          </div>
                          {!merchantPhone ? (
                            <p className="text-[10px] mt-2 opacity-50">
                              Add your WhatsApp number in Shop settings so orders reach you.
                            </p>
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
                </div>
                {(p.items ?? []).length === 0 ? (
                  <p className="text-sm opacity-60">Add products in Kebu Shop (separate from the website builder).</p>
                ) : null}
              </section>,
            );
          }
          case "contact": {
            const p = section.props as { heading?: string; email?: string; phone?: string; address?: string };
            return (
              <section key={key} id={anchor} className="px-5 py-12 max-w-3xl mx-auto scroll-mt-20">
                <h2 className="text-2xl font-bold mb-4">{p.heading || "Contact"}</h2>
                <ul className="text-sm space-y-2 opacity-80">
                  {p.email && <li>Email: {p.email}</li>}
                  {p.phone && <li>Phone: {p.phone}</li>}
                  {p.address && <li>{p.address}</li>}
                  {!p.email && !p.phone && !p.address && <li>Contact details coming soon.</li>}
                </ul>
              </section>
            );
          }
          case "newsletter": {
            const p = section.props as {
              heading?: string;
              subheading?: string;
              buttonLabel?: string;
              successMessage?: string;
            };
            return (
              <NewsletterSignup
                key={key}
                projectId={mode === "live" ? projectId : undefined}
                preview={mode === "preview"}
                heading={p.heading || "Stay in the loop"}
                subheading={p.subheading || "Get updates by email."}
                buttonLabel={p.buttonLabel || "Subscribe"}
                successMessage={p.successMessage || "Thanks — you're on the list."}
              />
            );
          }
          case "whatsapp": {
            const p = section.props as { label?: string; phone: string; message?: string };
            const phone = p.phone.replace(/\D/g, "");
            const href = `https://wa.me/${phone}${p.message ? `?text=${encodeURIComponent(p.message)}` : ""}`;
            return (
              <section key={key} id={anchor} className="px-5 py-8 text-center scroll-mt-20">
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block rounded-full px-6 py-3 text-sm font-bold"
                  style={{ background: "#25D366", color: "#fff" }}
                >
                  {p.label || "WhatsApp"}
                </a>
              </section>
            );
          }
          case "image": {
            const p = section.props as { src?: string; alt?: string; caption?: string };
            if (!p.src) return null;
            return (
              <figure key={key} className="px-5 py-8 max-w-4xl mx-auto">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.src} alt={p.alt || ""} className="w-full rounded-2xl" />
                {p.caption && <figcaption className="text-xs mt-2 opacity-60">{p.caption}</figcaption>}
              </figure>
            );
          }
          case "gallery": {
            const p = section.props as { items?: { src: string; alt?: string }[] };
            const items = (p.items ?? []).filter((item) => item.src);
            if (!items.length) return null;
            return (
              <section key={key} id={anchor} className="px-5 py-8 max-w-5xl mx-auto scroll-mt-20">
                <div className="grid sm:grid-cols-3 gap-3">
                  {items.map((item, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={`${item.src}-${i}`}
                      src={item.src}
                      alt={item.alt || ""}
                      className="rounded-xl w-full object-cover aspect-square"
                    />
                  ))}
                </div>
              </section>
            );
          }
          case "video": {
            const p = section.props as { heading?: string; src: string; title?: string; caption?: string };
            if (!p.src) return null;
            const direct = isDirectVideoUrl(p.src);
            return wrap(
              <section key={key} id={anchor} className="px-5 py-12 max-w-4xl mx-auto scroll-mt-20">
                {p.heading && (
                  <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: theme.fontDisplay }}>
                    {p.heading}
                  </h2>
                )}
                {direct ? (
                  // eslint-disable-next-line jsx-a11y/media-has-caption
                  <video
                    controls
                    preload="metadata"
                    playsInline
                    className="w-full rounded-2xl"
                    src={p.src}
                    title={p.title}
                  />
                ) : (
                  <VideoEmbed src={p.src} title={p.title} caption={p.caption} />
                )}
                {direct && p.caption ? <p className="text-xs text-center mt-2 opacity-70">{p.caption}</p> : null}
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
              <section key={key} id={anchor} className="px-5 py-12 max-w-2xl mx-auto scroll-mt-20">
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
              </section>,
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
                    className="absolute px-2"
                    style={{
                      left: `${block.x}%`,
                      top: `${block.y}%`,
                      width: `${block.width}%`,
                      textAlign: block.align,
                      fontSize: fontSizeMap[block.fontSize] ?? fontSizeMap.md,
                      color: block.color || theme.text,
                      cursor: editor ? "move" : "default",
                    }}
                    onPointerDown={(e) => {
                      if (!editor?.onMoveFreeTextBlock) return;
                      e.stopPropagation();
                      const parent = e.currentTarget.offsetParent as HTMLElement | null;
                      if (!parent) return;
                      const startX = e.clientX;
                      const startY = e.clientY;
                      const originX = block.x;
                      const originY = block.y;
                      let lastX = originX;
                      let lastY = originY;
                      const el = e.currentTarget;
                      function onMove(ev: PointerEvent) {
                        const rect = parent!.getBoundingClientRect();
                        const dx = ((ev.clientX - startX) / rect.width) * 100;
                        const dy = ((ev.clientY - startY) / rect.height) * 100;
                        lastX = Math.min(95, Math.max(0, originX + dx));
                        lastY = Math.min(95, Math.max(0, originY + dy));
                        el.style.left = `${lastX}%`;
                        el.style.top = `${lastY}%`;
                      }
                      function onUp() {
                        window.removeEventListener("pointermove", onMove);
                        window.removeEventListener("pointerup", onUp);
                        editor?.onMoveFreeTextBlock?.(sectionId, block.id, lastX, lastY);
                      }
                      window.addEventListener("pointermove", onMove);
                      window.addEventListener("pointerup", onUp);
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
              <section key={key} id={anchor} className="px-5 py-12 max-w-4xl mx-auto scroll-mt-20">
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
              <section key={key} id={anchor} className="px-5 py-12 max-w-3xl mx-auto scroll-mt-20">
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
            const p = section.props as { text?: string; links?: { label: string; href: string }[] };
            return (
              <footer key={key} className="px-4 sm:px-5 py-8 mt-8 text-center text-sm opacity-60" style={{ borderTop: "1px solid #E8E6DF" }}>
                <p>{p.text}</p>
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-2">
                  {(p.links ?? []).map((l) => (
                    <a key={l.label} href={l.href}>
                      {l.label}
                    </a>
                  ))}
                </div>
              </footer>
            );
          }
          default:
            return null;
        }
      })}
      {motionSite && motionHero && !(editingPreview && legallyBlondeOnly) ? (
        <MaylecorSiteFooter
          brandLabel={motionHero.brandLabel ?? motionHero.title}
          accentColor={motionHero.accentColor}
          socialLinks={motionHero.socialLinks}
          siteBase={siteBase}
        />
      ) : null}
    </div>
  );
}
