"use client";

import Link from "next/link";
import { BUILDER_APP_BLOCKS } from "@/lib/create/builder-block-registry";
import {
  GalaxyBadge,
  GalaxyButton,
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
        title="Site features"
        description="Add forms, maps, media, payments and other working features to this page."
      />
      <div className="space-y-3 p-3">
        {BUILDER_APP_BLOCKS.length ? (
          <div className="grid gap-2">
            {BUILDER_APP_BLOCKS.map((app) => {
              const alreadyOnSite = installed.has(app.type);
              return (
                <article
                  key={app.type}
                  className="group rounded-lg border border-black/[0.08] bg-white p-2.5 transition-colors hover:border-black/20"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                      style={{ background: BUILDER.orangeGlow, color: BUILDER.ink }}
                      aria-hidden
                    >
                      <StudioIcon name={APP_ICON[app.type] ?? "elements"} className="h-4 w-4"/>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h3 className="text-[11px] font-semibold text-black">{app.label}</h3>
                        <GalaxyBadge>{app.app?.provider === "kebu" ? "Kebu" : "Connection"}</GalaxyBadge>
                        {alreadyOnSite ? <GalaxyBadge>On site</GalaxyBadge> : null}
                      </div>
                      <p className="mt-1 text-[10px] leading-relaxed text-black/50">{app.description}</p>
                    </div>
                  </div>
                  <GalaxyButton
                    className="mt-3 w-full"
                    variant={alreadyOnSite ? "secondary" : "primary"}
                    onClick={() => void onAdd(app.type)}
                  >
                    {alreadyOnSite ? "Add another to this page" : "Add to this page"}
                  </GalaxyButton>
                </article>
              );
            })}
          </div>
        ) : (
          <GalaxyEmptyState title="No app blocks available" detail="Kebu app blocks will appear here when they are available for this site." />
        )}

        <div className="border-t border-black/[0.07] pt-3">
          <p className="text-[10px] font-semibold text-black/45">Selling on your site</p>
          <p className="mt-1 text-[10px] leading-relaxed text-black/50">
            Products, orders, customers, inventory and payments stay in Kebu Shop so the page editor remains focused.
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
