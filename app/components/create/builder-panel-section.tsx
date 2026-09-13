"use client";

import { useState, type ReactNode } from "react";
import { BUILDER } from "@/lib/create/builder-ui";

export function PanelSection({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${BUILDER.border}` }}>
      <button
        type="button"
        className="flex w-full items-center justify-between px-3 py-2 text-[10px] font-bold uppercase tracking-wider"
        style={{ color: BUILDER.ink, background: "#FAFAF8" }}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{title}</span>
        <span style={{ fontSize: 8 }}>{open ? "▲" : "▼"}</span>
      </button>
      {open ? <div className="px-3 pb-3 pt-2 space-y-2">{children}</div> : null}
    </div>
  );
}
