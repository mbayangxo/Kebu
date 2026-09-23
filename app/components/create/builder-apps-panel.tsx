"use client";

import Link from "next/link";
import { useState } from "react";
import { BUILDER_APP_BLOCKS } from "@/lib/create/builder-block-registry";
import {
  GalaxyPanelHeader,
  GalaxyEmptyState,
} from "@/app/components/galaxy/editor-primitives";
import { BUILDER } from "@/lib/create/builder-ui";

function AppIcon({ type }: { type: string }) {
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7 } as const;
  if (type === "map") return <svg {...common} aria-hidden><path d="M12 21s6-5.2 6-11a6 6 0 10-12 0c0 5.8 6 11 6 11z"/><circle cx="12" cy="10" r="2"/></svg>;
  if (type === "audio") return <svg {...common} aria-hidden><path d="M9 18V5l10-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="16" cy="16" r="3"/></svg>;
  if (type === "video") return <svg {...common} aria-hidden><rect x="3" y="5" width="14" height="14" rx="2"/><path d="M17 10l4-2v8l-4-2z"/></svg>;
  if (type === "form") return <svg {...common} aria-hidden><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>;
  if (type === "newsletter") return <svg {...common} aria-hidden><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M4 7l8 6 8-6"/></svg>;
  if (type === "whatsapp") return <svg {...common} aria-hidden><path d="M20 11.5a8 8 0 01-11.8 7L4 20l1.5-4A8 8 0 1120 11.5z"/><path d="M9 8.5c.8 2.2 2.2 3.7 4.5 4.6"/></svg>;
  return <svg {...common} aria-hidden><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M8 12h8M12 8v8"/></svg>;
}

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
                    <span className="leading-none select-none" aria-hidden>
                      <AppIcon type={app.type} />
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

        <div className="border-t border-black/[0.07] pt-3 space-y-3">
          <div>
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
          <div>
            <p className="text-[10px] font-semibold text-black/45">Email automation</p>
            <p className="mt-1 text-[10px] leading-relaxed text-black/50">
              Send triggered sequences — welcome new subscribers, confirm orders, recover abandoned carts.
            </p>
            <Link
              href={`/my-sites/${projectId}/email`}
              className="mt-2 inline-flex min-h-9 w-full items-center justify-center rounded-lg border border-black/10 bg-white px-3 text-[11px] font-bold text-black transition hover:border-black/25"
            >
              Email flows ↗
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
