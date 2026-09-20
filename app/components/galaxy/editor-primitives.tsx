"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

export const GALAXY_EDITOR = {
  ink: "#111111",
  muted: "#6B6B6B",
  border: "#E5E5E5",
  surface: "#FFFFFF",
  surfaceSubtle: "#FAFAF8",
  accent: "#2C6ECB",
  action: "#0F0D33",
  danger: "#B91C1C",
} as const;

export function GalaxyInspectorCard({
  eyebrow,
  title,
  meta,
  children,
}: {
  eyebrow?: string;
  title: string;
  meta?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div
      className="rounded-xl border bg-white p-3"
      style={{ borderColor: "rgba(0,0,0,0.10)" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-black/45">
              {eyebrow}
            </p>
          ) : null}
          <p className="mt-1 truncate text-sm font-semibold text-black">{title}</p>
        </div>
        {meta}
      </div>
      {children ? <div className="mt-2">{children}</div> : null}
    </div>
  );
}

export function GalaxyBadge({ children }: { children: ReactNode }) {
  return (
    <span className="shrink-0 rounded-full bg-black/[0.05] px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-black/55">
      {children}
    </span>
  );
}

export function GalaxyButton({
  variant = "secondary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
}) {
  const style =
    variant === "primary"
      ? "bg-[#0F0D33] text-white border-transparent"
      : variant === "danger"
        ? "bg-white text-red-700 border-red-200"
        : "bg-white text-black/70 border-black/15";

  return (
    <button
      {...props}
      type={props.type ?? "button"}
      className={`rounded-lg border px-3 py-2 text-[12px] font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 ${style} ${className}`}
    />
  );
}

export function GalaxyFieldLabel({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block text-[11px] font-semibold text-black/65">
      {label}
      {children}
    </label>
  );
}
