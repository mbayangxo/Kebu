import type { CanvasLayer } from "@/lib/studio/canvas-document";

export type StudioElementKind = "line" | "icon" | "frame";

export type StudioElementDef = {
  id: string;
  kind: StudioElementKind;
  label: string;
  /** Icon glyph (structured catalog — not freeform SVG inject) */
  glyph?: string;
  frameStyle?: "corner" | "rounded" | "polaroid";
  defaults: Partial<CanvasLayer>;
};

/** Curated Elements pack (S19) — icons · lines · frames. */
export const STUDIO_ELEMENTS_PACK: StudioElementDef[] = [
  {
    id: "line-h",
    kind: "line",
    label: "Line",
    defaults: { width: 280, height: 4, fill: "#FFFFFF", name: "Line", strokeWidth: 4 },
  },
  {
    id: "line-thick",
    kind: "line",
    label: "Thick line",
    defaults: { width: 280, height: 12, fill: "#E05A2B", name: "Thick line", strokeWidth: 12 },
  },
  {
    id: "frame-corner",
    kind: "frame",
    label: "Frame",
    frameStyle: "corner",
    defaults: {
      width: 240,
      height: 240,
      fill: "transparent",
      stroke: "#FFFFFF",
      strokeWidth: 6,
      name: "Frame",
      frameStyle: "corner",
    },
  },
  {
    id: "frame-rounded",
    kind: "frame",
    label: "Rounded frame",
    frameStyle: "rounded",
    defaults: {
      width: 240,
      height: 240,
      fill: "transparent",
      stroke: "#FFFFFF",
      strokeWidth: 8,
      name: "Rounded frame",
      frameStyle: "rounded",
    },
  },
  {
    id: "frame-polaroid",
    kind: "frame",
    label: "Polaroid",
    frameStyle: "polaroid",
    defaults: {
      width: 220,
      height: 260,
      fill: "#FFFFFF",
      stroke: "#E8E4DC",
      strokeWidth: 2,
      name: "Polaroid",
      frameStyle: "polaroid",
    },
  },
  { id: "icon-star", kind: "icon", label: "Star", glyph: "★", defaults: { width: 72, height: 72, color: "#F5C542", name: "Star", iconKey: "star", text: "★", fontSize: 56 } },
  { id: "icon-heart", kind: "icon", label: "Heart", glyph: "♥", defaults: { width: 72, height: 72, color: "#E05A2B", name: "Heart", iconKey: "heart", text: "♥", fontSize: 56 } },
  { id: "icon-check", kind: "icon", label: "Check", glyph: "✓", defaults: { width: 64, height: 64, color: "#2F9E44", name: "Check", iconKey: "check", text: "✓", fontSize: 48 } },
  { id: "icon-arrow", kind: "icon", label: "Arrow", glyph: "→", defaults: { width: 80, height: 64, color: "#FFFFFF", name: "Arrow", iconKey: "arrow", text: "→", fontSize: 52 } },
  { id: "icon-pin", kind: "icon", label: "Pin", glyph: "📍", defaults: { width: 64, height: 64, color: "#E05A2B", name: "Pin", iconKey: "pin", text: "📍", fontSize: 44 } },
  { id: "icon-phone", kind: "icon", label: "Phone", glyph: "☎", defaults: { width: 64, height: 64, color: "#FFFFFF", name: "Phone", iconKey: "phone", text: "☎", fontSize: 44 } },
  { id: "icon-mail", kind: "icon", label: "Mail", glyph: "✉", defaults: { width: 64, height: 64, color: "#FFFFFF", name: "Mail", iconKey: "mail", text: "✉", fontSize: 44 } },
];

export function getElementDef(id: string): StudioElementDef | undefined {
  return STUDIO_ELEMENTS_PACK.find((e) => e.id === id);
}

export function elementsByKind(kind: StudioElementKind): StudioElementDef[] {
  return STUDIO_ELEMENTS_PACK.filter((e) => e.kind === kind);
}

export function layerTypeForElement(kind: StudioElementKind): "line" | "icon" | "frame" {
  return kind;
}
