import type { ReactNode } from "react";
import { KEBU } from "@/lib/kebu-brand";

/**
 * Standardised empty state. Use whenever a list, table, or section has no data.
 * Keep the message specific: name what's missing and what the primary action does.
 */
export function KebuEmptyState({
  icon,
  title,
  body,
  action,
}: {
  /** Inline SVG or a single emoji string */
  icon?: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "3rem 1.5rem",
        borderRadius: KEBU.radius.xl,
        background: KEBU.cream,
        border: `1px solid ${KEBU.borders.subtle}`,
      }}
    >
      {icon ? (
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: KEBU.radius.lg,
            background: KEBU.borders.subtle,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "1rem",
            fontSize: "1.5rem",
          }}
        >
          {icon}
        </div>
      ) : null}
      <p
        style={{
          fontWeight: 700,
          fontSize: "0.9375rem",
          color: KEBU.black,
          marginBottom: body ? "0.375rem" : action ? "1.25rem" : 0,
        }}
      >
        {title}
      </p>
      {body ? (
        <p
          style={{
            fontSize: "0.8125rem",
            color: KEBU.muted,
            maxWidth: "24rem",
            lineHeight: 1.6,
            marginBottom: action ? "1.25rem" : 0,
          }}
        >
          {body}
        </p>
      ) : null}
      {action}
    </div>
  );
}
