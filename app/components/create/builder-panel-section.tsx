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
      className="group/ps overflow-hidden"
      style={{ border: `1px solid ${BUILDER.border}`, borderRadius: 10 }}
    >
      <summary
        className="flex cursor-pointer list-none items-center justify-between px-3 py-2 select-none"
        style={{ background: "#FAFAF8", color: BUILDER.ink }}
      >
        <span className="text-[10px] font-bold uppercase tracking-wider">{title}</span>
        <span className="text-[8px] text-[#ABABAB] transition-transform group-open/ps:rotate-180" aria-hidden>▼</span>
      </summary>
      <div className="px-3 pb-3 pt-2 space-y-2">{children}</div>
    </details>
  );
}
