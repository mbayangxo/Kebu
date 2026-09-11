import type { CSSProperties } from "react";

export function Skeleton({
  width,
  height,
  radius = 6,
  className = "",
  style,
}: {
  width?: number | string;
  height?: number | string;
  radius?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`animate-pulse ${className}`}
      style={{
        width,
        height,
        borderRadius: radius,
        background: "rgba(0,0,0,0.08)",
        ...style,
      }}
    />
  );
}
