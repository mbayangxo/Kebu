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

export const LAYER_MOTION_OPTIONS = ["spin", "float", "bob", "none"] as const;
export type LayerMotion = (typeof LAYER_MOTION_OPTIONS)[number];

export function layerMotionClass(motion: LayerMotion | undefined, enabled: boolean): string {
  if (!enabled || !motion || motion === "none") return "";
  if (motion === "spin") return "lb-layer-motion-spin";
  if (motion === "float") return "lb-layer-motion-float";
  if (motion === "bob") return "lb-layer-motion-bob";
  return "";
}
