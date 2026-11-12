"use client";

import { useId } from "react";

/** Text around a circle (like the Russian spinning logo), using your English name. */
export function CircularBrandRing({
  text,
  color = "#ffffff",
  spinning = true,
  className = "",
}: {
  text: string;
  color?: string;
  spinning?: boolean;
  className?: string;
}) {
  const pathId = useId().replace(/:/g, "");
  const name = (text.trim() || "MAY LECOR").toUpperCase();
  // Repeat so the ring feels full like the original logo.
  const around = `${name}  ·  ${name}  ·  ${name}  ·  `;

  return (
    <svg
      viewBox="0 0 200 200"
      className={`${spinning ? "lb-circular-brand-spin" : ""} ${className}`.trim()}
      role="img"
      aria-label={name}
      style={{ width: "100%", height: "auto", display: "block" }}
    >
      <defs>
        <path
          id={pathId}
          d="M 100,100 m -72,0 a 72,72 0 1,1 144,0 a 72,72 0 1,1 -144,0"
          fill="none"
        />
      </defs>
      <circle cx="100" cy="100" r="88" fill="rgba(233,0,107,0.35)" />
      <circle cx="100" cy="100" r="42" fill={color} />
      <text
        fill="#fff"
        fontSize="12"
        fontWeight="800"
        letterSpacing="0.22em"
        style={{ fontFamily: "Impact, Arial Black, Helvetica, sans-serif" }}
      >
        <textPath href={`#${pathId}`} startOffset="0%">
          {around}
        </textPath>
      </text>
    </svg>
  );
}

export const LAYER_MOTION_OPTIONS = [
  "none",
  "fade",
  "rise",
  "slide-left",
  "slide-right",
  "pop",
  "blur-in",
  "float",
  "bob",
  "pulse",
  "spin",
] as const;
export type LayerMotion = (typeof LAYER_MOTION_OPTIONS)[number];

export function layerMotionClass(motion: LayerMotion | undefined, enabled: boolean): string {
  if (!enabled || !motion || motion === "none") return "";
  if (motion === "spin") return "kebu-object-motion-spin";
  if (motion === "float") return "kebu-object-motion-float";
  if (motion === "bob") return "kebu-object-motion-bob";
  if (motion === "pulse") return "kebu-object-motion-pulse";
  if (motion === "fade") return "kebu-object-motion-fade";
  if (motion === "rise") return "kebu-object-motion-rise";
  if (motion === "slide-left") return "kebu-object-motion-slide-left";
  if (motion === "slide-right") return "kebu-object-motion-slide-right";
  if (motion === "pop") return "kebu-object-motion-pop";
  if (motion === "blur-in") return "kebu-object-motion-blur";
  return "";
}
