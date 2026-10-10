import { createHash } from "node:crypto";
import { buildIndex, richTextValue, canonicalStringify, documentToJson, inertOverrideKeys, parseDocument, preflight, resolveNode, type KcdDocument } from "@/lib/creative-core";
import { builderRegistry, canonicalSiteChrome } from "./kcd-adapter";
import { kcdLegacyRenderDefinition, PILOT_WEB_DOM_MANIFEST } from "./kcd-adapter/render-view";
import { containsUnsafeSiteContent } from "./site-seo";

export function assertKcdPublishable(document: KcdDocument): void {
  const parsed = parseDocument(documentToJson(document));
  if (!parsed.ok) throw new Error(parsed.issues[0].message);
  const issue = preflight(document, builderRegistry, PILOT_WEB_DOM_MANIFEST)[0];
  if (issue) throw new Error(issue.message);
  if (canonicalSiteChrome(document).conflict) throw new Error("Resolve the conflicting site navigation before publishing.");
  if (containsUnsafeSiteContent(canonicalStringify(documentToJson(document)))) throw new Error("Unsafe site content cannot be published.");
  for (const node of Object.values(document.nodes)) if (node.type === "text" && [node.props, ...Object.values(node.overrides)].some(props=>props?.runs!==undefined)) for (const device of ["desktop", "tablet", "mobile"] as const) { const values=resolveNode(node,device,builderRegistry.get(node.type)); if(values.runs && (richTextValue(values.runs as import("@/lib/creative-core").RichRun[]) !== values.text || (values.href && (values.runs as import("@/lib/creative-core").RichRun[]).some(run=>run.href)))) throw new Error("Rich text does not match its content or contains nested links."); }
  const index = buildIndex(document);
  for (const node of Object.values(document.nodes)) {
    const def = builderRegistry.get(node.type);
    if (!def) throw new Error("Unknown element type.");
    if ((def.placement === "root" && node.parentId !== null) || (def.placement === "nested" && node.parentId === null)) throw new Error("Invalid element placement.");
    const children = index.children(node.pageId, node.id);
    if (def.children === "none" ? children.length > 0 : children.some(child => !def.children || def.children === "none" || !def.children.allow.includes(child.type)) || (def.children.max !== undefined && children.length > def.children.max)) throw new Error("Invalid child elements.");
    if (def.validateWrite) { const valid = def.validateWrite(node); if (!valid.ok) throw new Error(valid.error); }
    if (def.writePolicy !== "reject-unknown") continue;
    if (inertOverrideKeys(node, def).length) throw new Error("This element has unsupported device settings.");
    for (const device of ["desktop", "tablet", "mobile"] as const) {
      const props = resolveNode(node, device, def);
      const valid = def.propsSchema.safeParse(props);
      if (!valid.success) throw new Error(valid.error.message);
      for (const key of ["color", "background"]) {
        const value = props[key];
        if (typeof value !== "string") continue;
        const resolved = value.startsWith("token:") ? document.tokens[value.slice(6)] : value;
        if (typeof resolved !== "string" || !/^#(?:[a-f\d]{3}|[a-f\d]{6}|[a-f\d]{8})$/i.test(resolved)) throw new Error("Choose an available colour before publishing.");
      }
    }
  }
  kcdLegacyRenderDefinition(document);
}

/** Native snapshots require 2; geometry 3; constraints/transforms 4; nested device order 5; art direction 6; native motion/interaction 7. */
export function kcdRendererMinimumVersion(document: KcdDocument): 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 {
  return minimumVersion(document, true);
}

/** New publications promise pre-hydration art direction; old snapshots keep their original promise. */
function minimumVersion(document: KcdDocument, currentPublication: boolean): 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 {
  if (Object.values(document.nodes).some(node => !node.type.startsWith("legacy-section:") && [node.props,...Object.values(node.overrides)].some(props=>props && ["fillContainer","gridSpan","layout","columns","padding","minHeightVh","contentPlacement",...(node.type==="section"?["gap"]:[])].some(key=>Object.hasOwn(props,key))))) return 11;
  if (Object.values(document.nodes).some(node => node.type === "video")) return 10;
  if (Object.values(document.nodes).some(node => node.type === "text" && [node.props, ...Object.values(node.overrides)].some(props=>props?.runs !== undefined))) return 9;
  if (Object.values(document.nodes).some(node => !node.type.startsWith("legacy-section:") && [node.props, ...Object.values(node.overrides)].some(props => props && ["mask", "opacity", "blur", "brightness", "saturation", "shadow"].some(key => Object.hasOwn(props, key))))) return 8;
  if (Object.values(document.nodes).some(node => !node.type.startsWith("legacy-section:") && (node.motion !== undefined || node.interaction !== undefined))) return 7;
  const artKeys = ["fontSize", "lineHeight", "letterSpacing", "focalX", "focalY"];
  const deviceArtKeys = currentPublication ? [...artKeys, "paddingY", "width", "align", "direction", "gap", "justify", "wrap", "text", "variant", "src", "fit", "aspectRatio"] : artKeys;
  if (Object.values(document.nodes).some(node => !node.type.startsWith("legacy-section:") && (artKeys.some(key => Object.hasOwn(node.props, key)) || Object.values(node.overrides).some(props => props && deviceArtKeys.some(key => Object.hasOwn(props, key)))))) return 6;
  if (Object.values(document.nodes).some(node => (node.type === "section" || node.type === "group") && [node.props, ...Object.values(node.overrides)].some(props => props?.childOrder !== undefined))) return 5;
  const advanced = ["constraintX", "constraintY", "rotation", "scaleX", "scaleY"];
  if (Object.values(document.nodes).some(node => !node.type.startsWith("legacy-section:") && [node.props, ...Object.values(node.overrides)].some(props => props && advanced.some(key => Object.hasOwn(props, key))))) return 4;
  const keys = ["position", "x", "y", "elementWidth", "elementHeight", "layer", "canvasHeight"];
  return Object.values(document.nodes).some(node => !node.type.startsWith("legacy-section:") && [node.props, ...Object.values(node.overrides)].some(props => props && keys.some(key => Object.hasOwn(props, key)))) ? 3 : 2;
}

export function createKcdPublishedSnapshot(document: KcdDocument, publishedAt = new Date().toISOString()) {
  assertKcdPublishable(document);
  const payload = JSON.parse(JSON.stringify({ format: "kcd-1", document: documentToJson(document), rendererRequirement: { renderer: "web-dom", minVersion: kcdRendererMinimumVersion(document) }, publishedAt }));
  const canonicalPayload = canonicalStringify(payload);
  const contentHash = createHash("sha256").update(canonicalPayload).digest("hex");
  return { snapshot: { ...payload, contentHash }, contentHash, canonicalPayload };
}

export function readKcdPublishedSnapshot(value: unknown, expectedHash?: string) {
  try {
    if (!value || typeof value !== "object") return null;
    const { contentHash, ...payload } = value as Record<string, unknown>;
    const requirement = payload.rendererRequirement as Record<string, unknown> | undefined;
    if (payload.format !== "kcd-1" || requirement?.renderer !== "web-dom" || ![2, 3, 4, 5, 6, 7, 8, 9, 10, 11].includes(Number(requirement.minVersion)) || typeof payload.publishedAt !== "string" || !Number.isFinite(Date.parse(payload.publishedAt)) || typeof contentHash !== "string" || !/^[a-f0-9]{64}$/.test(contentHash) || (expectedHash !== undefined && contentHash !== expectedHash)) return null;
    if (createHash("sha256").update(canonicalStringify(payload)).digest("hex") !== contentHash) return null;
    const parsed = parseDocument(payload.document);
    if (!parsed.ok) return null;
    if (typeof requirement.minVersion !== "number" || requirement.minVersion < minimumVersion(parsed.document, false)) return null;
    assertKcdPublishable(parsed.document);
    return { nativeDocument: parsed.document, definition: kcdLegacyRenderDefinition(parsed.document) };
  } catch { return null; }
}
