"use client";

/**
 * Yande as a person — circular avatar for the lower-right assistant FAB.
 * Illustrated (not a photo) so it stays crisp at every size.
 */
export function YandeMark({
  size = 56,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex shrink-0 overflow-hidden rounded-full ${className}`}
      style={{
        width: size,
        height: size,
        boxShadow: "0 8px 28px rgba(10, 10, 10, 0.28), 0 0 0 2px rgba(255, 85, 0, 0.35)",
      }}
      aria-hidden
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 96 96"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
      >
        <title>Yande</title>
        {/* Warm background */}
        <circle cx="48" cy="48" r="48" fill="#FFF3EB" />
        <circle cx="48" cy="48" r="48" fill="url(#yandeBg)" />

        {/* Shoulders / top */}
        <path
          d="M18 96c4-18 14-28 30-28s26 10 30 28"
          fill="#0F0D33"
        />
        <path
          d="M22 96c3.5-14 12-22 26-22s22.5 8 26 22"
          fill="#FF5500"
          opacity="0.9"
        />

        {/* Neck */}
        <ellipse cx="48" cy="62" rx="9" ry="7" fill="#8B5A2B" />

        {/* Head */}
        <ellipse cx="48" cy="42" rx="20" ry="23" fill="#A56A3A" />
        <ellipse cx="48" cy="43" rx="18.5" ry="21" fill="#B87545" />

        {/* Soft cheek highlight */}
        <ellipse cx="38" cy="46" rx="4" ry="3" fill="#C98A5A" opacity="0.55" />
        <ellipse cx="58" cy="46" rx="4" ry="3" fill="#C98A5A" opacity="0.55" />

        {/* Hair — natural volume, side part */}
        <path
          d="M28 40c-1-16 8-28 20-28s21 12 20 28c-2-10-8-16-20-16S30 30 28 40Z"
          fill="#1A120C"
        />
        <path
          d="M27 38c0-14 9-26 21-26 7 0 13 4 17 11-4-3-9-5-15-5-12 0-20 9-21 20 0 0-2-0.5-2 0Z"
          fill="#0D0906"
        />
        <path
          d="M30 48c-3-2-5-8-4-14 2 6 4 10 8 12-2 0-3 1-4 2Z"
          fill="#1A120C"
        />
        <path
          d="M66 48c3-2 5-8 4-14-2 6-4 10-8 12 2 0 3 1 4 2Z"
          fill="#1A120C"
        />

        {/* Ears */}
        <ellipse cx="28.5" cy="44" rx="3.2" ry="4.2" fill="#A56A3A" />
        <ellipse cx="67.5" cy="44" rx="3.2" ry="4.2" fill="#A56A3A" />

        {/* Eyes */}
        <ellipse cx="40" cy="43" rx="3.2" ry="3.6" fill="#1A120C" />
        <ellipse cx="56" cy="43" rx="3.2" ry="3.6" fill="#1A120C" />
        <circle cx="41" cy="42" r="1.1" fill="#FFF8F2" />
        <circle cx="57" cy="42" r="1.1" fill="#FFF8F2" />

        {/* Brows */}
        <path d="M35 37.5c2.5-2 6-2 8 0" stroke="#1A120C" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M53 37.5c2.5-2 6-2 8 0" stroke="#1A120C" strokeWidth="1.4" strokeLinecap="round" />

        {/* Nose */}
        <path d="M48 44v6.5c-1.5 0.8-2.5 0.4-3 0" stroke="#8B5A2B" strokeWidth="1.3" strokeLinecap="round" fill="none" />

        {/* Smile */}
        <path
          d="M42 54c2.2 3 9.8 3 12 0"
          stroke="#5C2E14"
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
        />

        {/* Gold hoop earrings — African youth energy */}
        <circle cx="28.5" cy="48" r="3.5" stroke="#FFB020" strokeWidth="1.5" fill="none" />
        <circle cx="67.5" cy="48" r="3.5" stroke="#FFB020" strokeWidth="1.5" fill="none" />

        <defs>
          <linearGradient id="yandeBg" x1="12" y1="8" x2="84" y2="90" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFE8D6" />
            <stop offset="0.55" stopColor="#FFF3EB" />
            <stop offset="1" stopColor="#FFD4B8" />
          </linearGradient>
        </defs>
      </svg>
    </span>
  );
}
