"use client";

import { BUILDER } from "@/lib/create/builder-ui";
import type { ThemeTokens } from "@/lib/create/website-schema";
import { BuilderColorPanel, BuilderTypographyPanel } from "@/app/components/create/builder-color-panel";
import { BuilderPopupPanel } from "@/app/components/create/builder-popup-panel";
import { SiteAssetsPanel } from "@/app/components/create/site-assets-panel";
import { SiteImageUpload } from "@/app/components/create/site-image-upload";
import { useState, type ReactNode } from "react";

function EditorAccordion({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden border-b" style={{ borderColor: BUILDER.border }}>
      <button
        type="button"
        className="flex w-full items-center justify-between px-0 py-3.5 text-left text-[13px] font-semibold"
        style={{ background: "transparent", color: BUILDER.ink }}
        aria-expanded={open}
        onClick={onToggle}
      >
        {title}
        <span aria-hidden className="text-[12px] font-normal" style={{ color: BUILDER.faint }}>
          {open ? "▾" : "▸"}
        </span>
      </button>
      {open ? <div className="space-y-5 pb-5 pt-1">{children}</div> : null}
    </div>
  );
}

function ChoiceRow<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <p className="mb-1.5 text-[10px] uppercase tracking-wider">{label}</p>
      <div className="flex flex-wrap gap-1">
        {options.map((id) => {
          const on = value === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className="min-w-[3.5rem] flex-1 rounded-lg px-2 py-2 text-[10px] font-bold uppercase"
              style={{
                background: on ? BUILDER.ink : BUILDER.surfaceMuted,
                color: on ? "#fff" : BUILDER.ink,
                border: `1px solid ${BUILDER.border}`,
              }}
              aria-pressed={on}
            >
              {id}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export type AestheticEditorExtras = {
  projectId?: string;
  heroAccent?: string;
  heroBackground?: string;
  brandLogo?: string;
  onHeroAccentChange?: (color: string) => void;
  onHeroBackgroundChange?: (url: string) => void;
  onBrandLogoChange?: (url: string) => void;
  onUsePhotoOnSite?: (url: string) => void;
  popupSection?: { id: string; props: Record<string, unknown> } | null;
  onEnsurePopup?: () => void | Promise<void>;
  onPatchPopup?: (patch: Record<string, unknown>) => void;
  /** SEO fields for Favicon / meta accordion */
  faviconUrl?: string;
  metaTitle?: string;
  metaDescription?: string;
  onSeoChange?: (patch: { faviconUrl?: string; metaTitle?: string; metaDescription?: string }) => void;
};

/**
 * Aesthetic Editor — Shopify Theme settings accordion.
 * One panel open at a time; tap again to close.
 */
export function BuilderAestheticsPanel({
  theme,
  onThemeChange,
  extras,
}: {
  theme: ThemeTokens;
  onThemeChange: (patch: Partial<ThemeTokens>) => void;
  extras?: AestheticEditorExtras;
}) {
  const {
    projectId,
    heroAccent,
    heroBackground,
    brandLogo,
    onHeroAccentChange,
    onHeroBackgroundChange,
    onBrandLogoChange,
    onUsePhotoOnSite,
    popupSection,
    onEnsurePopup,
    onPatchPopup,
    faviconUrl,
    metaTitle,
    metaDescription,
    onSeoChange,
  } = extras ?? {};

  const [openId, setOpenId] = useState<string | null>("colors");
  function toggle(id: string) {
    setOpenId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="space-y-0">
      <div className="mb-4 border-b pb-4" style={{ borderColor: BUILDER.border }}>
        <p className="text-[14px] font-semibold" style={{ color: BUILDER.ink }}>
          Aesthetic Editor
        </p>
        <p className="mt-1 text-[12px] leading-relaxed" style={{ color: BUILDER.muted }}>
          Customize colors, fonts, and layout for your entire site.
        </p>
      </div>

      <EditorAccordion title="Colors" open={openId === "colors"} onToggle={() => toggle("colors")}>
        <BuilderColorPanel
          theme={theme}
          heroAccent={heroAccent}
          onThemeChange={onThemeChange}
          onHeroAccentChange={onHeroAccentChange}
        />
        <label className="block text-[10px] uppercase tracking-wider">
          Surface (cards)
          <div className="mt-1 flex items-center gap-2">
            <input
              type="color"
              value={
                (theme.surface ?? "#FFFFFF").startsWith("#") && (theme.surface ?? "#FFFFFF").length >= 7
                  ? (theme.surface ?? "#FFFFFF").slice(0, 7)
                  : "#FFFFFF"
              }
              onChange={(e) => onThemeChange({ surface: e.target.value })}
              className="h-9 w-12 cursor-pointer rounded-lg border border-black/10 bg-transparent p-0.5"
              aria-label="Surface color"
            />
            <input
              className="flex-1 rounded-lg px-2 py-1.5 text-xs font-mono"
              style={{ border: `1px solid ${BUILDER.border}` }}
              value={theme.surface ?? "#FFFFFF"}
              onChange={(e) => onThemeChange({ surface: e.target.value })}
            />
          </div>
        </label>
        <label className="block text-[10px] uppercase tracking-wider">
          Links
          <div className="mt-1 flex items-center gap-2">
            <input
              type="color"
              value={
                (theme.link ?? theme.accent).startsWith("#") && (theme.link ?? theme.accent).length >= 7
                  ? (theme.link ?? theme.accent).slice(0, 7)
                  : theme.accent.slice(0, 7)
              }
              onChange={(e) => onThemeChange({ link: e.target.value })}
              className="h-9 w-12 cursor-pointer rounded-lg border border-black/10 bg-transparent p-0.5"
              aria-label="Link color"
            />
            <input
              className="flex-1 rounded-lg px-2 py-1.5 text-xs font-mono"
              style={{ border: `1px solid ${BUILDER.border}` }}
              value={theme.link ?? theme.accent}
              onChange={(e) => onThemeChange({ link: e.target.value })}
            />
          </div>
        </label>
      </EditorAccordion>

      <EditorAccordion title="Typography" open={openId === "fonts"} onToggle={() => toggle("fonts")}>
        <BuilderTypographyPanel theme={theme} onThemeChange={onThemeChange} />
      </EditorAccordion>

      <EditorAccordion title="Layout & buttons" open={openId === "layout"} onToggle={() => toggle("layout")}>
        <ChoiceRow
          label="Section spacing"
          value={theme.spacing}
          options={["compact", "comfortable", "airy"] as const}
          onChange={(spacing) => onThemeChange({ spacing })}
        />
        <ChoiceRow
          label="Content width"
          value={theme.contentWidth ?? "default"}
          options={["narrow", "default", "wide"] as const}
          onChange={(contentWidth) => onThemeChange({ contentWidth })}
        />
        <ChoiceRow
          label="Corners"
          value={theme.radius ?? "soft"}
          options={["sharp", "soft", "round"] as const}
          onChange={(radius) => onThemeChange({ radius })}
        />
        <ChoiceRow
          label="Buttons"
          value={theme.buttonStyle ?? "solid"}
          options={["solid", "outline", "soft"] as const}
          onChange={(buttonStyle) => onThemeChange({ buttonStyle })}
        />
      </EditorAccordion>

      <EditorAccordion title="Background" open={openId === "background"} onToggle={() => toggle("background")}>
        <label className="block text-[10px] uppercase tracking-wider">
          Page background color
          <div className="mt-1 flex items-center gap-2">
            <input
              type="color"
              value={
                theme.background.startsWith("#") && theme.background.length >= 7
                  ? theme.background.slice(0, 7)
                  : "#FAFAF8"
              }
              onChange={(e) => onThemeChange({ background: e.target.value })}
              className="h-9 w-12 cursor-pointer rounded-lg border border-black/10 bg-transparent p-0.5"
              aria-label="Page background color"
            />
            <input
              className="flex-1 rounded-lg px-2 py-1.5 text-xs font-mono"
              style={{ border: `1px solid ${BUILDER.border}` }}
              value={theme.background}
              onChange={(e) => onThemeChange({ background: e.target.value })}
            />
          </div>
        </label>
        {onHeroBackgroundChange ? (
          <>
            <p className="text-[10px] leading-relaxed" style={{ color: BUILDER.muted }}>
              Hero / cover photo for this page.
            </p>
            {projectId ? (
              <SiteImageUpload
                projectId={projectId}
                kind="section"
                value={heroBackground ?? ""}
                onChange={onHeroBackgroundChange}
                label="Hero background photo"
              />
            ) : (
              <input
                className="w-full rounded-lg px-2 py-1.5 text-xs font-mono"
                style={{ border: `1px solid ${BUILDER.border}` }}
                value={heroBackground ?? ""}
                onChange={(e) => onHeroBackgroundChange(e.target.value)}
                placeholder="Image URL"
              />
            )}
          </>
        ) : (
          <p className="text-[10px] leading-relaxed" style={{ color: BUILDER.muted }}>
            No hero background on this page — page color still applies.
          </p>
        )}
      </EditorAccordion>

      {(onBrandLogoChange || projectId) && onBrandLogoChange ? (
        <EditorAccordion title="Logo" open={openId === "logo"} onToggle={() => toggle("logo")}>
          <p className="text-[10px] leading-relaxed" style={{ color: BUILDER.muted }}>
            Header logo (clicks home).
          </p>
          {projectId ? (
            <SiteImageUpload
              projectId={projectId}
              kind="logo"
              value={brandLogo ?? ""}
              onChange={onBrandLogoChange}
              label="Header logo"
            />
          ) : null}
        </EditorAccordion>
      ) : null}

      {onEnsurePopup && onPatchPopup ? (
        <EditorAccordion title="Popup" open={openId === "popup"} onToggle={() => toggle("popup")}>
          <BuilderPopupPanel
            section={popupSection ?? null}
            onEnsure={onEnsurePopup}
            onPatch={onPatchPopup}
          />
        </EditorAccordion>
      ) : null}

      {projectId ? (
        <EditorAccordion title="Photos" open={openId === "photos"} onToggle={() => toggle("photos")}>
          <SiteAssetsPanel
            projectId={projectId}
            onUseOnSite={(asset) => {
              if (asset.kind === "image") onUsePhotoOnSite?.(asset.url);
            }}
          />
        </EditorAccordion>
      ) : null}

      <EditorAccordion title="Theme presets" open={openId === "presets"} onToggle={() => toggle("presets")}>
        <p className="text-[10px] leading-relaxed" style={{ color: BUILDER.muted }}>
          One-click style — tweak colors and fonts after applying.
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          {THEME_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              title={preset.label}
              onClick={() => onThemeChange(preset.tokens)}
              className="group rounded-lg overflow-hidden text-left transition-all hover:ring-2 hover:ring-offset-1 focus-visible:ring-2 focus-visible:ring-offset-1"
              style={{ ringColor: preset.tokens.accent } as React.CSSProperties}
            >
              {/* Color bar */}
              <div className="flex h-7 w-full">
                <span className="flex-1" style={{ background: preset.tokens.background }} />
                <span className="w-4" style={{ background: preset.tokens.primary }} />
                <span className="w-4" style={{ background: preset.tokens.accent }} />
              </div>
              {/* Name */}
              <p
                className="truncate px-1.5 py-1 text-[9px] font-semibold leading-none"
                style={{ background: preset.tokens.background, color: preset.tokens.text }}
              >
                {preset.label}
              </p>
            </button>
          ))}
        </div>
      </EditorAccordion>

      <EditorAccordion title="Currency & prices" open={openId === "currency"} onToggle={() => toggle("currency")}>
        <p className="text-[10px] leading-relaxed" style={{ color: BUILDER.muted }}>
          Currency shown on product prices across your site.
        </p>
        <div className="flex flex-wrap gap-1">
          {CURRENCY_OPTIONS.map((c) => {
            const on = (theme.currency ?? "XOF") === c.code;
            return (
              <button
                key={c.code}
                type="button"
                onClick={() => onThemeChange({ currency: c.code })}
                className="rounded-lg px-2 py-1.5 text-[10px] font-semibold"
                style={{
                  background: on ? BUILDER.ink : BUILDER.surfaceMuted,
                  color: on ? "#fff" : BUILDER.ink,
                  border: `1px solid ${BUILDER.border}`,
                }}
                aria-pressed={on}
                title={c.name}
              >
                {c.code}
              </button>
            );
          })}
        </div>
      </EditorAccordion>

      {onSeoChange ? (
        <EditorAccordion title="SEO & meta" open={openId === "seo"} onToggle={() => toggle("seo")}>
          <p className="text-[10px] leading-relaxed" style={{ color: BUILDER.muted }}>
            How search engines and social media see your site.
          </p>
          {projectId ? (
            <SiteImageUpload
              projectId={projectId}
              kind="logo"
              value={faviconUrl ?? ""}
              onChange={(url) => onSeoChange({ faviconUrl: url })}
              label="Favicon / site icon"
            />
          ) : null}
          <label className="block">
            <p className="mb-1 text-[10px] uppercase tracking-wider">Meta title</p>
            <input
              className="w-full rounded-lg px-2 py-1.5 text-[11px]"
              style={{ border: `1px solid ${BUILDER.border}` }}
              value={metaTitle ?? ""}
              maxLength={120}
              placeholder="Your site name — short & clear"
              onChange={(e) => onSeoChange({ metaTitle: e.target.value })}
            />
          </label>
          <label className="block">
            <p className="mb-1 text-[10px] uppercase tracking-wider">Meta description</p>
            <textarea
              className="w-full rounded-lg px-2 py-1.5 text-[11px]"
              style={{ border: `1px solid ${BUILDER.border}`, resize: "vertical", minHeight: "72px" }}
              value={metaDescription ?? ""}
              maxLength={320}
              placeholder="One or two sentences about your site"
              onChange={(e) => onSeoChange({ metaDescription: e.target.value })}
            />
          </label>
        </EditorAccordion>
      ) : null}

      <EditorAccordion title="Custom CSS" open={openId === "css"} onToggle={() => toggle("css")}>
        <p className="text-[10px] leading-relaxed" style={{ color: BUILDER.muted }}>
          Advanced: paste CSS overrides applied to your published site.
        </p>
        <textarea
          className="w-full rounded-lg px-2 py-1.5 font-mono text-[11px]"
          style={{ border: `1px solid ${BUILDER.border}`, resize: "vertical", minHeight: "100px" }}
          value={theme.customCss ?? ""}
          maxLength={10000}
          placeholder=".kebu-site h1 { letter-spacing: -0.02em; }"
          onChange={(e) => onThemeChange({ customCss: e.target.value })}
          spellCheck={false}
        />
      </EditorAccordion>
    </div>
  );
}

const THEME_PRESETS: { id: string; label: string; hint: string; tokens: Partial<import("@/lib/create/website-schema").ThemeTokens> }[] = [
  {
    id: "clean",
    label: "Clean",
    hint: "White, minimal",
    tokens: { primary: "#0A0A0A", accent: "#FF5500", background: "#FFFFFF", text: "#0A0A0A", surface: "#F6F6F7", fontDisplay: "Inter", fontBody: "Inter", radius: "soft", buttonStyle: "solid", spacing: "comfortable" },
  },
  {
    id: "dark",
    label: "Dark",
    hint: "Black editorial",
    tokens: { primary: "#FFFFFF", accent: "#FF5500", background: "#0A0A0A", text: "#FFFBF7", surface: "#1A1A1A", fontDisplay: "Playfair Display", fontBody: "system-ui", radius: "sharp", buttonStyle: "outline", spacing: "comfortable" },
  },
  {
    id: "luxe",
    label: "Luxe",
    hint: "Gold & cream",
    tokens: { primary: "#C8A96E", accent: "#C8A96E", background: "#F9F4EC", text: "#1A1A1A", surface: "#FFFFFF", fontDisplay: "Cormorant Garamond", fontBody: "system-ui", radius: "sharp", buttonStyle: "outline", spacing: "airy" },
  },
  {
    id: "bold",
    label: "Bold",
    hint: "High contrast",
    tokens: { primary: "#FF5500", accent: "#0A0A0A", background: "#FFFBF7", text: "#0A0A0A", surface: "#FFF0E8", fontDisplay: "Montserrat", fontBody: "system-ui", radius: "round", buttonStyle: "solid", spacing: "compact" },
  },
  {
    id: "playful",
    label: "Playful",
    hint: "Soft & fun",
    tokens: { primary: "#7C3AED", accent: "#EC4899", background: "#FAFAFA", text: "#111827", surface: "#F3F0FF", fontDisplay: "Nunito", fontBody: "system-ui", radius: "round", buttonStyle: "soft", spacing: "comfortable" },
  },
  {
    id: "african",
    label: "African",
    hint: "Earth tones",
    tokens: { primary: "#8B4513", accent: "#DAA520", background: "#FDF6EC", text: "#2C1810", surface: "#F5E6D0", fontDisplay: "Playfair Display", fontBody: "system-ui", radius: "soft", buttonStyle: "solid", spacing: "comfortable" },
  },
];

const CURRENCY_OPTIONS: { code: string; name: string }[] = [
  { code: "XOF", name: "West African CFA franc" },
  { code: "NGN", name: "Nigerian naira" },
  { code: "KES", name: "Kenyan shilling" },
  { code: "GHS", name: "Ghanaian cedi" },
  { code: "ZAR", name: "South African rand" },
  { code: "MAD", name: "Moroccan dirham" },
  { code: "EGP", name: "Egyptian pound" },
  { code: "ETB", name: "Ethiopian birr" },
  { code: "TZS", name: "Tanzanian shilling" },
  { code: "USD", name: "US dollar" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "British pound" },
];
