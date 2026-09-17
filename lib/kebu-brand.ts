/** Shared Kebu brand — bright orange energy on light surfaces. */
export const KEBU = {
  /* ── Palette ─────────────────────────────────────────── */
  black: "#0A0A0A",
  blackSoft: "#1A1A1A",
  orange: "#FF5500",
  orangeLight: "#FF7733",
  red: "#E10600",
  redSoft: "#FF2D2D",
  white: "#FFFFFF",
  cream: "#FFF8F2",
  bright: "#FFFBF7",
  muted: "#5C5348",
  faint: "#8A8074",
  border: "rgba(10,10,10,0.1)",
  card: "#FFFFFF",
  errorBg: "#FFF1F0",
  errorText: "#8B1E1E",

  /* ── Semantic surfaces ──────────────────────────────── */
  surface: {
    app: "#FFFBF7",         // main app background (cream-white)
    card: "#FFFFFF",        // card / elevated surface
    overlay: "rgba(255,251,247,0.92)", // frosted header
    sidebar: "#0A0A0A",     // nav sidebar background
    sidebarPanel: "rgba(255,255,255,0.03)", // secondary nav panel
    invert: "#0A0A0A",      // dark card (business card etc.)
  },

  /* ── Border ─────────────────────────────────────────── */
  borders: {
    subtle: "rgba(10,10,10,0.06)",
    default: "rgba(10,10,10,0.10)",
    strong: "rgba(10,10,10,0.18)",
    orange: "rgba(255,85,0,0.15)",
    orangeStrong: "rgba(255,85,0,0.30)",
    focus: "#FF5500",
  },

  /* ── Border radius ──────────────────────────────────── */
  radius: {
    sm: "6px",
    md: "10px",
    lg: "14px",
    xl: "20px",
    "2xl": "28px",
    full: "9999px",
  },

  /* ── Shadows ─────────────────────────────────────────── */
  shadow: {
    sm: "0 1px 3px rgba(10,10,10,0.08)",
    md: "0 2px 8px rgba(10,10,10,0.10)",
    lg: "0 4px 20px rgba(10,10,10,0.13)",
    xl: "0 8px 32px rgba(10,10,10,0.16)",
    neo: "3px 3px 0 rgba(10,10,10,0.9)",   // neobrutalist offset shadow
    card: "0 1px 4px rgba(10,10,10,0.06)", // subtle card lift
  },

  /* ── Spacing scale (px values for inline styles) ──── */
  space: {
    "0.5": "2px",
    "1": "4px",
    "1.5": "6px",
    "2": "8px",
    "3": "12px",
    "4": "16px",
    "5": "20px",
    "6": "24px",
    "8": "32px",
    "10": "40px",
    "12": "48px",
    "16": "64px",
  },

  /* ── Typography scale ─────────────────────────────── */
  text: {
    xs:   { fontSize: "0.6875rem",  lineHeight: "1rem"     }, // 11px
    sm:   { fontSize: "0.8125rem",  lineHeight: "1.25rem"  }, // 13px
    base: { fontSize: "0.9375rem",  lineHeight: "1.5rem"   }, // 15px
    lg:   { fontSize: "1.125rem",   lineHeight: "1.75rem"  }, // 18px
    xl:   { fontSize: "1.375rem",   lineHeight: "2rem"     }, // 22px
    "2xl":{ fontSize: "1.75rem",    lineHeight: "2.25rem"  }, // 28px
    "3xl":{ fontSize: "2.25rem",    lineHeight: "2.75rem"  }, // 36px
    "4xl":{ fontSize: "3rem",       lineHeight: "3.5rem"   }, // 48px
    label:{ fontSize: "0.625rem",   lineHeight: "1rem", letterSpacing: "0.15em", textTransform: "uppercase" as const, fontWeight: 700 },
  },

  /* ── Z-index layers ──────────────────────────────── */
  z: {
    base: 0,
    card: 1,
    sticky: 20,
    header: 30,
    sidebar: 40,
    dock: 50,
    overlay: 80,
    modal: 90,
    popover: 100,
    toast: 110,
  },

  /* ── Animation ───────────────────────────────────── */
  ease: {
    snap: "cubic-bezier(0.16, 1, 0.3, 1)",       // spring-like, fast
    smooth: "cubic-bezier(0.4, 0, 0.2, 1)",       // standard material ease
    in: "cubic-bezier(0.4, 0, 1, 1)",
    out: "cubic-bezier(0, 0, 0.2, 1)",
  },
  duration: {
    fast: "100ms",
    base: "180ms",
    slow: "300ms",
    slower: "450ms",
  },

  /* ── Status colors ───────────────────────────────── */
  status: {
    successBg: "rgba(16,185,129,0.08)",
    successText: "#065F46",
    successBorder: "rgba(16,185,129,0.2)",
    warningBg: "rgba(245,158,11,0.08)",
    warningText: "#78350F",
    warningBorder: "rgba(245,158,11,0.2)",
    errorBg: "#FFF1F0",
    errorText: "#8B1E1E",
    errorBorder: "rgba(225,6,0,0.2)",
    infoBg: "rgba(14,165,233,0.08)",
    infoText: "#0C4A6E",
    infoBorder: "rgba(14,165,233,0.2)",
  },
} as const;
