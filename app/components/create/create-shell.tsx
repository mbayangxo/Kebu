"use client";

import Link from "next/link";
import { KebuMark } from "@/app/components/kebu-mark";
import { KEBU } from "@/lib/kebu-brand";

export type CreateJourneyStep = "start" | "edit" | "preview" | "live";

const STEPS: { id: CreateJourneyStep; label: string }[] = [
  { id: "start", label: "Pick template" },
  { id: "edit", label: "Edit" },
  { id: "preview", label: "Preview" },
  { id: "live", label: "Go live" },
];

export function CreateShell({
  step,
  projectId,
  title = "Kebu Builder",
  backHref = "/create",
  actions,
}: {
  step: CreateJourneyStep;
  projectId?: string;
  title?: string;
  backHref?: string;
  actions?: React.ReactNode;
}) {
  const stepIndex = STEPS.findIndex((s) => s.id === step);

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md" style={{ background: "rgba(255,251,247,0.95)" }}>
      <div
        className="h-[3px] w-full"
        style={{ background: `linear-gradient(90deg, ${KEBU.red}, ${KEBU.orange}, ${KEBU.orangeLight})` }}
      />
      <div
        className="max-w-6xl mx-auto px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        style={{ borderBottom: `1px solid ${KEBU.border}` }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Link href={backHref} className="flex items-center gap-2 shrink-0" style={{ color: KEBU.black }}>
            <KebuMark size={26} />
            <span className="font-bold tracking-[0.12em] text-xs sm:text-sm truncate">{title}</span>
          </Link>
        </div>

        <nav aria-label="Build journey" className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {STEPS.map((s, i) => {
            const done = i < stepIndex;
            const active = s.id === step;
            const href =
              s.id === "start"
                ? "/create/new"
                : s.id === "edit" && projectId
                  ? `/create/${projectId}`
                  : s.id === "preview" && projectId
                    ? `/create/${projectId}/preview`
                    : null;

            const pill = (
              <span
                className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap"
                style={{
                  background: active ? KEBU.orange : done ? KEBU.cream : "transparent",
                  color: active ? KEBU.white : done ? KEBU.orange : KEBU.faint,
                  border: active || done ? "none" : `1px solid ${KEBU.border}`,
                }}
              >
                <span
                  className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[9px]"
                  style={{
                    background: active ? KEBU.white : done ? KEBU.orange : "rgba(10,10,10,0.08)",
                    color: active ? KEBU.orange : done ? KEBU.white : KEBU.muted,
                  }}
                >
                  {done ? "✓" : i + 1}
                </span>
                {s.label}
              </span>
            );

            if (href && !active) {
              return (
                <Link key={s.id} href={href} className="shrink-0">
                  {pill}
                </Link>
              );
            }
            return (
              <span key={s.id} className="shrink-0" aria-current={active ? "step" : undefined}>
                {pill}
              </span>
            );
          })}
        </nav>

        {actions ? <div className="flex items-center gap-2 shrink-0">{actions}</div> : null}
      </div>
    </header>
  );
}
