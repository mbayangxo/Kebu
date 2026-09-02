"use client";

import { BUILDER } from "@/lib/create/builder-ui";

/** Modern Yande mark — small gradient orb for the global FAB. */
export function YandeMark({ size = 28 }: { size?: number }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-full font-bold text-white shadow-lg"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        background: BUILDER.gradient,
        boxShadow: "0 4px 20px rgba(255, 85, 0, 0.45)",
      }}
      aria-hidden
    >
      Y
    </span>
  );
}
