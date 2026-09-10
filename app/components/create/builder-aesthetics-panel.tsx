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
        className="flex w-full items-center justify-between px-1 py-2.5 text-left text-[13px] font-semibold"
        style={{ background: open ? BUILDER.surfaceMuted : "transparent", color: BUILDER.ink }}
        aria-expanded={open}
        onClick={onToggle}
      >
        {title}
        <span aria-hidden className="text-[11px] font-normal" style={{ color: BUILDER.faint }}>
          {open ? "▾" : "▸"}
        </span>
      </button>
      {open ? <div className="space-y-4 px-1 pb-3 pt-1">{children}</div> : null}
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
  } = extras ?? {};

  const [openId, setOpenId] = useState<string | null>("colors");
  function toggle(id: string) {
    setOpenId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="space-y-0">
      <div className="mb-3 border-b pb-3" style={{ borderColor: BUILDER.border }}>
        <p className="text-[13px] font-semibold" style={{ color: BUILDER.ink }}>
          Theme settings
        </p>
        <p className="mt-1 text-xs leading-relaxed" style={{ color: BUILDER.muted }}>
          Open one category at a time. Looks ($5) are in Themes.
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
    </div>
  );
}
