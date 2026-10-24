import {
  canvasLayerSchema, canvasPageSchema, expandSelectionWithGroups, mirrorPageToDocument,
  type CanvasDocument, type CanvasLayer, type CanvasPage,
} from "@/lib/studio/canvas-document";

const common = ["opacity", "blendMode", "cornerRadius", "shadowColor", "shadowBlur", "shadowX", "shadowY", "outlineWidth", "glowBlur"] as const;
const families = {
  text: ["fontSize", "fontFamily", "fontWeight", "fontStyle", "color", "textAlign", "letterSpacing", "lineHeight", "textDecoration", "textTransform"],
  paint: ["fill", "fillType", "gradientFrom", "gradientTo", "gradientAngle", "stroke", "strokeWidth"],
  media: ["brightness", "contrast", "saturation", "grayscale", "blur"],
  icon: ["color", "fontSize"],
} as const satisfies Record<string, readonly (keyof CanvasLayer)[]>;

function family(type: CanvasLayer["type"]): keyof typeof families {
  if(type === "text" || type === "icon") return type;
  return type === "image" || type === "video" ? "media" : "paint";
}

export type LayerStyle = { sourceName: string; family: keyof typeof families; values: Partial<CanvasLayer> };

export function captureLayerStyle(layer: CanvasLayer): LayerStyle {
  const kind = family(layer.type);
  return {sourceName:layer.name, family:kind, values:Object.fromEntries([...common,...families[kind]].map(key=>[key,layer[key]]))};
}

/** Only allowlisted visual properties transfer, even if a caller supplies extra fields. */
export function applyLayerStyle(layers: CanvasLayer[], selectedIds: string[], style: LayerStyle): CanvasLayer[] {
  const ids = new Set(expandSelectionWithGroups(layers, selectedIds));
  let changed = false;
  const next = layers.map(layer=>{
    if(!ids.has(layer.id) || layer.locked) return layer;
    const kind = family(layer.type);
    const keys = [...common,...(kind === style.family ? families[kind] : [])];
    if(!keys.some(key=>layer[key] !== style.values[key])) return layer;
    const candidate = canvasLayerSchema.safeParse({...layer,...Object.fromEntries(keys.map(key=>[key,style.values[key]]))});
    if(!candidate.success) throw new Error("This copied style could not be applied. Copy the style again and try again.");
    changed = true;
    return candidate.data;
  });
  return changed ? next : layers;
}

const pageKeys = ["backgroundColor", "transitionKind", "transitionDurationMs"] as const;
export type PageStyle = {sourceName:string; values:Pick<CanvasPage, typeof pageKeys[number]>};

export function capturePageStyle(page: CanvasPage): PageStyle {
  return {sourceName:page.name,values:{backgroundColor:page.backgroundColor,transitionKind:page.transitionKind,transitionDurationMs:page.transitionDurationMs}};
}

export function applyPageStyle(doc: CanvasDocument, pageId: string, style: PageStyle): CanvasDocument {
  const target = doc.pages.find(page=>page.id === pageId);
  if(!target || !pageKeys.some(key=>target[key] !== style.values[key])) return doc;
  const next = canvasPageSchema.safeParse({...target,...Object.fromEntries(pageKeys.map(key=>[key,style.values[key]]))});
  if(!next.success) throw new Error("This copied page style could not be applied. Copy the style again and try again.");
  return mirrorPageToDocument(doc, next.data);
}

export function applyBackgroundToAllPages(doc: CanvasDocument, sourcePageId: string): CanvasDocument {
  const source = doc.pages.find(page=>page.id === sourcePageId);
  if(!source || doc.pages.every(page=>page.backgroundColor === source.backgroundColor)) return doc;
  const pages = doc.pages.map(page=>page.backgroundColor === source.backgroundColor ? page : {...page,backgroundColor:source.backgroundColor});
  return mirrorPageToDocument({...doc,pages}, pages.find(page=>page.id === sourcePageId)!);
}
