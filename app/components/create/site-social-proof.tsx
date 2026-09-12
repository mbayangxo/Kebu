"use client";

import { useState, useEffect } from "react";

type SocialProofItem = {
  name: string;
  location?: string;
  product?: string;
  minutesAgo?: number;
};

export function SiteSocialProof({
  items,
  interval = 8,
  position = "bottom-left",
  isPreview = false,
}: {
  items: SocialProofItem[];
  interval?: number;
  position?: "bottom-left" | "bottom-right";
  isPreview?: boolean;
}) {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!items.length) return;
    const delay = setTimeout(() => setVisible(true), 2400);
    const cycle = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx((i) => (i + 1) % items.length);
        setVisible(true);
      }, 500);
    }, interval * 1000);
    return () => { clearTimeout(delay); clearInterval(cycle); };
  }, [items.length, interval]);

  if (!items.length) return null;
  const item = items[idx % items.length];
  if (!item) return null;

  const mins = item.minutesAgo ?? 5;
  const timeLabel = mins < 60
    ? `il y a ${mins} min`
    : `il y a ${Math.round(mins / 60)}h`;

  const positionStyle: React.CSSProperties = isPreview
    ? { position: "relative", maxWidth: 280 }
    : {
        position: "fixed",
        bottom: 24,
        [position === "bottom-left" ? "left" : "right"]: 20,
        zIndex: 9999,
        maxWidth: 280,
      };

  return (
    <div
      style={{
        ...positionStyle,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(12px)",
        transition: "opacity 0.4s ease, transform 0.4s ease",
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <div
        className="flex items-center gap-3 rounded-2xl px-4 py-3 shadow-2xl"
        style={{
          background: "#fff",
          border: "1px solid #E8E6DF",
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
        }}
      >
        {/* Avatar circle */}
        <div
          className="flex-shrink-0 flex items-center justify-center rounded-full text-xs font-bold text-white"
          style={{
            width: 36,
            height: 36,
            background: "linear-gradient(135deg, #FF5500, #FF7733)",
          }}
          aria-hidden
        >
          {item.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold leading-tight text-[#0A0A0A] truncate">
            <span>{item.name}</span>
            {item.location && <span className="font-normal opacity-60"> · {item.location}</span>}
          </p>
          {item.product && (
            <p className="text-[10px] leading-tight mt-0.5 opacity-70 truncate">
              vient de commander{" "}
              <span className="font-semibold text-[#0A0A0A]">{item.product}</span>
            </p>
          )}
          <p className="text-[9px] mt-1 opacity-40 font-medium">{timeLabel}</p>
        </div>
        {/* WhatsApp-style checkmark */}
        <div className="flex-shrink-0 ml-1" aria-hidden>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#25D366">
            <path d="M9 12l2 2 4-4M12 22a10 10 0 100-20 10 10 0 000 20z" stroke="#25D366" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
    </div>
  );
}
