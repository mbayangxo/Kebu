/** Visual identity per country code — gradients for immersive cards (not flags as legal claims). */
const PALETTES: Record<string, { from: string; to: string; glow: string }> = {
  SN: { from: "#00853F", to: "#FCD116", glow: "rgba(0,133,63,0.35)" },
  NG: { from: "#008751", to: "#FFFFFF", glow: "rgba(0,135,81,0.3)" },
  GH: { from: "#CE1126", to: "#FCD116", glow: "rgba(206,17,38,0.28)" },
  KE: { from: "#BB0000", to: "#006600", glow: "rgba(187,0,0,0.25)" },
  ZA: { from: "#007A4D", to: "#FFB612", glow: "rgba(0,122,77,0.3)" },
  RW: { from: "#00A1DE", to: "#FAD201", glow: "rgba(0,161,222,0.3)" },
  CI: { from: "#F77F00", to: "#009E60", glow: "rgba(247,127,0,0.28)" },
  MA: { from: "#C1272D", to: "#006233", glow: "rgba(193,39,45,0.25)" },
  EG: { from: "#CE1126", to: "#000000", glow: "rgba(206,17,38,0.22)" },
  ET: { from: "#078930", to: "#FCDD09", glow: "rgba(7,137,48,0.28)" },
};

const DEFAULT = { from: "#FF5500", to: "#0A0A0A", glow: "rgba(255,85,0,0.25)" };

export function countryVisual(code: string) {
  const key = code.trim().toUpperCase();
  const p = PALETTES[key] ?? DEFAULT;
  return {
    gradient: `linear-gradient(145deg, ${p.from} 0%, ${p.to} 100%)`,
    glow: p.glow,
    watermark: key,
  };
}
