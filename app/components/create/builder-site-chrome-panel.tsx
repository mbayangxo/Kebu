"use client";

import { NavLinksEditor, mapNavLinksForEditor } from "@/app/components/create/nav-links-editor";
import { NavSizeEditor } from "@/app/components/create/nav-size-editor";
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
    part === "header" ? "Header — brand & menu (all pages)" : "Footer — bottom bar (all pages)";
  const headerProps = (chrome.header?.props ?? {
    brand: "",
    links: [] as { label: string; href: string }[],
    navScale: 1,
    navSize: "comfortable" as const,
    navLayout: "top" as const,
  }) as {
    brand?: string;
    links?: Parameters<typeof mapNavLinksForEditor>[0];
    navScale?: number;
    navSize?: string;
    navLayout?: string;
  };
  const footerProps = (chrome.footer?.props ?? { text: "" }) as { text?: string };

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
          <input
            className="w-full text-sm rounded-lg px-2 py-1.5"
            style={{ border: "1px solid #DDE0F0" }}
            value={String(headerProps.brand ?? "")}
            onChange={(e) => onPatch({ brand: e.target.value })}
            aria-label="Brand name"
            placeholder="Brand name"
          />
          <NavLinksEditor
            links={mapNavLinksForEditor(
              (headerProps.links as Parameters<typeof mapNavLinksForEditor>[0]) ?? [],
            )}
            onChange={(links) => onPatch({ links })}
          />
          <NavSizeEditor
            scale={clampNavScale(headerProps.navScale, 1)}
            size={parseNavSize(headerProps.navSize)}
            layout={parseNavLayout(headerProps.navLayout)}
            onChange={onPatch}
          />
        </div>
      ) : null}

      {selected && part === "footer" ? (
        <input
          className="w-full text-sm rounded-lg px-2 py-1.5"
          style={{ border: "1px solid #DDE0F0" }}
          value={String(footerProps.text ?? "")}
          onChange={(e) => onPatch({ text: e.target.value })}
          aria-label="Footer text"
          placeholder="© Your business"
        />
      ) : null}
    </div>
  );
}
