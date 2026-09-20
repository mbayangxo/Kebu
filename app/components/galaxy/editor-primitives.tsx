"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { GALAXY } from "@/lib/galaxy/tokens";

export const GALAXY_EDITOR = {
  ink: GALAXY.color.ink,
  muted: GALAXY.color.muted,
  border: GALAXY.color.border,
  surface: GALAXY.color.surface,
  surfaceSubtle: GALAXY.color.canvas,
  accent: GALAXY.color.orange,
  action: GALAXY.color.ink,
  danger: GALAXY.color.danger,
} as const;

export function GalaxyPanelHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-black/[0.07] px-4 py-3.5">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#FF6A00]">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="mt-0.5 text-[15px] font-black tracking-[-0.025em] text-black">{title}</h2>
        {description ? (
          <p className="mt-1 max-w-[29ch] text-[11px] leading-[1.45] text-black/50">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

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
    <section className="rounded-[12px] border border-black/[0.09] bg-white p-3.5 shadow-[0_1px_2px_rgba(10,10,10,0.03)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-black/45">
              {eyebrow}
            </p>
          ) : null}
          <p className="mt-1 truncate text-[13px] font-black tracking-[-0.015em] text-black">{title}</p>
        </div>
        {meta}
      </div>
      {children ? <div className="mt-2">{children}</div> : null}
    </section>
  );
}

export function GalaxyBadge({ children }: { children: ReactNode }) {
  return (
    <span className="shrink-0 rounded-full border border-black/[0.06] bg-[#F6F6F4] px-2 py-1 text-[9px] font-black uppercase tracking-wide text-black/55">
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
      ? "bg-black text-white border-black"
      : variant === "danger"
        ? "bg-white text-red-700 border-red-200"
        : "bg-white text-black/70 border-black/15 hover:border-black/30";

  return (
    <button
      {...props}
      type={props.type ?? "button"}
      className={`min-h-9 rounded-lg border px-3 py-2 text-[11px] font-bold outline-none transition-[border-color,background-color,transform] hover:-translate-y-px focus-visible:ring-2 focus-visible:ring-[#FF6A00] focus-visible:ring-offset-1 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 ${style} ${className}`}
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
    <label className="block text-[10px] font-bold uppercase tracking-[0.08em] text-black/55">
      {label}
      {children}
    </label>
  );
}

export function GalaxySegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div>
      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-black/55">{label}</p>
      <div className="grid gap-1 rounded-[10px] bg-[#F6F6F4] p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(option.value)}
              className="min-h-8 rounded-[7px] px-1.5 text-[9px] font-black uppercase tracking-[0.04em] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#FF6A00]"
              style={{
                background: active ? "#fff" : "transparent",
                color: active ? "#0A0A0A" : "#6B6B6B",
                boxShadow: active ? "0 1px 3px rgba(10,10,10,0.10)" : "none",
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function GalaxyEmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-[12px] border border-dashed border-black/15 bg-[#FFFCF8] px-4 py-6 text-center">
      <p className="text-[12px] font-black text-black/75">{title}</p>
      <p className="mx-auto mt-1 max-w-[28ch] text-[10px] leading-relaxed text-black/45">{detail}</p>
    </div>
  );
}

export function GalaxyToolRail({items,value,onChange}:{items:{id:string;label:string;icon:ReactNode}[];value:string;onChange:(id:string)=>void}){return <nav aria-label="Studio tools" className="flex gap-1 overflow-x-auto border-b border-black/[.07] bg-white p-1.5 lg:w-[68px] lg:flex-col lg:border-b-0 lg:border-r"><div className="flex gap-1 lg:flex-col">{items.map(x=>{const a=x.id===value;return <button key={x.id} type="button" aria-current={a?"page":undefined} onClick={()=>onChange(x.id)} className={`group flex min-h-12 min-w-12 flex-col items-center justify-center gap-1 rounded-[9px] px-1.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#FF6A00] ${a?"bg-black text-white":"text-black/55 hover:bg-black/[.045] hover:text-black"}`}><span className="h-[18px] w-[18px]">{x.icon}</span><span className="text-[8px] font-bold tracking-[-.01em]">{x.label}</span></button>})}</div></nav>}
export function GalaxyInspectorSection({title,children,defaultOpen=true}:{title:string;children:ReactNode;defaultOpen?:boolean}){return <details open={defaultOpen} className="group border-b border-black/[.07]"><summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2.5 text-[10px] font-black uppercase tracking-[.08em] text-black/55"><span>{title}</span><span className="text-black/30 transition-transform group-open:rotate-45">+</span></summary><div className="px-3 pb-3">{children}</div></details>}
export function GalaxyStatus({children,tone="neutral"}:{children:ReactNode;tone?:"neutral"|"error"|"success"}){return <div role={tone==="error"?"alert":"status"} className={`rounded-lg border px-2.5 py-2 text-[10px] ${tone==="error"?"border-red-200 bg-red-50 text-red-800":tone==="success"?"border-emerald-200 bg-emerald-50 text-emerald-800":"border-black/[.07] bg-black/[.025] text-black/55"}`}>{children}</div>}