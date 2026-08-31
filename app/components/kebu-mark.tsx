"use client";

import Image from "next/image";

interface MarkProps {
  className?: string;
  size?: number;
}

/**
 * Kebu mark — Africa emblem on orange.
 * Continent silhouette + red energy bar (matches brand orange / black / red).
 */
export function KebuMark({ size = 40, className = "" }: MarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Kebu"
      role="img"
    >
      <rect width="80" height="80" rx="18" fill="#FF5500" />
      {/* Recognizable Africa outline (simplified for mark size) */}
      <path
        fill="#FFF8F2"
        d="M42 12c-5.5.4-10.5 3.2-13.8 7.8-2.2 3.1-3.4 6.9-3.2 10.7.1 2.6 1 5.1 2.6 7.1.7.9.8 2.1.2 3.1-1.6 2.8-4.6 4.6-7.8 5.4-2 .5-3.6 1.8-4.5 3.6-1.3 2.6-1 5.7.8 7.9 1.4 1.7 3.5 2.6 5.7 2.4 1.4-.1 2.7.7 3.2 2 .7 1.8.3 3.9-1.1 5.2-1.3 1.2-2.2 2.9-2.3 4.7-.1 2.4 1.1 4.7 3.1 6 2.2 1.4 5.1 1.5 7.4.3 1.4-.7 3.1-.6 4.4.3 1.9 1.3 3.2 3.4 3.5 5.6.2 1.4 1.1 2.6 2.3 3.3 1.5.9 3.4 1.1 5.1.5 1.6-.6 2.9-1.9 3.5-3.5.7-1.9 1.9-3.6 3.5-4.8 1.4-1 3.2-1.1 4.7-.2 2.2 1.3 5 1.4 7.3.3 2.1-1 3.6-3 4-5.2.4-2.1-.3-4.3-1.8-5.8-1.2-1.2-2-2.9-2.1-4.6-.1-1.5.6-2.9 1.8-3.7 2.4-1.7 4.3-4.2 5.1-7.1.8-2.9.4-6-1.1-8.6-1.5-2.6-4-4.5-6.9-5.2-1.3-.3-2.4-1.2-3-2.4-1-2-1.2-4.3-.5-6.4.8-2.4 2.5-4.4 4.7-5.6 1.3-.7 2.3-1.9 2.7-3.3.6-2.2.1-4.6-1.3-6.4C55.2 14.8 51.8 12.6 48 12c-2-.3-4-.2-6 0z"
      />
      <rect x="26" y="69" width="28" height="4" rx="2" fill="#E10600" />
    </svg>
  );
}

/** Raster mark from brand assets (PNG). Prefer KebuMark SVG in UI. */
export function KebuMarkImage({ size = 40, className = "" }: MarkProps) {
  return (
    <Image
      src="/brand/kebu-mark.png"
      alt="Kebu"
      width={size}
      height={size}
      className={`rounded-[22%] ${className}`}
      priority
    />
  );
}

export function KebuWordmark({
  size = 36,
  className = "",
  dark = true,
}: MarkProps & { dark?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <KebuMark size={size} />
      <span
        style={{
          fontFamily: "var(--font-fraunces)",
          letterSpacing: "0.16em",
          color: dark ? "#0A0A0A" : "#FF5500",
        }}
        className="font-bold text-[18px] leading-none select-none uppercase"
      >
        Kebu
      </span>
    </span>
  );
}
