"use client";

import { BUILDER } from "@/lib/create/builder-ui";

export type BuilderCreateMode = "ai" | "photos" | "template" | "blank" | "import" | "code";

type ModeDef = {
  id: BuilderCreateMode;
  title: string;
  desc: string;
  icon: string;
  available: boolean;
};

const MODES: ModeDef[] = [
  {
    id: "ai",
    title: "Describe it — Yande designs",
    desc: "Yande is the designer. Describe the store → get a full editable site → keep instructing until it feels right.",
    icon: "✦",
    available: true,
  },
  {
    id: "photos",
    title: "Create from photos",
    desc: "Upload your product or place photos — Kebu builds an editable site around them.",
    icon: "▣",
    available: true,
  },
  {
    id: "template",
    title: "Start from an aesthetic",
    desc: "Optional inspiration from the Aesthetic store — still fully transformable with Yande.",
    icon: "◆",
    available: true,
  },
  {
    id: "blank",
    title: "Blank canvas",
    desc: "You add every page and section yourself.",
    icon: "○",
    available: true,
  },
  {
    id: "import",
    title: "Import my website",
    desc: "Kebu analyzes your existing site and reconstructs it as editable structured data.",
    icon: "↗",
    available: false,
  },
  {
    id: "code",
    title: "Build with code",
    desc: "For developers — code hooks alongside the Kebu schema.",
    icon: "</>",
    available: false,
  },
];

export function BuilderModePicker({
  value,
  onChange,
}: {
  value: BuilderCreateMode;
  onChange: (mode: BuilderCreateMode) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {MODES.map((m) => {
        const active = value === m.id;
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onChange(m.id)}
            className="text-left rounded-2xl p-4 transition-all"
            style={{
              background: active ? BUILDER.surface : BUILDER.surfaceMuted,
              border: active ? `2px solid ${BUILDER.orange}` : `1px solid ${BUILDER.border}`,
              boxShadow: active ? BUILDER.shadow : "none",
              opacity: m.available ? 1 : active ? 1 : 0.88,
            }}
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <span
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-sm"
                style={{
                  background: active ? BUILDER.orangeGlow : "#fff",
                  color: active ? BUILDER.orange : BUILDER.muted,
                }}
              >
                {m.icon}
              </span>
              {!m.available ? (
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                  style={{ background: "rgba(10,10,10,0.06)", color: BUILDER.muted }}
                >
                  Not implemented
                </span>
              ) : null}
            </div>
            <p className="text-sm font-bold leading-snug">{m.title}</p>
            <p className="text-xs mt-1.5 leading-relaxed" style={{ color: BUILDER.muted }}>
              {m.desc}
            </p>
          </button>
        );
      })}
    </div>
  );
}

export function isBuilderCreateModeImplemented(mode: BuilderCreateMode): boolean {
  return mode === "ai" || mode === "photos" || mode === "template" || mode === "blank";
}

export function BuilderSurface({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl p-5 sm:p-6 ${className}`}
      style={{
        background: BUILDER.surface,
        border: `1px solid ${BUILDER.border}`,
        boxShadow: BUILDER.shadowSoft,
      }}
    >
      {children}
    </div>
  );
}

export function BuilderFieldLabel({
  children,
  hint,
}: {
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <span className="block mb-2">
      <span className="text-sm font-semibold" style={{ color: BUILDER.ink }}>
        {children}
      </span>
      {hint ? (
        <span className="block text-xs mt-0.5 font-normal" style={{ color: BUILDER.faint }}>
          {hint}
        </span>
      ) : null}
    </span>
  );
}

export const builderInputClass =
  "w-full rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF5500]/30";

export const builderInputStyle = {
  border: `1px solid ${BUILDER.border}`,
  background: "#fff",
} as const;
