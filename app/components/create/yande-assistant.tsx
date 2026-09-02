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
      <div className="h-1 w-full" style={{ background: BUILDER.gradient }} />
      <div className="p-5 sm:p-6 space-y-4">
        <div className="flex items-start gap-3">
          <YandeMark size={48} />
          <div>
            <p className="font-display text-lg font-bold leading-tight" style={{ fontFamily: "var(--font-fraunces)" }}>
              Yande
            </p>
            <p className="text-sm leading-relaxed mt-1" style={{ color: BUILDER.muted }}>
              {variant === "create"
                ? "Describe your business in your own words — Yande builds the first draft of your site structure."
                : "Tell Yande what to change. Your draft updates on the server; visitors still see the last published version until you publish again."}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              disabled={busy}
              onClick={() => onChange(s)}
              className="text-left rounded-full px-3.5 py-2 text-xs font-medium transition-colors disabled:opacity-50"
              style={{
                background: "#fff",
                color: BUILDER.ink,
                border: `1px solid ${BUILDER.border}`,
              }}
            >
              {s}
            </button>
          ))}
        </div>

        <textarea
          className="w-full text-sm rounded-xl px-4 py-3 min-h-[100px] resize-y focus:outline-none focus:ring-2 focus:ring-[#FF5500]/25"
          style={{
            background: "#fff",
            border: `1px solid ${BUILDER.border}`,
            color: BUILDER.ink,
          }}
          placeholder={
            variant === "create"
              ? "Example: I sell handmade bags in Dakar. I want a clean shop look, orange accents, and WhatsApp to order."
              : "Example: Make the homepage feel more premium and add a section for customer reviews."
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
            {busy ? "Yande is building…" : variant === "create" ? "Generate my site" : "Apply changes"}
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
