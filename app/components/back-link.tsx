"use client";

import { useRouter } from "next/navigation";

/**
 * Go to the previous page in history, or fallbackHref if there is no history
 * (e.g. opened in a new tab). Shown on every product screen.
 */
export function BackLink({
  fallbackHref = "/",
  label = "Back",
  className = "",
  variant = "muted",
}: {
  fallbackHref?: string;
  label?: string;
  className?: string;
  /** muted = cream UI; onDark = white text for black headers; strong = high-contrast orange */
  variant?: "muted" | "onDark" | "strong";
}) {
  const router = useRouter();

  const color =
    variant === "onDark" ? "rgba(255,255,255,0.85)" : variant === "strong" ? "#FF5500" : "#5C5348";

  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== "undefined" && window.history.length > 1) {
          router.back();
          return;
        }
        router.push(fallbackHref);
      }}
      className={`inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] transition-opacity hover:opacity-80 shrink-0 ${className}`}
      style={{ color }}
      aria-label={label}
    >
      <span aria-hidden className="text-sm leading-none">
        ←
      </span>
      {label}
    </button>
  );
}
