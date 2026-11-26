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
      className="group/ps border-b border-black/[0.07] bg-white"
    >
      <summary
        className="flex min-h-10 cursor-pointer list-none items-center justify-between px-1 py-2.5 select-none outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#FF6A00]"
        style={{ background: "#fff", color: BUILDER.ink }}
      >
        <span className="text-[11px] font-semibold tracking-[-.01em]">{title}</span>
        <svg className="h-3 w-3 text-black/35 transition-transform group-open/ps:rotate-180" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden><path d="m4 6 4 4 4-4" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </summary>
      <div className="space-y-3 px-1 pb-4 pt-1">{children}</div>
    </details>
  );
}
