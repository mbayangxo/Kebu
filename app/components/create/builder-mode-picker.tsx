"use client";

import { BUILDER } from "@/lib/create/builder-ui";

const MODES = [
  {
    id: "template" as const,
    title: "Start from a design",
    desc: "Browse live previews — pick a look, then customize.",
    icon: "◆",
  },
  {
    id: "ai" as const,
    title: "Describe it to Yande",
    desc: "Tell Yande your business — get a tailored first draft.",
    icon: "✦",
  },
  {
    id: "blank" as const,
    title: "Blank canvas",
    desc: "Empty site — you add every section yourself.",
    icon: "○",
  },
];

export function BuilderModePicker({
  value,
  onChange,
}: {
  value: "ai" | "template" | "blank";
  onChange: (mode: "ai" | "template" | "blank") => void;
}) {
  return (
    <div className="grid sm:grid-cols-3 gap-3">
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
            }}
          >
            <span
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-sm mb-3"
              style={{
                background: active ? BUILDER.orangeGlow : "#fff",
                color: active ? BUILDER.orange : BUILDER.muted,
              }}
            >
              {m.icon}
            </span>
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
