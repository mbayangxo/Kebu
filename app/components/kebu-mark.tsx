"use client";

import Image from "next/image";

interface MarkProps {
  className?: string;
  size?: number;
  style?: React.CSSProperties;
}

/**
 * Kebu K mark — inline SVG so it scales crisp at any size.
 * Matches brand DNA: double black stem + orange-to-red gradient arm/leg + sparkle joint.
 */
export function KebuMark({ size = 40, className = "", style }: MarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      aria-label="Kebu"
      className={className}
      style={style}
    >
      <defs>
        <linearGradient id="km-flame" x1="80" y1="5" x2="20" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FF8C00"/>
          <stop offset="50%" stopColor="#FF4400"/>
          <stop offset="100%" stopColor="#CC1100"/>
        </linearGradient>
      </defs>
      {/* Double black stem */}
      <rect x="8" y="8" width="13" height="84" rx="2" fill="#0A0A0A"/>
      <rect x="23" y="8" width="5" height="84" rx="1" fill="#0A0A0A"/>
      {/* Gradient upper arm */}
      <path d="M28 8 C 50 8, 88 8, 88 8 C 88 16, 60 32, 36 50 L 28 50 Z" fill="url(#km-flame)"/>
      {/* Gradient lower leg */}
      <path d="M28 52 L 36 52 C 60 68, 88 84, 88 92 C 88 92, 50 92, 28 92 Z" fill="url(#km-flame)"/>
      {/* Black negative-space cut for upper arm */}
      <path d="M28 14 L 72 14 C 76 14 76 20 73 22 L 38 46 L 28 46 Z" fill="#0A0A0A"/>
      {/* Black negative-space cut for lower leg */}
      <path d="M28 58 L 38 58 L 73 78 C 76 80 76 86 72 86 L 28 86 Z" fill="#0A0A0A"/>
      {/* Sparkle at K joint */}
      <circle cx="33" cy="51" r="3.5" fill="#FF6A00"/>
    </svg>
  );
}

/** App icon variant — K mark on a black rounded square, matches brand DNA app icon. */
export function KebuMarkImage({ size = 40, className = "" }: MarkProps) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-[22%] ${className}`}
      style={{ width: size, height: size, background: "#0A0A0A", flexShrink: 0 }}
      aria-label="Kebu"
    >
      <svg width={size * 0.72} height={size * 0.72} viewBox="0 0 100 100" fill="none">
        <defs>
          <linearGradient id="kmi-flame" x1="80" y1="5" x2="20" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FF8C00"/>
            <stop offset="50%" stopColor="#FF4400"/>
            <stop offset="100%" stopColor="#CC1100"/>
          </linearGradient>
        </defs>
        <rect x="8" y="8" width="13" height="84" rx="2" fill="#FFFFFF"/>
        <rect x="23" y="8" width="5" height="84" rx="1" fill="#FFFFFF"/>
        <path d="M28 8 C 50 8, 88 8, 88 8 C 88 16, 60 32, 36 50 L 28 50 Z" fill="url(#kmi-flame)"/>
        <path d="M28 52 L 36 52 C 60 68, 88 84, 88 92 C 88 92, 50 92, 28 92 Z" fill="url(#kmi-flame)"/>
        <path d="M28 14 L 72 14 C 76 14 76 20 73 22 L 38 46 L 28 46 Z" fill="#0A0A0A"/>
        <path d="M28 58 L 38 58 L 73 78 C 76 80 76 86 72 86 L 28 86 Z" fill="#0A0A0A"/>
        <circle cx="33" cy="51" r="3.5" fill="#FF6A00"/>
      </svg>
    </span>
  );
}

export function KebuWordmark({
  size = 36,
  className = "",
  dark = true,
}: MarkProps & { dark?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
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
