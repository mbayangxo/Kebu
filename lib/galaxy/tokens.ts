/**
 * Kebu Galaxy — shared product UI tokens.
 *
 * These are product-chrome tokens for signed-in Kebu surfaces, not published-site theme tokens.
 * Keep product capabilities visually coherent without coupling their internal feature code.
 */
export const GALAXY = {
  color: {
    canvas: "#FFFCF8",
    surface: "#FFFFFF",
    surfaceMuted: "#F6F6F4",
    sand: "#EEE8E1",
    stone: "#A7A7A7",
    ink: "#0A0A0A",
    muted: "#616161",
    faint: "#8C8C8C",
    border: "#E3E3E3",
    borderStrong: "#C9CCCF",
    orange: "#FF6A00",
    red: "#FF1F1F",
    focus: "#2C6ECB",
    success: "#009E40",
    warning: "#D97706",
    danger: "#CC1A1A",
  },
  radius: {
    control: 8,
    panel: 10,
    card: 12,
    pill: 999,
  },
  motion: {
    fastMs: 120,
    normalMs: 180,
    slowMs: 240,
  },
  density: {
    controlHeight: 36,
    compactGap: 6,
    normalGap: 10,
    panelPadding: 12,
  },
} as const;

export type GalaxyTokenSet = typeof GALAXY;
