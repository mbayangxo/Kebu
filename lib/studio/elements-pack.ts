import type { CanvasLayer } from "@/lib/studio/canvas-document";

export type StudioElementKind = "line" | "icon" | "frame";
export type StudioElementCategory = "shapes" | "lines" | "frames" | "symbols" | "business" | "social" | "culture" | "charts" | "stickers" | "illustrations";

export type StudioElementDef = {
  id: string;
  kind: StudioElementKind;
  label: string;
  category?: StudioElementCategory;
  tags?: string[];
  /** Icon glyph (structured catalog — not freeform SVG inject) */
  glyph?: string;
  frameStyle?: "corner" | "rounded" | "polaroid";
  defaults: Partial<CanvasLayer>;
};

/** Curated, offline-safe Elements catalog. Definitions are structured data, never arbitrary SVG/HTML. */
export const STUDIO_ELEMENTS_PACK: StudioElementDef[] = [
  {id:"line-arrow",kind:"line",category:"lines",label:"Arrow line",tags:["arrow","direction"],glyph:"→",defaults:{width:260,height:6,fill:"#111111",strokeWidth:6,name:"Arrow line",text:"→"}},
  {id:"frame-circle",kind:"frame",category:"frames",label:"Circle frame",tags:["photo","circle","avatar"],frameStyle:"rounded",defaults:{width:240,height:240,fill:"transparent",stroke:"#111111",strokeWidth:4,cornerRadius:999,name:"Circle frame",frameStyle:"rounded"}},
  {id:"icon-chat",kind:"icon",category:"social",label:"Chat",tags:["message","community","social"],glyph:"◰",defaults:{width:72,height:72,color:"#111111",name:"Chat",iconKey:"chat",text:"◰",fontSize:56}},
  {id:"icon-calendar",kind:"icon",category:"business",label:"Calendar",tags:["date","event","business"],glyph:"▣",defaults:{width:72,height:72,color:"#111111",name:"Calendar",iconKey:"calendar",text:"▣",fontSize:56}},

  {id:"icon-cowrie",kind:"icon",category:"culture",label:"Cowrie",tags:["africa","cowrie","heritage","money"],glyph:"◒",defaults:{width:72,height:72,color:"#E05A2B",name:"Cowrie",iconKey:"cowrie",text:"◒",fontSize:58}},
  {id:"icon-sun",kind:"icon",category:"culture",label:"Sahel sun",tags:["africa","sun","sahel"],glyph:"☀",defaults:{width:72,height:72,color:"#F0A21A",name:"Sahel sun",iconKey:"sun",text:"☀",fontSize:58}},


  { id: "line-vertical", kind: "line", category: "lines", label: "Vertical line", tags: ["divider","vertical"], defaults: { width: 4, height: 280, fill: "#111111", name: "Vertical line", strokeWidth: 4 } },
  { id: "line-accent", kind: "line", category: "lines", label: "Accent bar", tags: ["bar","accent"], defaults: { width: 180, height: 18, fill: "#FF6A00", name: "Accent bar", strokeWidth: 18 } },
  { id: "frame-portrait", kind: "frame", category: "frames", label: "Portrait frame", tags: ["photo","portrait"], frameStyle: "rounded", defaults: { width: 220, height: 300, fill: "transparent", stroke: "#111111", strokeWidth: 5, name: "Portrait frame", frameStyle: "rounded" } },
  { id: "frame-wide", kind: "frame", category: "frames", label: "Wide frame", tags: ["photo","landscape"], frameStyle: "rounded", defaults: { width: 340, height: 190, fill: "transparent", stroke: "#111111", strokeWidth: 5, name: "Wide frame", frameStyle: "rounded" } },
  { id: "icon-spark", kind: "icon", category: "symbols", label: "Spark", tags: ["spark","shine","brand"], glyph: "✦", defaults: { width: 72, height: 72, color: "#FF6A00", name: "Spark", iconKey: "spark", text: "✦", fontSize: 58 } },
  { id: "icon-plus", kind: "icon", category: "symbols", label: "Plus", tags: ["plus","add"], glyph: "+", defaults: { width: 64, height: 64, color: "#111111", name: "Plus", iconKey: "plus", text: "+", fontSize: 54 } },
  { id: "icon-globe", kind: "icon", category: "business", label: "Globe", tags: ["web","global","business"], glyph: "◎", defaults: { width: 72, height: 72, color: "#111111", name: "Globe", iconKey: "globe", text: "◎", fontSize: 58 } },
  { id: "icon-location", kind: "icon", category: "business", label: "Location", tags: ["location","map","place"], glyph: "●", defaults: { width: 52, height: 52, color: "#FF1F1F", name: "Location", iconKey: "location", text: "●", fontSize: 42 } },
  { id: "icon-play", kind: "icon", category: "social", label: "Play", tags: ["video","play","social"], glyph: "▶", defaults: { width: 72, height: 72, color: "#111111", name: "Play", iconKey: "play", text: "▶", fontSize: 52 } },
  { id: "icon-quote", kind: "icon", category: "social", label: "Quote", tags: ["quote","testimonial"], glyph: "“", defaults: { width: 80, height: 80, color: "#FF6A00", name: "Quote", iconKey: "quote", text: "“", fontSize: 72 } },

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

  // Charts
  { id: "chart-bar", kind: "icon", category: "charts", label: "Bar chart", tags: ["chart","bar","data","stats"], glyph: "▐", defaults: { width: 80, height: 80, color: "#FF6A00", name: "Bar chart", iconKey: "chart-bar", text: "▐", fontSize: 52 } },
  { id: "chart-pie", kind: "icon", category: "charts", label: "Pie chart", tags: ["chart","pie","data","stats"], glyph: "◔", defaults: { width: 80, height: 80, color: "#FF6A00", name: "Pie chart", iconKey: "chart-pie", text: "◔", fontSize: 52 } },
  { id: "chart-line", kind: "icon", category: "charts", label: "Line chart", tags: ["chart","line","trend","data"], glyph: "∿", defaults: { width: 96, height: 64, color: "#2F9E44", name: "Line chart", iconKey: "chart-line", text: "∿", fontSize: 52 } },
  { id: "chart-area", kind: "icon", category: "charts", label: "Area chart", tags: ["chart","area","trend"], glyph: "⌇", defaults: { width: 96, height: 64, color: "#1C7ED6", name: "Area chart", iconKey: "chart-area", text: "⌇", fontSize: 52 } },
  { id: "chart-donut", kind: "icon", category: "charts", label: "Donut", tags: ["chart","donut","data"], glyph: "◯", defaults: { width: 80, height: 80, color: "#7950F2", name: "Donut", iconKey: "chart-donut", text: "◯", fontSize: 52 } },
  { id: "chart-number", kind: "icon", category: "charts", label: "Stat number", tags: ["chart","stat","kpi"], glyph: "#", defaults: { width: 80, height: 80, color: "#F0A21A", name: "Stat number", iconKey: "chart-number", text: "#", fontSize: 60 } },

  // Stickers
  { id: "sticker-fire", kind: "icon", category: "stickers", label: "Fire", tags: ["sticker","fire","hot","trend"], glyph: "🔥", defaults: { width: 72, height: 72, color: "#FF6A00", name: "Fire", iconKey: "sticker-fire", text: "🔥", fontSize: 52 } },
  { id: "sticker-star", kind: "icon", category: "stickers", label: "Stars", tags: ["sticker","star","shine","rating"], glyph: "⭐", defaults: { width: 72, height: 72, color: "#F5C542", name: "Stars", iconKey: "sticker-star", text: "⭐", fontSize: 52 } },
  { id: "sticker-crown", kind: "icon", category: "stickers", label: "Crown", tags: ["sticker","crown","luxury","premium"], glyph: "♛", defaults: { width: 72, height: 72, color: "#F0A21A", name: "Crown", iconKey: "sticker-crown", text: "♛", fontSize: 52 } },
  { id: "sticker-lightning", kind: "icon", category: "stickers", label: "Lightning", tags: ["sticker","bolt","energy","power"], glyph: "⚡", defaults: { width: 64, height: 72, color: "#F0D132", name: "Lightning", iconKey: "sticker-lightning", text: "⚡", fontSize: 52 } },
  { id: "sticker-gem", kind: "icon", category: "stickers", label: "Gem", tags: ["sticker","diamond","gem","luxury"], glyph: "◇", defaults: { width: 72, height: 72, color: "#74C0FC", name: "Gem", iconKey: "sticker-gem", text: "◇", fontSize: 52 } },
  { id: "sticker-wave", kind: "icon", category: "stickers", label: "Wave", tags: ["sticker","wave","ocean","vibe"], glyph: "〰", defaults: { width: 88, height: 64, color: "#1C7ED6", name: "Wave", iconKey: "sticker-wave", text: "〰", fontSize: 52 } },
  { id: "sticker-leaf", kind: "icon", category: "stickers", label: "Leaf", tags: ["sticker","leaf","nature","green"], glyph: "🌿", defaults: { width: 72, height: 72, color: "#2F9E44", name: "Leaf", iconKey: "sticker-leaf", text: "🌿", fontSize: 52 } },
  { id: "sticker-moon", kind: "icon", category: "stickers", label: "Moon", tags: ["sticker","moon","night","vibes"], glyph: "☽", defaults: { width: 64, height: 72, color: "#CDB4DB", name: "Moon", iconKey: "sticker-moon", text: "☽", fontSize: 52 } },

  // Illustrations
  { id: "illus-circle-fill", kind: "icon", category: "illustrations", label: "Circle", tags: ["illustration","circle","shape","fill"], glyph: "●", defaults: { width: 120, height: 120, color: "#FF6A00", name: "Circle", iconKey: "illus-circle", text: "●", fontSize: 96 } },
  { id: "illus-blob", kind: "icon", category: "illustrations", label: "Blob", tags: ["illustration","blob","organic","background"], glyph: "⬟", defaults: { width: 140, height: 130, color: "#E8D5FF", name: "Blob", iconKey: "illus-blob", text: "⬟", fontSize: 100 } },
  { id: "illus-arch", kind: "icon", category: "illustrations", label: "Arch", tags: ["illustration","arch","frame","editorial"], glyph: "⌒", defaults: { width: 120, height: 120, color: "#FFECD2", name: "Arch", iconKey: "illus-arch", text: "⌒", fontSize: 80 } },
  { id: "illus-squiggle", kind: "icon", category: "illustrations", label: "Squiggle", tags: ["illustration","squiggle","line","decorative"], glyph: "〜", defaults: { width: 160, height: 40, color: "#FF6A00", name: "Squiggle", iconKey: "illus-squiggle", text: "〜", fontSize: 36 } },
  { id: "illus-diamond", kind: "icon", category: "illustrations", label: "Diamond", tags: ["illustration","diamond","geometric"], glyph: "◆", defaults: { width: 100, height: 100, color: "#F0A21A", name: "Diamond", iconKey: "illus-diamond", text: "◆", fontSize: 78 } },
  { id: "illus-dots", kind: "icon", category: "illustrations", label: "Dots", tags: ["illustration","dots","pattern","texture"], glyph: "⋯", defaults: { width: 100, height: 40, color: "#AAAAAA", name: "Dots", iconKey: "illus-dots", text: "⋯", fontSize: 36 } },
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

export function searchStudioElements(query = "", category?: StudioElementCategory | "all"): StudioElementDef[] {
  const q = query.trim().toLowerCase();
  return STUDIO_ELEMENTS_PACK.filter((element) => {
    if (category && category !== "all" && (element.category ?? (element.kind === "frame" ? "frames" : element.kind === "line" ? "lines" : "symbols")) !== category) return false;
    if (!q) return true;
    return [element.label, element.kind, element.category, ...(element.tags ?? [])].filter(Boolean).join(" ").toLowerCase().includes(q);
  });
}
