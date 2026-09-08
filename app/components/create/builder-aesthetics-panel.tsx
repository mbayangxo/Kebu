"use client";

import { BUILDER } from "@/lib/create/builder-ui";
import {
  SITE_AESTHETICS,
  matchSiteAesthetic,
  themeWithAesthetic,
  type SiteAestheticId,
} from "@/lib/create/site-aesthetics";
import type { ThemeTokens } from "@/lib/create/website-schema";
import { BuilderColorPanel, BuilderTypographyPanel } from "@/app/components/create/builder-color-panel";
import { useState, type ReactNode } from "react";

function ThemeAccordion({
  title,
  defaultOpen,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(Boolean(defaultOpen));
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${BUILDER.border}` }}>
      <button
        type="button"
        className="flex w-full items-center justify-between px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider"
        style={{ background: BUILDER.surfaceMuted, color: BUILDER.ink }}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {title}
        <span aria-hidden style={{ color: BUILDER.faint }}>
          {open ? "−" : "+"}
        </span>
      </button>
      {open ? <div className="space-y-4 px-3 py-3">{children}</div> : null}
    </div>
  );
}

export function BuilderAestheticsPanel({
  theme,
  heroAccent,
  onThemeChange,
  onHeroAccentChange,
}: {
  theme: ThemeTokens;
  heroAccent?: string;
  onThemeChange: (patch: Partial<ThemeTokens>) => void;
  onHeroAccentChange?: (color: string) => void;
}) {
  const current = matchSiteAesthetic(theme);

  function applyLook(id: SiteAestheticId) {
    const look = themeWithAesthetic(id);
    onThemeChange(look);
    if (onHeroAccentChange) onHeroAccentChange(look.accent);
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: BUILDER.orange }}>
          Theme settings
        </p>
        <p className="mt-1 text-xs leading-relaxed" style={{ color: BUILDER.muted }}>
          Presets, colors, and fonts for this site — public aesthetics and private sites (including May). Save draft,
          then publish so visitors see it.
        </p>
      </div>

      <ThemeAccordion title="Look presets" defaultOpen>
        <ul className="grid grid-cols-2 gap-2">
          {SITE_AESTHETICS.map((look) => {
            const selected = current === look.id;
            return (
              <li key={look.id}>
                <button
                  type="button"
                  onClick={() => applyLook(look.id)}
                  className="w-full rounded-xl p-2 text-left transition-shadow"
                  style={{
                    border: selected ? `2px solid ${BUILDER.orange}` : `1px solid ${BUILDER.border}`,
                    background: look.theme.background,
                    color: look.theme.text,
                    boxShadow: selected ? BUILDER.shadowSoft : "none",
                  }}
                >
                  <span className="mb-2 flex h-8 overflow-hidden rounded-md" aria-hidden>
                    <span className="flex-1" style={{ background: look.theme.primary }} />
                    <span className="w-5" style={{ background: look.theme.accent }} />
                  </span>
                  <span className="block text-[11px] font-bold leading-tight">{look.name}</span>
                  <span className="mt-0.5 block text-[9px] leading-snug opacity-70">{look.tagline}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </ThemeAccordion>

      <ThemeAccordion title="Colors" defaultOpen>
        <BuilderColorPanel
          theme={theme}
          heroAccent={heroAccent}
          onThemeChange={onThemeChange}
          onHeroAccentChange={onHeroAccentChange}
        />
      </ThemeAccordion>

      <ThemeAccordion title="Typography" defaultOpen>
        <BuilderTypographyPanel theme={theme} onThemeChange={onThemeChange} />
      </ThemeAccordion>
    </div>
  );
}
