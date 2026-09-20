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

const APP_MARKS: Record<string, string> = {
  newsletter: "✉",
  form: "▤",
  map: "⌖",
  whatsapp: "◉",
  joko: "◈",
  audio: "♫",
  video: "▶",
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

  return (
    <div>
      <GalaxyPanelHeader
        eyebrow="Extend"
        title="Apps & blocks"
        description="Add useful capabilities to this site. Every block uses the same real Kebu save, responsive, and publish pipeline."
      />
      <div className="space-y-4 p-3">
        <div className="rounded-xl border border-black/[0.08] bg-[#FFF9F4] p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#FF6A00]">How it works</p>
          <p className="mt-1 text-[11px] leading-relaxed text-black/55">
            Add a block to the current page, then configure it in Build. Nothing here is a fake install or a local-only widget.
          </p>
        </div>

        {BUILDER_APP_BLOCKS.length ? (
          <div className="grid gap-2">
            {BUILDER_APP_BLOCKS.map((app) => {
              const alreadyOnSite = installed.has(app.type);
              return (
                <article
                  key={app.type}
                  className="group rounded-xl border border-black/[0.08] bg-white p-3 transition-[border-color,box-shadow] hover:border-black/15 hover:shadow-[0_4px_16px_rgba(10,10,10,0.05)]"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] text-[17px] font-black"
                      style={{ background: BUILDER.orangeGlow, color: BUILDER.ink }}
                      aria-hidden
                    >
                      {APP_MARKS[app.type] ?? "＋"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h3 className="text-[12px] font-black tracking-[-0.015em] text-black">{app.label}</h3>
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
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-black/40">Commerce lives in Kebu Shop</p>
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
