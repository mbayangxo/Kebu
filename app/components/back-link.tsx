"use client";

import { useRouter } from "next/navigation";

export function BackLink({
  fallbackHref = "/",
  label = "Back",
  className = "",
}: {
  fallbackHref?: string;
  label?: string;
  className?: string;
}) {
  const router = useRouter();

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
      className={`inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors hover:text-[#FF5500] ${className}`}
      style={{ color: "#5C5348" }}
    >
      <span aria-hidden>←</span>
      {label}
    </button>
  );
}
