"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { fitDesignScale } from "@/lib/create/responsive-scale";

/** Design-width artboard that scales down to fit any container (builder frames, tablet, phone).
 * Use for fixed-canvas templates (current and future) so they stay responsive on Kebu. */
export function ScaledArtboard({
  designWidth = 1200,
  designHeight,
  children,
  className,
}: {
  designWidth?: number;
  designHeight: number;
  children: ReactNode;
  className?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const update = () => {
      setScale(fitDesignScale(el.clientWidth, designWidth));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [designWidth]);

  return (
    <div
      ref={hostRef}
      className={`w-full overflow-hidden ${className ?? ""}`}
      style={{ height: Math.max(1, designHeight * scale) }}
      data-lb-scale={scale.toFixed(3)}
    >
      <div
        className="lb-artboard relative"
        style={{
          width: designWidth,
          maxWidth: "none",
          height: designHeight,
          marginLeft: 0,
          marginRight: 0,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        {children}
      </div>
    </div>
  );
}
