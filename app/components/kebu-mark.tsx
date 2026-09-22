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
    <Image
      src="/brand/kebu-mark.png"
      alt="Kebu"
      width={size}
      height={size}
      className={className}
      priority
    />
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
          fontFamily: "var(--font-jost), system-ui, sans-serif",
          letterSpacing: "-0.04em",
          color: dark ? "#0A0A0A" : "#FFFFFF",
        }}
        className="font-black text-[22px] leading-none select-none"
      >
        kebu
      </span>
    </span>
  );
}
