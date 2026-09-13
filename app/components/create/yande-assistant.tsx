"use client";

import { YandeMark } from "@/app/components/yande-mark";
import { BUILDER, YANDE_SUGGESTIONS_CREATE, YANDE_SUGGESTIONS_IMPROVE } from "@/lib/create/builder-ui";

type YandeAssistantProps = {
  variant: "create" | "improve";
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  busy?: boolean;
  submitLabel?: string;
  /** Collapsed trigger only (editor toolbar) */
  collapsed?: boolean;
  onExpand?: () => void;
};

export function YandeAssistant({
  variant,
  value,
  onChange,
  onSubmit,
  onCancel,
  busy = false,
  submitLabel,
  collapsed = false,
  onExpand,
}: YandeAssistantProps) {
  const suggestions =
    variant === "create" ? YANDE_SUGGESTIONS_CREATE : YANDE_SUGGESTIONS_IMPROVE;

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={onExpand}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-full pl-1 pr-4 py-1 text-sm font-semibold transition-all hover:brightness-105 disabled:opacity-50"
        style={{
          background: BUILDER.ink,
          color: "#fff",
          boxShadow: BUILDER.shadowSoft,
        }}
      >
        <YandeMark size={28} />
        {busy ? "Yande is working…" : "Ask Yande"}
      </button>
    );
  }

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: BUILDER.yandeGradient,
        boxShadow: BUILDER.shadow,
        border: `1px solid ${BUILDER.border}`,
      }}
    >
      <div className="h-0.5 w-full" style={{ background: BUILDER.gradient }} />
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2.5">
          <YandeMark size={36} />
          <p className="font-semibold text-sm leading-tight" style={{ color: BUILDER.ink }}>
            {variant === "create" ? "Describe your site" : "What should Yande change?"}
          </p>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
          {suggestions.slice(0, 4).map((s) => (
            <button
              key={s}
              type="button"
              disabled={busy}
              onClick={() => onChange(s)}
              className="shrink-0 text-left rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors disabled:opacity-50 max-w-[180px] truncate"
              style={{
                background: "#fff",
                color: BUILDER.ink,
                border: `1px solid ${BUILDER.border}`,
              }}
              title={s}
            >
              {s}
            </button>
          ))}
        </div>

        <textarea
          className="w-full text-sm rounded-xl px-3 py-2.5 min-h-[80px] resize-y focus:outline-none focus:ring-2 focus:ring-[#FF5500]/25"
          style={{
            background: "#fff",
            border: `1px solid ${BUILDER.border}`,
            color: BUILDER.ink,
          }}
          placeholder={
            variant === "create"
              ? "Senegalese fashion store. Luxury editorial. Sand, green, gold. Founder story below hero."
              : "Less Shopify-looking. Add wholesale section. Mobile completely different."
          }
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={variant === "create" ? 1000 : 800}
          disabled={busy}
          aria-label={variant === "create" ? "Describe your site for Yande" : "What Yande should improve"}
        />

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onSubmit}
            disabled={busy || !value.trim()}
            className="rounded-full px-6 py-2.5 text-sm font-bold disabled:opacity-40 transition-all hover:brightness-105"
            style={{ background: BUILDER.gradient, color: "#fff" }}
          >
            {busy
              ? "Yande is building…"
              : submitLabel ??
                (variant === "create" ? "Generate my site" : "Apply changes")}
          </button>
          {onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="text-sm font-medium disabled:opacity-50"
              style={{ color: BUILDER.muted }}
            >
              Cancel
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
