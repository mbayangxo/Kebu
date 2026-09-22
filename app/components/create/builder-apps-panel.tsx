"use client";

import Link from "next/link";
import { useState } from "react";
import { BUILDER_APP_BLOCKS } from "@/lib/create/builder-block-registry";
import {
  GalaxyPanelHeader,
  GalaxyEmptyState,
} from "@/app/components/galaxy/editor-primitives";
import { BUILDER } from "@/lib/create/builder-ui";

const APP_EMOJI: Record<string, string> = {
  newsletter: "✉️",
  form: "📋",
  map: "📍",
  whatsapp: "💬",
  joko: "💳",
  audio: "🎵",
  video: "▶️",
};

export function BuilderAppsPanel({
  projectId,
  sectionTypes,
  onAdd,
}: {
  projectId: string;
  sectionTypes: string[];
  onAdd: (type: string) => void | Promise<void>;
}) {
  const installed = new Set(sectionTypes);
  const [tooltip, setTooltip] = useState<string | null>(null);

  return (
    <div>
      <GalaxyPanelHeader
        eyebrow="Extend"
        title="Apps"
        description="Add forms, maps, media, payments and other features to this page."
      />
      <div className="p-3 space-y-4">
        {BUILDER_APP_BLOCKS.length ? (
          <div className="grid grid-cols-4 gap-1.5">
            {BUILDER_APP_BLOCKS.map((app) => {
              const on = installed.has(app.type);
              const isHovered = tooltip === app.type;
              return (
                <div key={app.type} className="relative flex flex-col items-center">
                  <button
                    type="button"
                    title={app.label}
                    onMouseEnter={() => setTooltip(app.type)}
                    onMouseLeave={() => setTooltip(null)}
                    onFocus={() => setTooltip(app.type)}
                    onBlur={() => setTooltip(null)}
                    onClick={() => void onAdd(app.type)}
                    className="relative flex h-12 w-12 flex-col items-center justify-center rounded-xl border outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A00] transition-colors"
                    style={{
                      background: on ? BUILDER.orangeGlow : "#fff",
                      borderColor: on ? BUILDER.orange : BUILDER.border,
                      color: BUILDER.ink,
                    }}
                    aria-label={`${app.label}${on ? " (on site)" : ""}`}
                  >
                    <span className="text-[18px] leading-none select-none" aria-hidden>
                      {APP_EMOJI[app.type] ?? "🔌"}
                    </span>
                    {on && (
                      <span
                        className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full text-white"
                        style={{ background: BUILDER.orange, fontSize: 7 }}
                        aria-hidden
                      >
                        ✓
                      </span>
                    )}
                  </button>
                  <span
                    className="mt-1 max-w-[52px] text-center text-[9px] font-semibold leading-tight"
                    style={{ color: BUILDER.muted }}
                  >
                    {app.label}
                  </span>

                  {/* Tooltip */}
                  {isHovered && (
                    <div
                      className="absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 rounded-lg px-2.5 py-2 text-[10px] leading-snug shadow-xl whitespace-nowrap pointer-events-none"
                      style={{ background: BUILDER.ink, color: "#fff", maxWidth: 180, whiteSpace: "normal" }}
                      role="tooltip"
                    >
                      <p className="font-bold">{app.label}</p>
                      <p className="mt-0.5 opacity-75">{app.description}</p>
                      {on && <p className="mt-1 font-semibold" style={{ color: BUILDER.orange }}>Already on page</p>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <GalaxyEmptyState title="No apps available" detail="Kebu app blocks will appear here when available for this site." />
        )}

        <div className="border-t border-black/[0.07] pt-3">
          <p className="text-[10px] font-semibold text-black/45">Selling on your site</p>
          <p className="mt-1 text-[10px] leading-relaxed text-black/50">
            Products, orders, customers and payments live in Kebu Shop — the page editor stays focused.
          </p>
          <Link
            href={`/shop/${projectId}`}
            className="mt-2 inline-flex min-h-9 w-full items-center justify-center rounded-lg border border-black/10 bg-white px-3 text-[11px] font-bold text-black transition hover:border-black/25"
          >
            Open Kebu Shop ↗
          </Link>
        </div>
      </div>
    </div>
  );
}
