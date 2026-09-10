"use client";

import { MAYLECOR_SOCIAL_DEFAULTS } from "@/lib/create/maylecor-defaults";

export type MaylecorSocialLink = {
  label: string;
  iconUrl: string;
  href: string;
};

/**
 * Pretty social / streaming links for May Lecor — used on every page (chrome + footer).
 * Opens real external URLs; edit hrefs in the builder Media / social editor.
 */
export function MaylecorSocialBar({
  links,
  accentColor = "#E9006B",
  variant = "pill",
  className = "",
}: {
  /** undefined / null = May defaults; [] = intentionally empty (left-nav cleared). */
  links?: MaylecorSocialLink[] | null;
  accentColor?: string;
  /** pill = floating row; rail = vertical; footer = large centered icons */
  variant?: "pill" | "rail" | "footer";
  className?: string;
}) {
  const items =
    links == null
      ? MAYLECOR_SOCIAL_DEFAULTS.map((s) => ({ ...s }))
      : links.filter((l) => String(l.href ?? "").trim() && String(l.href) !== "#");

  if (!items.length) return null;

  if (variant === "rail") {
    return (
      <div
        className={`flex flex-col items-center gap-3 rounded-2xl px-2.5 py-3 ${className}`}
        style={{ background: "rgba(0,0,0,0.78)", boxShadow: "0 12px 32px rgba(0,0,0,0.35)" }}
        aria-label="Follow May Lecor"
      >
        {items.map((s) => (
          <SocialIcon key={s.label} link={s} size={36} accentColor={accentColor} />
        ))}
      </div>
    );
  }

  if (variant === "footer") {
    return (
      <div
        className={`flex flex-wrap items-center justify-center gap-5 ${className}`}
        aria-label="Follow May Lecor"
      >
        {items.map((s) => (
          <SocialIcon key={s.label} link={s} size={40} accentColor={accentColor} showLabel />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`inline-flex max-w-full flex-wrap items-center justify-center gap-1.5 rounded-full px-2 py-1.5 ${className}`}
      style={{
        background: "rgba(0,0,0,0.55)",
        border: `1px solid ${accentColor}66`,
        backdropFilter: "blur(10px)",
        boxShadow: "0 8px 28px rgba(0,0,0,0.28)",
      }}
      aria-label="Follow May Lecor"
    >
      {items.map((s) => (
        <SocialIcon key={s.label} link={s} size={28} accentColor={accentColor} />
      ))}
    </div>
  );
}

function SocialIcon({
  link,
  size,
  accentColor,
  showLabel = false,
}: {
  link: MaylecorSocialLink;
  size: number;
  accentColor: string;
  showLabel?: boolean;
}) {
  return (
    <a
      href={link.href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col items-center gap-1 rounded-full transition-transform hover:scale-110"
      aria-label={link.label}
      title={link.label}
      style={{ color: accentColor }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={link.iconUrl}
        alt=""
        width={size}
        height={size}
        className="rounded-full object-contain opacity-90 transition-opacity group-hover:opacity-100"
        style={{ width: size, height: size }}
      />
      {showLabel ? (
        <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/70 group-hover:text-white">
          {link.label}
        </span>
      ) : null}
    </a>
  );
}
