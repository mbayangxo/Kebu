"use client";

import { NavLinksEditor, mapNavLinksForEditor } from "@/app/components/create/nav-links-editor";
import { NavSizeEditor } from "@/app/components/create/nav-size-editor";
import { PanelSection } from "@/app/components/create/builder-panel-section";
import { BUILDER } from "@/lib/create/builder-ui";
import { clampNavScale, parseNavLayout, parseNavSize } from "@/lib/create/nav-chrome-size";
import type { SiteChrome } from "@/lib/create/site-chrome";

export function BuilderSiteChromePanel({
  part,
  chrome,
  selected,
  onSelect,
  onPatch,
}: {
  part: "header" | "footer";
  chrome: SiteChrome;
  selected: boolean;
  onSelect: () => void;
  onPatch: (patch: Record<string, unknown>) => void;
}) {
  const label =
    part === "header" ? "Header — brand & menu (all pages)" : "Footer — links & colors (all pages)";

  const headerProps = (chrome.header?.props ?? {
    brand: "",
    links: [] as { label: string; href: string }[],
    navScale: 1,
    navSize: "comfortable" as const,
    navLayout: "top" as const,
    logoAlign: "left" as const,
    navSticky: true,
  }) as {
    brand?: string;
    links?: Parameters<typeof mapNavLinksForEditor>[0];
    navScale?: number;
    navSize?: string;
    navLayout?: string;
    logoAlign?: "left" | "center" | "right";
    navSticky?: boolean;
  };

  const footerProps = (chrome.footer?.props ?? { text: "", links: [], bgColor: "", textColor: "" }) as {
    text?: string;
    legalName?: string;
    copyrightYear?: number;
    fontFamily?: string;
    links?: { label: string; href: string }[];
    bgColor?: string;
    textColor?: string;
  };

  const currentYear = new Date().getFullYear();

  return (
    <div
      className="rounded-2xl p-3"
      style={{
        background: selected ? "#FFF3EB" : "#fff",
        border: selected ? "2px solid #FF5500" : "1px solid #DDE0F0",
      }}
    >
      <button
        type="button"
        className="mb-2 text-[10px] font-bold uppercase tracking-wider text-left w-full"
        style={{ color: BUILDER.orange }}
        onClick={onSelect}
      >
        {label}
      </button>

      {selected && part === "header" ? (
        <div className="space-y-2">
          <PanelSection title="Brand & Logo">
            <input
              className="w-full text-sm rounded-lg px-2 py-1.5"
              style={{ border: "1px solid #DDE0F0" }}
              value={String(headerProps.brand ?? "")}
              onChange={(e) => onPatch({ brand: e.target.value })}
              aria-label="Brand name"
              placeholder="Brand name"
            />
            <div className="grid grid-cols-3 gap-1">
              {(["left", "center", "right"] as const).map((align) => (
                <button
                  key={align}
                  type="button"
                  className="rounded-lg px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider capitalize"
                  style={{
                    background: (headerProps.logoAlign ?? "left") === align ? "#0F0D33" : "#fff",
                    color: (headerProps.logoAlign ?? "left") === align ? "#fff" : "#0F0D33",
                    border: "1px solid #DDE0F0",
                  }}
                  aria-pressed={(headerProps.logoAlign ?? "left") === align}
                  onClick={() => onPatch({ logoAlign: align })}
                >
                  {align}
                </button>
              ))}
            </div>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#5C5348" }}>
                Sticky nav
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={headerProps.navSticky !== false}
                onClick={() => onPatch({ navSticky: !(headerProps.navSticky !== false) })}
                className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
                style={{ background: headerProps.navSticky !== false ? "#FF5500" : "#DDE0F0" }}
              >
                <span
                  className="inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform"
                  style={{ transform: headerProps.navSticky !== false ? "translateX(18px)" : "translateX(2px)" }}
                />
              </button>
            </label>
          </PanelSection>
          <PanelSection title="Nav links">
            <NavLinksEditor
              links={mapNavLinksForEditor(
                (headerProps.links as Parameters<typeof mapNavLinksForEditor>[0]) ?? [],
              )}
              onChange={(links) => onPatch({ links })}
            />
          </PanelSection>
          <PanelSection title="Nav size">
            <NavSizeEditor
              scale={clampNavScale(headerProps.navScale, 1)}
              size={parseNavSize(headerProps.navSize)}
              layout={parseNavLayout(headerProps.navLayout)}
              onChange={onPatch}
            />
          </PanelSection>
        </div>
      ) : null}

      {selected && part === "footer" ? (
        <div className="space-y-2">
          <PanelSection title="Copyright">
            <div className="flex gap-1">
              <input
                className="w-16 text-xs rounded px-2 py-1 shrink-0"
                style={{ border: "1px solid #DDE0F0" }}
                type="number"
                value={footerProps.copyrightYear ?? currentYear}
                onChange={(e) => onPatch({ copyrightYear: parseInt(e.target.value) || currentYear })}
                aria-label="Copyright year"
                placeholder="2026"
              />
              <input
                className="flex-1 text-xs rounded px-2 py-1"
                style={{ border: "1px solid #DDE0F0" }}
                value={footerProps.legalName ?? ""}
                onChange={(e) => onPatch({ legalName: e.target.value })}
                aria-label="Legal name"
                placeholder="Your Business LLC"
              />
            </div>
            <input
              className="w-full text-sm rounded-lg px-2 py-1.5"
              style={{ border: "1px solid #DDE0F0" }}
              value={String(footerProps.text ?? "")}
              onChange={(e) => onPatch({ text: e.target.value })}
              aria-label="Footer text (overrides copyright line)"
              placeholder="Custom text — leave blank to auto-generate"
            />
          </PanelSection>
          <PanelSection title="Font">
            <select
              className="w-full text-xs rounded px-2 py-1"
              style={{ border: "1px solid #DDE0F0", background: "#fff" }}
              value={footerProps.fontFamily ?? ""}
              onChange={(e) => onPatch({ fontFamily: e.target.value || undefined })}
              aria-label="Footer font"
            >
              <option value="">Same as site</option>
              <option value="system-ui, sans-serif">System (clean)</option>
              <option value="Georgia, serif">Georgia (classic)</option>
              <option value="'Courier New', monospace">Courier (mono)</option>
              <option value="'Playfair Display', serif">Playfair (elegant)</option>
              <option value="'Oswald', sans-serif">Oswald (bold)</option>
              <option value="'IBM Plex Sans', sans-serif">IBM Plex (modern)</option>
            </select>
          </PanelSection>
          <PanelSection title="Colors">
            <label className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider w-16 shrink-0" style={{ color: "#5C5348" }}>Background</span>
              <input
                type="color"
                className="h-7 w-10 cursor-pointer rounded border"
                style={{ border: "1px solid #DDE0F0" }}
                value={footerProps.bgColor || "#0a0a0a"}
                onChange={(e) => onPatch({ bgColor: e.target.value })}
              />
              <input
                className="flex-1 text-xs rounded px-2 py-1"
                style={{ border: "1px solid #DDE0F0" }}
                value={footerProps.bgColor || ""}
                onChange={(e) => onPatch({ bgColor: e.target.value })}
                placeholder="#0a0a0a"
              />
            </label>
            <label className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider w-16 shrink-0" style={{ color: "#5C5348" }}>Text</span>
              <input
                type="color"
                className="h-7 w-10 cursor-pointer rounded border"
                style={{ border: "1px solid #DDE0F0" }}
                value={footerProps.textColor || "#ffffff"}
                onChange={(e) => onPatch({ textColor: e.target.value })}
              />
              <input
                className="flex-1 text-xs rounded px-2 py-1"
                style={{ border: "1px solid #DDE0F0" }}
                value={footerProps.textColor || ""}
                onChange={(e) => onPatch({ textColor: e.target.value })}
                placeholder="#ffffff"
              />
            </label>
          </PanelSection>
          <PanelSection title="Links">
            {(footerProps.links ?? []).map((link, i) => (
              <div key={i} className="flex gap-1">
                <input
                  className="flex-1 text-xs rounded px-2 py-1"
                  style={{ border: "1px solid #DDE0F0" }}
                  value={link.label}
                  placeholder="Label"
                  onChange={(e) => {
                    const next = [...(footerProps.links ?? [])];
                    next[i] = { ...next[i], label: e.target.value };
                    onPatch({ links: next });
                  }}
                />
                <input
                  className="flex-1 text-xs rounded px-2 py-1"
                  style={{ border: "1px solid #DDE0F0" }}
                  value={link.href}
                  placeholder="/page"
                  onChange={(e) => {
                    const next = [...(footerProps.links ?? [])];
                    next[i] = { ...next[i], href: e.target.value };
                    onPatch({ links: next });
                  }}
                />
                <button
                  type="button"
                  className="text-xs px-2 rounded"
                  style={{ border: "1px solid #DDE0F0", color: "#999" }}
                  onClick={() => {
                    const next = (footerProps.links ?? []).filter((_, j) => j !== i);
                    onPatch({ links: next });
                  }}
                >
                  ×
                </button>
              </div>
            ))}
            {(footerProps.links ?? []).length < 6 && (
              <button
                type="button"
                className="text-[10px] font-bold uppercase tracking-wider"
                style={{ color: "#FF5500" }}
                onClick={() => {
                  const next = [...(footerProps.links ?? []), { label: "", href: "/" }];
                  onPatch({ links: next });
                }}
              >
                + Add link
              </button>
            )}
          </PanelSection>
        </div>
      ) : null}
    </div>
  );
}
