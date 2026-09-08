"use client";

import { NavLinksEditor } from "@/app/components/create/nav-links-editor";
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
  const label = part === "header" ? "Site header (all pages)" : "Site footer (all pages)";
  const props =
    part === "header"
      ? (chrome.header?.props ?? { brand: "", links: [] })
      : (chrome.footer?.props ?? { text: "" });

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
            value={String(props.brand ?? "")}
            onChange={(e) => onPatch({ brand: e.target.value })}
            aria-label="Brand name"
            placeholder="Brand name"
          />
          <NavLinksEditor
            links={((props.links as { label?: string; href?: string }[]) ?? []).map((l) => ({
              label: String(l.label ?? ""),
              href: String(l.href ?? ""),
            }))}
            onChange={(links) => onPatch({ links })}
          />
          <NavSizeEditor
            scale={clampNavScale(props.navScale, 1)}
            size={parseNavSize(props.navSize)}
            layout={parseNavLayout(props.navLayout)}
            onChange={onPatch}
          />
        </div>
      ) : null}

      {selected && part === "footer" ? (
        <input
          className="w-full text-sm rounded-lg px-2 py-1.5"
          style={{ border: "1px solid #DDE0F0" }}
          value={String(props.text ?? "")}
          onChange={(e) => onPatch({ text: e.target.value })}
          aria-label="Footer text"
          placeholder="© Your business"
        />
      ) : null}
    </div>
  );
}
