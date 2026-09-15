"use client";

import { useState, useEffect } from "react";

type TimeLeft = { days: number; hours: number; minutes: number; seconds: number } | null;

function getTimeLeft(target: string): TimeLeft {
  const diff = new Date(target).getTime() - Date.now();
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  };
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function Digit({
  value,
  label,
  accent,
  layout,
}: {
  value: string;
  label: string;
  accent: string;
  layout: "hero" | "strip" | "card";
}) {
  const big = layout === "hero";
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="font-mono font-black leading-none tabular-nums"
        style={{
          fontSize: big ? "clamp(3rem, 10vw, 6rem)" : layout === "card" ? "2.5rem" : "1.75rem",
          letterSpacing: "-0.04em",
          color: accent,
          textShadow: big ? `0 0 40px ${accent}55` : undefined,
        }}
      >
        {value}
      </div>
      <div
        className="text-[9px] font-bold uppercase tracking-[0.2em] opacity-50"
        style={{ fontSize: big ? 10 : 9 }}
      >
        {label}
      </div>
    </div>
  );
}

export function SiteCountdown({
  target,
  heading,
  subheading,
  expiredMessage = "L'événement a commencé !",
  expiredHref,
  background,
  color,
  accent,
  layout = "hero",
  showDays = true,
  labelDays = "Jours",
  labelHours = "Heures",
  labelMinutes = "Minutes",
  labelSeconds = "Secondes",
}: {
  target: string;
  heading?: string;
  subheading?: string;
  expiredMessage?: string;
  expiredHref?: string;
  background?: string;
  color?: string;
  accent?: string;
  layout?: "hero" | "strip" | "card";
  showDays?: boolean;
  labelDays?: string;
  labelHours?: string;
  labelMinutes?: string;
  labelSeconds?: string;
}) {
  const [left, setLeft] = useState<TimeLeft>(() => getTimeLeft(target));

  useEffect(() => {
    const id = setInterval(() => setLeft(getTimeLeft(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  const accentColor = accent ?? color ?? "#FF5500";
  const fg = color ?? "#fff";
  const bg = background ?? "#0A0A0A";

  if (!left) {
    const content = (
      <div
        className="w-full py-6 px-5 text-center"
        style={{ background: bg, color: fg }}
      >
        <p className="text-base font-bold">{expiredMessage}</p>
      </div>
    );
    return expiredHref ? <a href={expiredHref}>{content}</a> : content;
  }

  const digits = [
    ...(showDays ? [{ value: pad(left.days), label: labelDays }] : []),
    { value: pad(left.hours), label: labelHours },
    { value: pad(left.minutes), label: labelMinutes },
    { value: pad(left.seconds), label: labelSeconds },
  ];

  if (layout === "strip") {
    return (
      <div
        className="flex flex-wrap items-center justify-center gap-1 py-3 px-5"
        style={{ background: bg, color: fg }}
      >
        {heading && (
          <span className="mr-3 text-xs font-bold uppercase tracking-widest opacity-80">
            {heading}
          </span>
        )}
        {digits.map((d, i) => (
          <span key={d.label} className="inline-flex items-center gap-1">
            <span
              className="font-mono font-black tabular-nums text-lg"
              style={{ color: accentColor }}
            >
              {d.value}
            </span>
            <span className="text-[9px] font-bold uppercase tracking-wide opacity-50 mr-1">
              {d.label}
            </span>
            {i < digits.length - 1 && (
              <span className="text-sm opacity-30 mr-2">·</span>
            )}
          </span>
        ))}
      </div>
    );
  }

  if (layout === "card") {
    return (
      <div
        className="mx-auto max-w-sm rounded-2xl p-8 text-center shadow-2xl"
        style={{ background: bg, color: fg }}
      >
        {heading && (
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.25em] opacity-60">
            {heading}
          </p>
        )}
        <div className="flex items-end justify-center gap-4 mt-4">
          {digits.map((d, i) => (
            <span key={d.label} className="inline-flex items-center gap-4">
              <Digit value={d.value} label={d.label} accent={accentColor} layout="card" />
              {i < digits.length - 1 && (
                <span
                  className="font-mono font-black text-3xl leading-none mb-4 opacity-30"
                  style={{ color: fg }}
                >
                  :
                </span>
              )}
            </span>
          ))}
        </div>
        {subheading && (
          <p className="mt-4 text-xs opacity-60">{subheading}</p>
        )}
      </div>
    );
  }

  /* hero layout */
  return (
    <div
      className="relative w-full overflow-hidden py-16 sm:py-24 px-5 text-center"
      style={{ background: bg, color: fg }}
    >
      {/* Background glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 60% 40% at 50% 50%, ${accentColor}18, transparent 70%)`,
        }}
        aria-hidden
      />
      {heading && (
        <p className="relative mb-3 text-xs font-bold uppercase tracking-[0.35em] opacity-50">
          {heading}
        </p>
      )}
      <div className="relative flex items-end justify-center gap-4 sm:gap-8">
        {digits.map((d, i) => (
          <span key={d.label} className="inline-flex items-center gap-4 sm:gap-8">
            <Digit value={d.value} label={d.label} accent={accentColor} layout="hero" />
            {i < digits.length - 1 && (
              <span
                className="font-mono font-black leading-none opacity-20 mb-6 sm:mb-8"
                style={{ fontSize: "clamp(2rem, 6vw, 4rem)", color: fg }}
              >
                :
              </span>
            )}
          </span>
        ))}
      </div>
      {subheading && (
        <p className="relative mt-6 text-sm opacity-60">{subheading}</p>
      )}
    </div>
  );
}
