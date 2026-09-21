"use client";

import Link from "next/link";
import { BUILDER_APP_BLOCKS } from "@/lib/create/builder-block-registry";
import {
  GalaxyBadge,
  GalaxyEmptyState,
  GalaxyPanelHeader,
} from "@/app/components/galaxy/editor-primitives";
import { BUILDER } from "@/lib/create/builder-ui";
import { StudioIcon } from "@/app/components/studio/studio-icons";

const APP_ICON: Record<string, "elements" | "uploads"> = { newsletter:"elements", form:"elements", map:"elements", whatsapp:"elements", joko:"elements", audio:"uploads", video:"uploads" };

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

  return (
    <div>
      <GalaxyPanelHeader
        eyebrow="Extend"
        title="Apps & blocks"
        description="Add useful capabilities to this site. Every block uses the same real Kebu save, responsive, and publish pipeline."
      />
      <div className="space-y-3 p-3">
        {BUILDER_APP_BLOCKS.length ? (
          <div className="grid gap-2">
            {BUILDER_APP_BLOCKS.map((app) => {
              const alreadyOnSite = installed.has(app.type);
              return (
                <article key={app.type} className="group flex items-center gap-2.5 border-b border-black/[.07] py-2.5 last:border-b-0">
                  <div className="flex min-w-0 flex-1 items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-black/[.035] text-black/60" aria-hidden>
                      <StudioIcon name={APP_ICON[app.type] ?? "elements"} className="h-4 w-4"/>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h3 className="text-[11px] font-semibold text-black">{app.label}</h3>
                        <GalaxyBadge>{app.app?.provider === "kebu" ? "Kebu" : "Connection"}</GalaxyBadge>
                        {alreadyOnSite ? <GalaxyBadge>On site</GalaxyBadge> : null}
                      </div>
                      <p className="mt-0.5 truncate text-[9px] text-black/40">{app.description}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void onAdd(app.type)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-black/10 text-[15px] text-black/60 hover:border-black/25 hover:text-black"
                    aria-label={alreadyOnSite ? `Add another ${app.label}` : `Add ${app.label}`}
                  >
                    +
                  </button>
                </article>
              );
            })}
          </div>
        ) : (
          <GalaxyEmptyState title="No app blocks available" detail="Kebu app blocks will appear here when they are available for this site." />
        )}

        <div className="border-t border-black/[0.07] pt-3">
          <p className="text-[10px] font-semibold text-black/45">Commerce lives in Kebu Shop</p>
          <p className="mt-1 text-[10px] leading-relaxed text-black/50">
            Manage products, orders, customers, inventory, and payments outside the canvas.
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
