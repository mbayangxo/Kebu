"use client";

import type { ReactNode } from "react";
import { BUILDER } from "@/lib/create/builder-ui";
import { useBuilderAccordion } from "@/app/components/create/use-builder-accordion";

export function PanelSection({
  title,
  children,
  defaultOpen = false,
  group,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  group?: string;
}) {
  const { open, setAccordionOpen } = useBuilderAccordion(group, defaultOpen);

  return (
    <details
      open={open}
      onToggle={(event) => setAccordionOpen(event.currentTarget.open)}
      className="group/ps overflow-hidden rounded-xl border border-black/[0.08] bg-white shadow-[0_1px_2px_rgba(10,10,10,0.02)]"
    >
      <summary
        className="flex min-h-10 cursor-pointer list-none items-center justify-between px-3 py-2.5 select-none outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#FF6A00]"
        style={{ background: BUILDER.surfaceMuted, color: BUILDER.ink }}
      >
        <span className="text-[10px] font-black uppercase tracking-[0.1em]">{title}</span>
        <span className="text-[8px] text-[#ABABAB] transition-transform group-open/ps:rotate-180" aria-hidden>▼</span>
      </summary>
      <div className="space-y-3 px-3 pb-3.5 pt-3">{children}</div>
    </details>
  );
}
