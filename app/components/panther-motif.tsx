"use client";

// ── Lion Mark — Alkebulan brand symbol ───────────────────────────────────────
// Front-facing geometric lion. 8-pointed starburst mane. Works at any size.
// Replaces the panther motif. All old exports are kept as aliases.

interface MarkProps {
  className?: string;
  size?: number;
}

export function AlkebulanLion({ size = 80, className = "" }: MarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Alkebulan lion mark"
    >
      {/* Mane — 8-pointed starburst, tips become natural ears at upper-diagonals */}
      <path
        d="M40 3 L49.2 17.8 L66.2 13.8 L62.2 30.8 L77 40 L62.2 49.2
           L66.2 66.2 L49.2 62.2 L40 77 L30.8 62.2 L13.8 66.2 L17.8 49.2
           L3 40 L17.8 30.8 L13.8 13.8 L30.8 17.8 Z"
        fill="#00C851"
      />
      {/* Mane fill — closes gaps between rays */}
      <circle cx="40" cy="40" r="23" fill="#00C851" />

      {/* Face base */}
      <ellipse cx="40" cy="43" rx="19" ry="17" fill="#C04010" />
      {/* Forehead — blends face into mane */}
      <ellipse cx="40" cy="34" rx="17" ry="13" fill="#D04E10" />

      {/* Brow ridges — give the lion authority */}
      <path d="M27 36 Q33 31 39 34" stroke="#0F0D33" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M53 36 Q47 31 41 34" stroke="#0F0D33" strokeWidth="2" fill="none" strokeLinecap="round" />

      {/* Eyes */}
      <ellipse cx="32" cy="40" rx="5.5" ry="4.5" fill="#0F0D33" />
      <ellipse cx="48" cy="40" rx="5.5" ry="4.5" fill="#0F0D33" />
      {/* Pupils */}
      <ellipse cx="32" cy="41" rx="2.5" ry="3.2" fill="#061A10" />
      <ellipse cx="48" cy="41" rx="2.5" ry="3.2" fill="#061A10" />
      {/* Catch-lights */}
      <ellipse cx="30.5" cy="38.5" rx="1.5" ry="2" fill="white" opacity="0.6" />
      <ellipse cx="46.5" cy="38.5" rx="1.5" ry="2" fill="white" opacity="0.6" />

      {/* Nose */}
      <path d="M40 49 L36 53.5 L44 53.5 Z" fill="#0F0D33" />
      <path d="M36 53.5 Q40 58 44 53.5" fill="#0F0D33" />

      {/* Mouth */}
      <path d="M40 57 L36.5 60.5" stroke="#0F0D33" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M40 57 L43.5 60.5" stroke="#0F0D33" strokeWidth="1.5" fill="none" strokeLinecap="round" />

      {/* Whisker dots — readable at large size, disappear cleanly at small */}
      <circle cx="33.5" cy="57" r="1.2" fill="#0F0D33" opacity="0.35" />
      <circle cx="46.5" cy="57" r="1.2" fill="#0F0D33" opacity="0.35" />
    </svg>
  );
}

// Wordmark lockup — lion + "ALKEBULAN" as a single composited unit
export function AlkebulanWordmark({ size = 40, className = "" }: MarkProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <AlkebulanLion size={size} />
      <span
        style={{ fontFamily: "var(--font-fraunces)", letterSpacing: "0.12em" }}
        className="font-bold text-gold text-xl italic leading-none select-none"
      >
        KEBU
      </span>
    </span>
  );
}

// ── Legacy / brand aliases — keep old + Kebu names so imports don't break ────

export function AlkebulanCrest({ size = 80, className = "" }: MarkProps) {
  return <AlkebulanLion size={size} className={className} />;
}

/** Brand rename alias — same mark as AlkebulanCrest / AlkebulanLion */
export function KebuCrest({ size = 80, className = "" }: MarkProps) {
  return <AlkebulanLion size={size} className={className} />;
}

export function KebuLion({ size = 80, className = "" }: MarkProps) {
  return <AlkebulanLion size={size} className={className} />;
}

export function PantherEyes({ size = 48, className = "" }: MarkProps) {
  return <AlkebulanLion size={size} className={className} />;
}

export function PantherSilhouette({ size = 200, className = "" }: MarkProps) {
  return <AlkebulanLion size={size} className={className} />;
}

export function PantherMotif({
  size = 48,
  className = "",
}: {
  size?: number;
  className?: string;
  variant?: string;
}) {
  return <AlkebulanLion size={size} className={className} />;
}
