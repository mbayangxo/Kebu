"use client";

import { NavLinksEditor, mapNavLinksForEditor } from "@/app/components/create/nav-links-editor";
import { SectionPhotoField } from "@/app/components/create/section-photo-field";
import { NavSizeEditor } from "@/app/components/create/nav-size-editor";
import { PanelSection } from "@/app/components/create/builder-panel-section";
import {
  GalaxyFieldLabel,
  GalaxyPanelHeader,
  GalaxySegmentedControl,
} from "@/app/components/galaxy/editor-primitives";
import { clampNavScale, parseNavLayout, parseNavSize } from "@/lib/create/nav-chrome-size";
import type { SiteChrome } from "@/lib/create/site-chrome";

const INPUT = "min-h-9 w-full rounded-lg border border-black/10 bg-white px-2.5 py-2 text-xs text-black outline-none focus:border-[#FF6A00] focus:ring-2 focus:ring-[#FF6A00]/15";
const FONTS = ["Satoshi", "Inter", "DM Sans", "Space Grotesk", "Manrope", "Helvetica", "Georgia", "Playfair Display", "Cormorant Garamond", "Libre Baskerville", "Oswald", "Bebas Neue", "Syne"] as const;

export function BuilderSiteChromePanel({
  part,
  chrome,
  selected,
  onSelect,
  onPatch,
  onRemove,
  projectId,
  pages = [],
}: {
  part: "header" | "footer";
  chrome: SiteChrome;
  selected: boolean;
  onSelect: () => void;
  onPatch: (patch: Record<string, unknown>) => void;
  onRemove?: () => void;
  projectId: string;
  pages?: Array<{ id: string; slug: string; title: string }>;
}) {
  const headerProps = (chrome.header?.props ?? {}) as {
    brand?: string;
    links?: Parameters<typeof mapNavLinksForEditor>[0];
    navScale?: number;
    navSize?: string;
    navLayout?: string;
    logoAlign?: "left" | "center" | "right";
    navSticky?: boolean;
    logoUrl?: string;
    logoAlt?: string;
    logoScale?: number;
    faviconUrl?: string;
    fontFamily?: string;
    fontWeight?: number;
    navStyle?: "standard" | "mega";
  };
  const footerProps = (chrome.footer?.props ?? {}) as {
    text?: string;
    legalName?: string;
    copyrightYear?: number;
    fontFamily?: string;
    links?: { label: string; href: string }[];
    bgColor?: string;
    textColor?: string;
  };
  const currentYear = new Date().getFullYear();

  if (!selected) {
    return (
      <button
        type="button"
        onClick={onSelect}
        className="flex w-full items-center gap-2.5 rounded-lg border border-black/[0.08] bg-white p-2.5 text-left outline-none transition hover:border-black/15 hover:bg-black/[.015] focus-visible:ring-2 focus-visible:ring-[#FF6A00]"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#FFF3E8] text-[11px] font-bold text-[#C95000]" aria-hidden>{part === "header" ? "H" : "F"}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-semibold text-black">{part === "header" ? "Site header" : "Site footer"}</span>
          <span className="mt-0.5 block text-[9px] leading-snug text-black/40">{part === "header" ? "Brand, logo, navigation and menu behavior · all pages" : "Copyright, links, typography and colors · all pages"}</span>
        </span>
        <span className="text-black/30" aria-hidden>→</span>
      </button>
    );
  }

  return (
    <div className="bg-white">
      <GalaxyPanelHeader
        eyebrow="Site-wide"
        title={part === "header" ? "Header & navigation" : "Footer"}
        description={part === "header" ? "These choices apply across the site. Page-specific content stays untouched." : "Keep the closing area compact, useful, and consistent on every page."}
      />

      <div className="space-y-2.5 p-3">
        {part === "header" ? (
          <>
            <PanelSection title="Identity" group="chrome-header" defaultOpen>
              <SectionPhotoField projectId={projectId} label="Logo" value={String(headerProps.logoUrl ?? "")} onChange={(logoUrl) => onPatch({ logoUrl })} />
              <GalaxyFieldLabel label="Brand name">
                <input className={INPUT} value={String(headerProps.brand ?? "")} onChange={(event) => onPatch({ brand: event.target.value })} placeholder="Your brand" />
              </GalaxyFieldLabel>
              <GalaxyFieldLabel label="Logo description">
                <input className={INPUT} value={String(headerProps.logoAlt ?? "")} onChange={(event) => onPatch({ logoAlt: event.target.value })} placeholder="Describe the logo for accessibility" />
              </GalaxyFieldLabel>
              <GalaxyFieldLabel label={`Logo size · ${Number(headerProps.logoScale ?? 1).toFixed(1)}×`}>
                <input type="range" min="0.5" max="4" step="0.1" className="mt-2 w-full accent-[#FF6A00]" value={Number(headerProps.logoScale ?? 1)} onChange={(event) => onPatch({ logoScale: Number(event.target.value) })} />
              </GalaxyFieldLabel>
              <SectionPhotoField projectId={projectId} label="Favicon / browser icon" value={String(headerProps.faviconUrl ?? "")} onChange={(faviconUrl) => onPatch({ faviconUrl })} />
              <label className="flex min-h-10 cursor-pointer items-center justify-between rounded-lg bg-black/[0.025] px-2.5">
                <span>
                  <span className="block text-[10px] font-bold text-black/65">Sticky navigation</span>
                  <span className="block text-[8px] text-black/40">Keep the header visible while scrolling.</span>
                </span>
                <input type="checkbox" className="accent-[#FF6A00]" checked={headerProps.navSticky !== false} onChange={() => onPatch({ navSticky: !(headerProps.navSticky !== false) })} />
              </label>
            </PanelSection>

            <PanelSection title="Layout & size" group="chrome-header">
              <NavSizeEditor
                scale={clampNavScale(headerProps.navScale, 1)}
                size={parseNavSize(headerProps.navSize)}
                layout={parseNavLayout(headerProps.navLayout)}
                logoAlign={headerProps.logoAlign ?? "left"}
                onChange={onPatch}
              />
            </PanelSection>

            <PanelSection title="Typography" group="chrome-header">
              <GalaxyFieldLabel label="Menu font">
                <input list="kebu-nav-fonts" className={INPUT} value={headerProps.fontFamily ?? ""} onChange={(event) => onPatch({ fontFamily: event.target.value || undefined })} placeholder="Same as site" />
                <datalist id="kebu-nav-fonts">{FONTS.map((font) => <option key={font} value={font} />)}</datalist>
              </GalaxyFieldLabel>
              <GalaxyFieldLabel label="Weight">
                <select className={INPUT} value={String(headerProps.fontWeight ?? 700)} onChange={(event) => onPatch({ fontWeight: Number(event.target.value) })}>
                  <option value="400">Regular · 400</option><option value="500">Medium · 500</option><option value="600">Semibold · 600</option><option value="700">Bold · 700</option><option value="800">Extra bold · 800</option><option value="900">Black · 900</option>
                </select>
              </GalaxyFieldLabel>
              <div className="rounded-lg border border-black/[0.07] bg-[#FAFAF8] p-2.5">
                <p className="text-[16px] leading-tight text-black" style={{ fontFamily: headerProps.fontFamily || "inherit", fontWeight: headerProps.fontWeight ?? 700 }}>Home · About · Shop</p>
                <p className="mt-1 text-[9px] text-black/35">Navigation preview</p>
              </div>
            </PanelSection>

            <PanelSection title="Menu behavior" group="chrome-header">
              <GalaxySegmentedControl
                label="Nested navigation"
                value={headerProps.navStyle ?? "standard"}
                options={[{ value: "standard", label: "Dropdown" }, { value: "mega", label: "Mega menu" }] as const}
                onChange={(navStyle) => onPatch({ navStyle })}
              />
              <p className="text-[9px] leading-relaxed text-black/40">Dropdown keeps groups compact. Mega menu gives larger groups more room when the design supports it.</p>
            </PanelSection>

            <PanelSection title="Menu links" group="chrome-header">
              <NavLinksEditor
                projectId={projectId}
                pages={pages}
                links={mapNavLinksForEditor((headerProps.links as Parameters<typeof mapNavLinksForEditor>[0]) ?? [])}
                onChange={(links) => onPatch({ links })}
              />
            </PanelSection>
          </>
        ) : (
          <>
            <PanelSection title="Copyright" group="chrome-footer" defaultOpen>
              <div className="grid grid-cols-[84px_1fr] gap-2">
                <GalaxyFieldLabel label="Year">
                  <input className={INPUT} type="number" value={footerProps.copyrightYear ?? currentYear} onChange={(event) => onPatch({ copyrightYear: parseInt(event.target.value) || currentYear })} />
                </GalaxyFieldLabel>
                <GalaxyFieldLabel label="Legal name">
                  <input className={INPUT} value={footerProps.legalName ?? ""} onChange={(event) => onPatch({ legalName: event.target.value })} placeholder="Your Business LLC" />
                </GalaxyFieldLabel>
              </div>
              <GalaxyFieldLabel label="Custom footer line">
                <input className={INPUT} value={String(footerProps.text ?? "")} onChange={(event) => onPatch({ text: event.target.value })} placeholder="Leave blank to generate copyright automatically" />
              </GalaxyFieldLabel>
            </PanelSection>

            <PanelSection title="Typography & colors" group="chrome-footer">
              <GalaxyFieldLabel label="Footer font">
                <input list="kebu-footer-fonts" className={INPUT} value={footerProps.fontFamily ?? ""} onChange={(event) => onPatch({ fontFamily: event.target.value || undefined })} placeholder="Same as site" />
                <datalist id="kebu-footer-fonts">{FONTS.map((font) => <option key={font} value={font} />)}</datalist>
              </GalaxyFieldLabel>
              {([["Background", "bgColor", footerProps.bgColor || "#0a0a0a"], ["Text", "textColor", footerProps.textColor || "#ffffff"]] as const).map(([label, key, value]) => (
                <GalaxyFieldLabel key={key} label={label}>
                  <div className="mt-1.5 flex items-center gap-2">
                    <input type="color" className="h-9 w-11 cursor-pointer rounded-lg border border-black/10 bg-white p-1" value={value} onChange={(event) => onPatch({ [key]: event.target.value })} />
                    <input className={INPUT} value={value} onChange={(event) => onPatch({ [key]: event.target.value })} />
                  </div>
                </GalaxyFieldLabel>
              ))}
            </PanelSection>

            <PanelSection title="Footer links" group="chrome-footer">
              <div className="space-y-2">
                {(footerProps.links ?? []).map((link, index) => (
                  <div key={index} className="grid grid-cols-[1fr_1fr_28px] gap-1.5">
                    <input className={INPUT} value={link.label} placeholder="Label" onChange={(event) => {
                      const links = [...(footerProps.links ?? [])];
                      links[index] = { ...links[index]!, label: event.target.value };
                      onPatch({ links });
                    }} />
                    <input className={INPUT} value={link.href} placeholder="/page" onChange={(event) => {
                      const links = [...(footerProps.links ?? [])];
                      links[index] = { ...links[index]!, href: event.target.value };
                      onPatch({ links });
                    }} />
                    <button type="button" aria-label="Remove footer link" className="rounded-lg text-red-600 hover:bg-red-50" onClick={() => onPatch({ links: (footerProps.links ?? []).filter((_, i) => i !== index) })}>×</button>
                  </div>
                ))}
                {(footerProps.links ?? []).length < 8 ? (
                  <button type="button" className="min-h-9 w-full rounded-lg border border-black/10 bg-white text-[10px] font-black uppercase tracking-wide text-black/60 outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A00]" onClick={() => onPatch({ links: [...(footerProps.links ?? []), { label: "", href: "/" }] })}>+ Add footer link</button>
                ) : null}
              </div>
            </PanelSection>
          </>
        )}
        {onRemove ? (
          <div className="border-t border-black/[0.07] pt-3">
            <button
              type="button"
              onClick={onRemove}
              className="w-full rounded-lg border border-red-100 bg-white px-3 py-2 text-[11px] font-semibold text-red-700 outline-none focus-visible:ring-2 focus-visible:ring-red-300"
            >
              {part === "header" ? "Remove navigation" : "Remove footer"}
            </button>
            <p className="mt-1.5 text-[9px] leading-relaxed text-black/40">
              You can add it again later. Existing pages and page content are not deleted.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
