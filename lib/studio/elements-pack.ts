import type { CanvasLayer } from "@/lib/studio/canvas-document";

export type StudioElementKind = "line" | "icon" | "frame";
export type StudioElementCategory = "shapes" | "lines" | "frames" | "symbols" | "business" | "social" | "culture" | "charts" | "stickers" | "illustrations" | "education" | "creator";

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
const STUDIO_GLYPH_ELEMENTS: StudioElementDef[] = [
  {id:"line-arrow",kind:"line",category:"lines",label:"Arrow line",tags:["arrow","direction"],glyph:"→",defaults:{width:260,height:6,fill:"#111111",strokeWidth:6,name:"Arrow line",text:"→"}},
  {id:"frame-circle",kind:"frame",category:"frames",label:"Circle frame",tags:["photo","circle","avatar"],frameStyle:"rounded",defaults:{width:240,height:240,fill:"transparent",stroke:"#111111",strokeWidth:4,cornerRadius:999,name:"Circle frame",frameStyle:"rounded"}},
  {id:"icon-chat",kind:"icon",category:"social",label:"Chat",tags:["message","community","social"],glyph:"◰",defaults:{width:72,height:72,color:"#111111",name:"Chat",iconKey:"chat",text:"◰",fontSize:56}},

  {id:"icon-cowrie",kind:"icon",category:"culture",label:"Cowrie",tags:["africa","cowrie","heritage","money"],glyph:"◒",defaults:{width:72,height:72,color:"#E05A2B",name:"Cowrie",iconKey:"cowrie",text:"◒",fontSize:58}},
  {id:"icon-sun",kind:"icon",category:"culture",label:"Sahel sun",tags:["africa","sun","sahel"],glyph:"☀",defaults:{width:72,height:72,color:"#F0A21A",name:"Sahel sun",iconKey:"sun",text:"☀",fontSize:58}},


  { id: "line-vertical", kind: "line", category: "lines", label: "Vertical line", tags: ["divider","vertical"], defaults: { width: 4, height: 280, fill: "#111111", name: "Vertical line", strokeWidth: 4 } },
  { id: "line-accent", kind: "line", category: "lines", label: "Accent bar", tags: ["bar","accent"], defaults: { width: 180, height: 18, fill: "#FF6A00", name: "Accent bar", strokeWidth: 18 } },
  { id: "frame-portrait", kind: "frame", category: "frames", label: "Portrait frame", tags: ["photo","portrait"], frameStyle: "rounded", defaults: { width: 220, height: 300, fill: "transparent", stroke: "#111111", strokeWidth: 5, name: "Portrait frame", frameStyle: "rounded" } },
  { id: "frame-wide", kind: "frame", category: "frames", label: "Wide frame", tags: ["photo","landscape"], frameStyle: "rounded", defaults: { width: 340, height: 190, fill: "transparent", stroke: "#111111", strokeWidth: 5, name: "Wide frame", frameStyle: "rounded" } },
  { id: "icon-spark", kind: "icon", category: "symbols", label: "Spark", tags: ["spark","shine","brand"], glyph: "✦", defaults: { width: 72, height: 72, color: "#FF6A00", name: "Spark", iconKey: "spark", text: "✦", fontSize: 58 } },
  { id: "icon-plus", kind: "icon", category: "symbols", label: "Plus", tags: ["plus","add"], glyph: "+", defaults: { width: 64, height: 64, color: "#111111", name: "Plus", iconKey: "plus", text: "+", fontSize: 54 } },
  { id: "icon-globe", kind: "icon", category: "business", label: "Globe", tags: ["web","global","business"], glyph: "◎", defaults: { width: 72, height: 72, color: "#111111", name: "Globe", iconKey: "globe", text: "◎", fontSize: 58 } },
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

// --- Real vector elements (S20) ---------------------------------------------------
// Every path below is original, structured path data (not copied from any third-party
// icon set) authored at a 24x24 viewBox, verified by rendering before being committed.
// Kept alongside the existing glyph for search/accessibility and to not break prior
// expectations that every icon def carries a text glyph.
const V = "0 0 24 24";
export const STUDIO_VECTOR_ELEMENTS: StudioElementDef[] = [
  // Shapes — the empty "shapes" category, now populated with real geometric primitives.
  { id: "shape-triangle", kind: "icon", category: "shapes", label: "Triangle", tags: ["shape", "triangle", "geometric"], glyph: "▲", defaults: { width: 80, height: 80, color: "#111111", fill: "#111111", name: "Triangle", iconSvgPath: "M12,3L20.227,17.25L3.773,17.25Z", iconViewBox: V } },
  { id: "shape-pentagon", kind: "icon", category: "shapes", label: "Pentagon", tags: ["shape", "pentagon", "geometric"], glyph: "⬠", defaults: { width: 80, height: 80, color: "#111111", fill: "#111111", name: "Pentagon", iconSvgPath: "M12,3.1L20.75,9.457L17.408,19.743L6.592,19.743L3.25,9.457Z", iconViewBox: V } },
  { id: "shape-hexagon", kind: "icon", category: "shapes", label: "Hexagon", tags: ["shape", "hexagon", "geometric"], glyph: "⬡", defaults: { width: 80, height: 80, color: "#111111", fill: "#111111", name: "Hexagon", iconSvgPath: "M16.6,4.033L21.2,12L16.6,19.967L7.4,19.967L2.8,12L7.4,4.033Z", iconViewBox: V } },
  { id: "shape-diamond", kind: "icon", category: "shapes", label: "Diamond", tags: ["shape", "diamond", "geometric", "rhombus"], glyph: "◆", defaults: { width: 80, height: 80, color: "#F0A21A", fill: "#F0A21A", name: "Diamond", iconSvgPath: "M12,2.5L21.5,12L12,21.5L2.5,12Z", iconViewBox: V } },
  { id: "shape-parallelogram", kind: "icon", category: "shapes", label: "Parallelogram", tags: ["shape", "geometric"], glyph: "▰", defaults: { width: 90, height: 70, color: "#111111", fill: "#111111", name: "Parallelogram", iconSvgPath: "M6,18L2,18L8,6L22,6L16,18Z", iconViewBox: V } },
  { id: "shape-star6", kind: "icon", category: "shapes", label: "Six-point star", tags: ["shape", "star", "geometric"], glyph: "✶", defaults: { width: 80, height: 80, color: "#7950F2", fill: "#7950F2", name: "Six-point star", iconSvgPath: "M12,2.5L14.6,7.497L20.227,7.25L17.2,12L20.227,16.75L14.6,16.503L12,21.5L9.4,16.503L3.773,16.75L6.8,12L3.773,7.25L9.4,7.497Z", iconViewBox: V } },
  { id: "shape-ring-thin", kind: "icon", category: "shapes", label: "Ring", tags: ["shape", "ring", "circle", "outline"], glyph: "◯", defaults: { width: 80, height: 80, color: "#111111", fill: "#111111", name: "Ring", iconSvgPath: "M22,12A10,10 0 1 1 2,12A10,10 0 1 1 22,12ZM20,12A8,8 0 1 0 4,12A8,8 0 1 0 20,12Z", iconViewBox: V } },
  { id: "shape-ring-thick", kind: "icon", category: "shapes", label: "Thick ring", tags: ["shape", "ring", "circle", "outline"], glyph: "◯", defaults: { width: 80, height: 80, color: "#E05A2B", fill: "#E05A2B", name: "Thick ring", iconSvgPath: "M22,12A10,10 0 1 1 2,12A10,10 0 1 1 22,12ZM18,12A6,6 0 1 0 6,12A6,6 0 1 0 18,12Z", iconViewBox: V } },
  { id: "shape-speech-bubble", kind: "icon", category: "shapes", label: "Speech bubble", tags: ["shape", "chat", "comment", "callout"], glyph: "💬", defaults: { width: 90, height: 72, color: "#111111", fill: "#111111", name: "Speech bubble", iconSvgPath: "M5,3L19,3Q22,3 22,6L22,13Q22,16 19,16L10,16L7,20L8.5,16L5,16Q2,16 2,13L2,6Q2,3 5,3Z", iconViewBox: V } },
  { id: "shape-banner", kind: "icon", category: "shapes", label: "Banner", tags: ["shape", "banner", "ribbon", "tag"], glyph: "🏷", defaults: { width: 72, height: 80, color: "#2F9E44", fill: "#2F9E44", name: "Banner", iconSvgPath: "M4,3L20,3L20,20L12,15L4,20Z", iconViewBox: V } },

  // Business — briefcase, deadlines, growth, client communication.
  { id: "biz-target", kind: "icon", category: "business", label: "Goal / target", tags: ["business", "goal", "target", "kpi"], glyph: "◎", defaults: { width: 80, height: 80, color: "#E05A2B", fill: "#E05A2B", name: "Goal", iconSvgPath: "M22.5,12A10.5,10.5 0 1 1 1.5,12A10.5,10.5 0 1 1 22.5,12ZM20,12A8,8 0 1 0 4,12A8,8 0 1 0 20,12ZM18.5,12A6.5,6.5 0 1 1 5.5,12A6.5,6.5 0 1 1 18.5,12ZM16,12A4,4 0 1 0 8,12A4,4 0 1 0 16,12ZM14,12A2,2 0 1 1 10,12A2,2 0 1 1 14,12Z", iconViewBox: V } },
  { id: "biz-briefcase", kind: "icon", category: "business", label: "Briefcase", tags: ["business", "work", "job", "career"], glyph: "💼", defaults: { width: 80, height: 70, color: "#111111", fill: "#111111", name: "Briefcase", iconSvgPath: "M14.4,5.6A2.4,2.4 0 1 1 9.6,5.6A2.4,2.4 0 1 1 14.4,5.6ZM13.2,5.6A1.2,1.2 0 1 0 10.8,5.6A1.2,1.2 0 1 0 13.2,5.6ZM4.3,8.4L19.7,8.4Q21.5,8.4 21.5,10.2L21.5,17.2Q21.5,19 19.7,19L4.3,19Q2.5,19 2.5,17.2L2.5,10.2Q2.5,8.4 4.3,8.4ZM2.5,12.6L21.5,12.6L21.5,14.4L2.5,14.4ZM11,8.4L13,8.4Q13.4,8.4 13.4,8.8L13.4,10.2Q13.4,10.6 13,10.6L11,10.6Q10.6,10.6 10.6,10.2L10.6,8.8Q10.6,8.4 11,8.4Z", iconViewBox: V } },
  { id: "biz-clock", kind: "icon", category: "business", label: "Deadline", tags: ["business", "clock", "time", "deadline"], glyph: "🕐", defaults: { width: 76, height: 76, color: "#111111", fill: "#111111", name: "Deadline", iconSvgPath: "M21.5,12A9.5,9.5 0 1 1 2.5,12A9.5,9.5 0 1 1 21.5,12ZM20,12A8,8 0 1 0 4,12A8,8 0 1 0 20,12ZM11.3,7L12.7,7L12.7,12.4L11.3,12.4ZM12,11.3L18,11.3L18,12.7L12,12.7Z", iconViewBox: V } },
  { id: "biz-clipboard-check", kind: "icon", category: "business", label: "Task done", tags: ["business", "checklist", "clipboard", "done"], glyph: "✅", defaults: { width: 72, height: 80, color: "#2F9E44", fill: "#2F9E44", name: "Task done", iconSvgPath: "M5.6,4L18.4,4Q20,4 20,5.6L20,20.4Q20,22 18.4,22L5.6,22Q4,22 4,20.4L4,5.6Q4,4 5.6,4ZM10,2L14,2Q15,2 15,3L15,4Q15,5 14,5L10,5Q9,5 9,4L9,3Q9,2 10,2ZM7.5,13L9.6,15.2L9.8,15.2L16,8.6L14.6,7.2L9.6,12.5L8.9,11.8Z", iconViewBox: V } },
  { id: "biz-megaphone", kind: "icon", category: "business", label: "Announcement", tags: ["business", "megaphone", "marketing", "promo"], glyph: "📣", defaults: { width: 88, height: 72, color: "#111111", fill: "#111111", name: "Announcement", iconSvgPath: "M3,10L10,6L10,18L3,14ZM10,6L19,3L19,21L10,18ZM19.5,7L21.5,7L21.5,10L19.5,10ZM19.5,14L21.5,14L21.5,17L19.5,17ZM5.1,14L6.1,14Q6.9,14 6.9,14.8L6.9,18.2Q6.9,19 6.1,19L5.1,19Q4.3,19 4.3,18.2L4.3,14.8Q4.3,14 5.1,14Z", iconViewBox: V } },
  { id: "biz-mail", kind: "icon", category: "business", label: "Email", tags: ["business", "mail", "email", "contact"], glyph: "✉", defaults: { width: 76, height: 60, color: "#111111", fill: "#111111", name: "Email", iconSvgPath: "M4.5,5L19.5,5Q21.5,5 21.5,7L21.5,17Q21.5,19 19.5,19L4.5,19Q2.5,19 2.5,17L2.5,7Q2.5,5 4.5,5ZM2.5,6L12,14L21.5,6Z", iconViewBox: V } },
  { id: "biz-calendar", kind: "icon", category: "business", label: "Calendar", tags: ["business", "calendar", "date", "schedule"], glyph: "▣", defaults: { width: 76, height: 76, color: "#111111", fill: "#111111", name: "Calendar", iconSvgPath: "M4.5,4.5L19.5,4.5Q21.5,4.5 21.5,6.5L21.5,19.5Q21.5,21.5 19.5,21.5L4.5,21.5Q2.5,21.5 2.5,19.5L2.5,6.5Q2.5,4.5 4.5,4.5ZM6.5,2.5L8.5,2.5L8.5,6.5L6.5,6.5ZM15.5,2.5L17.5,2.5L17.5,6.5L15.5,6.5ZM8.8,15A1.3,1.3 0 1 0 6.2,15A1.3,1.3 0 1 0 8.8,15ZM13.3,15A1.3,1.3 0 1 0 10.7,15A1.3,1.3 0 1 0 13.3,15ZM17.8,15A1.3,1.3 0 1 0 15.2,15A1.3,1.3 0 1 0 17.8,15Z", iconViewBox: V } },
  { id: "biz-location", kind: "icon", category: "business", label: "Location", tags: ["business", "location", "map", "address"], glyph: "●", defaults: { width: 60, height: 72, color: "#FF1F1F", fill: "#FF1F1F", name: "Location", iconSvgPath: "M12,22C12,22 5,13.5 5,9A7,7 0 1 1 19,9C19,13.5 12,22 12,22ZM14.6,9A2.6,2.6 0 1 0 9.4,9A2.6,2.6 0 1 0 14.6,9Z", iconViewBox: V } },
  { id: "biz-trend-up", kind: "icon", category: "business", label: "Growth", tags: ["business", "growth", "chart", "trend", "sales"], glyph: "📈", defaults: { width: 80, height: 70, color: "#2F9E44", fill: "#2F9E44", name: "Growth", iconSvgPath: "M2.919,19.919L8.374,14.245L12.681,17.107L22.006,5.823L19.994,4.177L11.319,14.893L7.626,11.755L1.081,18.081ZM22.266,3.452L20.465,11.023L15.202,6.717Z", iconViewBox: V } },
  { id: "biz-chart-bar", kind: "icon", category: "business", label: "Bar chart", tags: ["business", "chart", "bar", "data", "stats"], glyph: "▐", defaults: { width: 76, height: 76, color: "#FF6A00", fill: "#FF6A00", name: "Bar chart", iconSvgPath: "M2,21L2,14L6,14L6,21ZM8,21L8,9L12,9L12,21ZM14,21L14,4L18,4L18,21Z", iconViewBox: V } },
  { id: "biz-ring-donut", kind: "icon", category: "business", label: "Share of total", tags: ["business", "chart", "donut", "data"], glyph: "◯", defaults: { width: 76, height: 76, color: "#1C7ED6", fill: "#1C7ED6", name: "Share of total", iconSvgPath: "M22,12A10,10 0 1 1 2,12A10,10 0 1 1 22,12ZM18,12A6,6 0 1 0 6,12A6,6 0 1 0 18,12Z", iconViewBox: V } },

  // Education / students — study, research, achievement.
  { id: "edu-graduation-cap", kind: "icon", category: "education", label: "Graduation cap", tags: ["education", "student", "graduation", "school"], glyph: "🎓", defaults: { width: 88, height: 70, color: "#111111", fill: "#111111", name: "Graduation cap", iconSvgPath: "M12,5L22,9.5L12,14L2,9.5ZM6,11.2L18,11.2L18,15.5L12,18L6,15.5ZM21.4,9L21.6,9Q22,9 22,9.4L22,16.1Q22,16.5 21.6,16.5L21.4,16.5Q21,16.5 21,16.1L21,9.4Q21,9 21.4,9Z", iconViewBox: V } },
  { id: "edu-book", kind: "icon", category: "education", label: "Book", tags: ["education", "student", "book", "study", "research"], glyph: "📖", defaults: { width: 84, height: 72, color: "#111111", fill: "#111111", name: "Book", iconSvgPath: "M2,5L11,3.5L11,19.5L2,21ZM22,5L13,3.5L13,19.5L22,21Z", iconViewBox: V } },
  { id: "edu-pencil", kind: "icon", category: "education", label: "Pencil", tags: ["education", "student", "pencil", "write", "notes"], glyph: "✎", defaults: { width: 76, height: 76, color: "#111111", fill: "#111111", name: "Pencil", iconSvgPath: "M6.631,20.631L17.631,9.631L15.369,7.369L4.369,18.369ZM19.47,5.53L17.631,9.631L15.369,7.369ZM4.227,20.773L6.631,20.631L4.369,18.369Z", iconViewBox: V } },
  { id: "edu-lightbulb", kind: "icon", category: "education", label: "Idea", tags: ["education", "idea", "lightbulb", "insight", "research"], glyph: "💡", defaults: { width: 72, height: 80, color: "#F0A21A", fill: "#F0A21A", name: "Idea", iconSvgPath: "M18.4,10A6.4,6.4 0 1 1 5.6,10A6.4,6.4 0 1 1 18.4,10ZM10.2,16L13.8,16Q14.4,16 14.4,16.6L14.4,18.4Q14.4,19 13.8,19L10.2,19Q9.6,19 9.6,18.4L9.6,16.6Q9.6,16 10.2,16ZM10.6,19.3L13.4,19.3Q13.9,19.3 13.9,19.8L13.9,20.4Q13.9,20.9 13.4,20.9L10.6,20.9Q10.1,20.9 10.1,20.4L10.1,19.8Q10.1,19.3 10.6,19.3Z", iconViewBox: V } },
  { id: "edu-certificate", kind: "icon", category: "education", label: "Certificate", tags: ["education", "student", "certificate", "achievement", "award"], glyph: "🎖", defaults: { width: 72, height: 80, color: "#F0A21A", fill: "#F0A21A", name: "Certificate", iconSvgPath: "M18,9A6,6 0 1 1 6,9A6,6 0 1 1 18,9ZM8,14L11,14L9,23L6,19ZM16,14L13,14L15,23L18,19Z", iconViewBox: V } },

  // Content creators — camera, mic, social growth.
  { id: "creator-camera", kind: "icon", category: "creator", label: "Camera", tags: ["creator", "camera", "photo", "content"], glyph: "📷", defaults: { width: 84, height: 70, color: "#111111", fill: "#111111", name: "Camera", iconSvgPath: "M4.5,7L19.5,7Q21.5,7 21.5,9L21.5,18Q21.5,20 19.5,20L4.5,20Q2.5,20 2.5,18L2.5,9Q2.5,7 4.5,7ZM10,4L14,4Q15,4 15,5L15,6.5Q15,7.5 14,7.5L10,7.5Q9,7.5 9,6.5L9,5Q9,4 10,4ZM16.2,13.5A4.2,4.2 0 1 1 7.8,13.5A4.2,4.2 0 1 1 16.2,13.5ZM14.6,13.5A2.6,2.6 0 1 0 9.4,13.5A2.6,2.6 0 1 0 14.6,13.5ZM14.6,13.5A2.6,2.6 0 1 0 9.4,13.5A2.6,2.6 0 1 0 14.6,13.5ZM18.3,9L19.3,9Q19.6,9 19.6,9.3L19.6,10.3Q19.6,10.6 19.3,10.6L18.3,10.6Q18,10.6 18,10.3L18,9.3Q18,9 18.3,9Z", iconViewBox: V } },
  { id: "creator-microphone", kind: "icon", category: "creator", label: "Microphone", tags: ["creator", "podcast", "microphone", "audio", "voice"], glyph: "🎙", defaults: { width: 64, height: 80, color: "#111111", fill: "#111111", name: "Microphone", iconSvgPath: "M12,2L12,2Q14.5,2 14.5,4.5L14.5,10.5Q14.5,13 12,13L12,13Q9.5,13 9.5,10.5L9.5,4.5Q9.5,2 12,2ZM6,11.5A6,6 0 0 0 18,11.5L16.3,11.5A4.3,4.3 0 0 1 7.7,11.5ZM11.1,17.3L12.9,17.3L12.9,20.5L11.1,20.5ZM8.1,20.3L15.9,20.3Q16.5,20.3 16.5,20.9L16.5,21.4Q16.5,22 15.9,22L8.1,22Q7.5,22 7.5,21.4L7.5,20.9Q7.5,20.3 8.1,20.3Z", iconViewBox: V } },
  { id: "creator-play-badge", kind: "icon", category: "creator", label: "Play", tags: ["creator", "video", "play", "reel", "youtube", "tiktok"], glyph: "▶", defaults: { width: 76, height: 76, color: "#111111", fill: "#111111", name: "Play", iconSvgPath: "M21.5,12A9.5,9.5 0 1 1 2.5,12A9.5,9.5 0 1 1 21.5,12ZM19.8,12A7.8,7.8 0 1 0 4.2,12A7.8,7.8 0 1 0 19.8,12ZM10,8.3L10,15.7L17,12Z", iconViewBox: V } },
  { id: "creator-verified", kind: "icon", category: "creator", label: "Verified", tags: ["creator", "verified", "badge", "trust", "check"], glyph: "✓", defaults: { width: 76, height: 76, color: "#1C7ED6", fill: "#1C7ED6", name: "Verified", iconSvgPath: "M21.2,12A9.2,9.2 0 1 1 2.8,12A9.2,9.2 0 1 1 21.2,12ZM7.8,12.2L10.1,14.6L10.3,14.6L16.4,8.1L14.9,6.7L10.3,11.6L9.3,10.6Z", iconViewBox: V } },
  { id: "creator-share", kind: "icon", category: "creator", label: "Share arrow", tags: ["creator", "share", "social", "network", "repost"], glyph: "⇢", defaults: { width: 76, height: 76, color: "#111111", fill: "#111111", name: "Share arrow", iconSvgPath: "M8.6,12A2.6,2.6 0 1 1 3.4,12A2.6,2.6 0 1 1 8.6,12ZM20.6,6A2.6,2.6 0 1 1 15.4,6A2.6,2.6 0 1 1 20.6,6ZM20.6,18A2.6,2.6 0 1 1 15.4,18A2.6,2.6 0 1 1 20.6,18ZM8.12,11.441L16.52,8.241L15.88,6.559L7.48,9.759ZM7.48,14.241L15.88,17.441L16.52,15.759L8.12,12.559Z", iconViewBox: V } },
  { id: "creator-hashtag", kind: "icon", category: "creator", label: "Hashtag", tags: ["creator", "hashtag", "social", "trend"], glyph: "#", defaults: { width: 76, height: 76, color: "#111111", fill: "#111111", name: "Hashtag", iconSvgPath: "M9.808,1.948L12.351,2.489L8.192,22.052L5.649,21.511ZM15.808,1.948L18.351,2.489L14.192,22.052L11.649,21.511ZM1.916,8.604L21.722,5.821L22.084,8.396L2.278,11.179ZM1.916,15.604L21.722,12.821L22.084,15.396L2.278,18.179Z", iconViewBox: V } },
  { id: "creator-comment", kind: "icon", category: "creator", label: "Comment", tags: ["creator", "comment", "chat", "social", "engagement"], glyph: "💬", defaults: { width: 90, height: 72, color: "#111111", fill: "#111111", name: "Comment", iconSvgPath: "M5,3L19,3Q22,3 22,6L22,13Q22,16 19,16L10,16L7,20L8.5,16L5,16Q2,16 2,13L2,6Q2,3 5,3Z", iconViewBox: V } },

  // Shared symbol upgrades — real vectors for the existing high-traffic glyph icons.
  { id: "sym-arrow-right", kind: "icon", category: "symbols", label: "Arrow right", tags: ["arrow", "direction"], glyph: "→", defaults: { width: 76, height: 56, color: "#111111", fill: "#111111", name: "Arrow right", iconSvgPath: "M3,5L6,5L17,12L6,19L3,19L10,12Z", iconViewBox: V } },
  { id: "sym-arrow-up", kind: "icon", category: "symbols", label: "Arrow up", tags: ["arrow", "direction", "up"], glyph: "↑", defaults: { width: 60, height: 76, color: "#111111", fill: "#111111", name: "Arrow up", iconSvgPath: "M5,17L5,14L12,3L19,14L19,17L12,10Z", iconViewBox: V } },
  { id: "sym-arrow-down", kind: "icon", category: "symbols", label: "Arrow down", tags: ["arrow", "direction", "down"], glyph: "↓", defaults: { width: 60, height: 76, color: "#111111", fill: "#111111", name: "Arrow down", iconSvgPath: "M19,7L19,10L12,21L5,10L5,7L12,14Z", iconViewBox: V } },
  { id: "sym-plus", kind: "icon", category: "symbols", label: "Plus", tags: ["plus", "add"], glyph: "+", defaults: { width: 64, height: 64, color: "#111111", fill: "#111111", name: "Plus", iconSvgPath: "M9.8,3L14.2,3L14.2,9.8L21,9.8L21,14.2L14.2,14.2L14.2,21L9.8,21L9.8,14.2L3,14.2L3,9.8L9.8,9.8Z", iconViewBox: V } },
  { id: "sym-check", kind: "icon", category: "symbols", label: "Check", tags: ["check", "done", "approved"], glyph: "✓", defaults: { width: 72, height: 68, color: "#2F9E44", fill: "#2F9E44", name: "Check", iconSvgPath: "M3.5,12.5L6.1,9.9L10.725,14.575L17.9,6.125L20.5,9.505L10.725,17.955Z", iconViewBox: V } },
  { id: "sym-spark", kind: "icon", category: "symbols", label: "Spark", tags: ["spark", "shine", "brand"], glyph: "✦", defaults: { width: 72, height: 72, color: "#FF6A00", fill: "#FF6A00", name: "Spark", iconSvgPath: "M12,2L13.838,10.162L22,12L13.838,13.838L12,22L10.162,13.838L2,12L10.162,10.162Z", iconViewBox: V } },
];

export const STUDIO_ELEMENTS_PACK: StudioElementDef[] = [...STUDIO_GLYPH_ELEMENTS, ...STUDIO_VECTOR_ELEMENTS];

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
