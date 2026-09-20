"use client";

import Image from "next/image";

interface MarkProps {
  className?: string;
  size?: number;
}

/** Kebu's angular K mark, built from the canonical black/orange/red shards. */
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
      <path fill="#FF7C5C" d="M12 9h18v23l-8 8 8 8v23H12V9Z" />
      <path fill="currentColor" d="M32 9h34L42 35H24l8-8V9Z" />
      <path fill="#FF1F1F" d="m39 34 27-25v22L51 44H39V34Z" />
      <path fill="#FF6A00" d="m39 42 29 29H43L24 50l8-8h7Z" />
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
