import React, { createElement, memo, type CSSProperties, type ReactNode } from "react";
import { buildIndex, richTextValue, type RichRun, visualEffectKeys, visualEffectStyle, validateNativeMotion, constraintAxisCss, isVisible, PILOT_DEFINITIONS, PILOT_DEFAULT_PROPS, orderChildrenForDevice, resolveNode, type NativeMotion, type NativeInteraction, type Device, type DocIndex, type KcdDocument, type KcdNode, type KcdPage, type NodeId, type SpatialConstraint } from "@/lib/creative-core";

import { KcdNativeVideo } from "./native-video";
import { KcdNativeMotion } from "./native-motion";

const definitions = new Map(PILOT_DEFINITIONS.map((definition) => [definition.type, definition]));
const spacing: Record<string, string> = { none: "0", sm: "0.5rem", md: "1rem", lg: "2rem", xl: "4rem" };
const widths: Record<string, string> = { narrow: "48rem", default: "72rem", wide: "90rem", full: "100%" };
const radius: Record<string, string> = { none: "0", sm: "0.25rem", md: "0.75rem", lg: "1.5rem", full: "9999px" };
const alignment: Record<string, CSSProperties["alignItems"]> = { start: "flex-start", center: "center", end: "flex-end", stretch: "stretch" };
const justification: Record<string, CSSProperties["justifyContent"]> = { start: "flex-start", center: "center", end: "flex-end", between: "space-between" };
const sizes: Record<string, string> = { heading: "clamp(2rem, 5vw, 3.5rem)", subheading: "1.5rem", body: "1rem", eyebrow: "0.75rem", caption: "0.875rem" };
const devices = ["desktop", "tablet", "mobile"] as const;
const appearanceKeys: Record<string, readonly string[]> = {
  section: ["paddingY", "width", "align", "minHeightVh", "contentPlacement", "gap"], group: ["direction", "gap", "align", "justify", "wrap", "layout", "columns", "padding"],
  text: ["text", "runs", "variant", "fontSize", "lineHeight", "letterSpacing", "align"], image: ["src", "fit", "aspectRatio", "focalX", "focalY"], video: ["src", "poster", "captionsSrc", "captionsLanguage", "fit", "aspectRatio"],
};
function textStyle(props: Record<string, unknown>): CSSProperties {
  return { textAlign: props.align as CSSProperties["textAlign"], fontSize: props.fontSize === undefined ? sizes[String(props.variant ?? "body")] : `${props.fontSize}px`, lineHeight: props.lineHeight as number | undefined ?? (props.variant === "heading" ? 1.1 : 1.5), letterSpacing: props.letterSpacing === undefined ? undefined : `${props.letterSpacing}px` };
}
function imageStyle(props: Record<string, unknown>, boxed: boolean): CSSProperties {
  const ratio = props.aspectRatio === undefined || props.aspectRatio === "auto" ? undefined : String(props.aspectRatio).replace(":", " / ");
  return { display: "block", width: "100%", height: boxed || ratio ? "100%" : "auto", aspectRatio: ratio, objectFit: props.fit === "contain" ? "contain" : "cover", objectPosition: `${props.focalX ?? 50}% ${props.focalY ?? 50}%`, borderRadius: radius[String(props.radius ?? "none")] };
}
function groupCompositionStyle(props:Record<string,unknown>):CSSProperties {
 const layout=props.layout??"flex";
 return {display:layout==="grid"?"grid":layout==="masonry"?"block":"flex",gridTemplateColumns:layout==="grid"?`repeat(${props.columns??3}, minmax(0, 1fr))`:undefined,columnCount:layout==="masonry"?Number(props.columns??3):undefined,overflowX:layout==="carousel"?"auto":undefined,padding:spacing[String(props.padding??"none")],boxSizing:"border-box"};
}
function groupCompositionCss(node:KcdNode,props:Record<string,unknown>){
 const canvas=`[data-kcd-canvas-for="${node.id}"]`,layout=props.layout??"flex";
 const children=layout==="carousel"?"flex:0 0 80%;max-width:20rem;min-width:12rem;margin-bottom:0;":layout==="masonry"?`break-inside:avoid;display:block;margin-bottom:${spacing[String(props.gap??"md")]};max-width:none;min-width:0;`:"flex:0 1 auto;max-width:none;min-width:0;margin-bottom:0;";
 return `${canvas}{display:${layout==="grid"?"grid":layout==="masonry"?"block":"flex"}!important;grid-template-columns:${layout==="grid"?`repeat(${props.columns??3},minmax(0,1fr))`:"none"}!important;column-count:${layout==="masonry"?props.columns??3:"auto"}!important;overflow-x:${layout==="carousel"?"auto":"visible"}!important;padding:${spacing[String(props.padding??"none")]}!important}${children?`${canvas}>[data-kcd-node-id],${canvas}>[data-kcd-link-for]{${children}}`:""}`;
}
function sectionHeight(props:Record<string,unknown>) {return props.minHeightVh===undefined?props.canvasHeight as number|undefined:`max(${props.canvasHeight??0}px, ${props.minHeightVh}vh)`;}
function appearanceCss(node: KcdNode, props: Record<string, unknown>, target: Device) {
  // Base appearance is already inline; avoid tripling CSS for unchanged large documents.
  if (!Object.values(node.overrides).some(values => values && (appearanceKeys[node.type] ?? []).some(key => Object.hasOwn(values, key)))) return "";
  const canvas = `[data-kcd-canvas-for="${node.id}"]`, body = `[data-kcd-appearance-for="${node.id}"]`;
  if (node.type === "section") return `[data-kcd-node-id="${node.id}"]{padding-block:${spacing[String(props.paddingY ?? "lg")]}!important}` + `${canvas}{padding-inline:${props.width === "full" ? "0" : "clamp(1rem,4vw,2rem)"}!important;max-width:${widths[String(props.width ?? "default")]}!important;text-align:${props.align ?? "start"}!important;min-height:${typeof sectionHeight(props)==="number"?`${sectionHeight(props)}px`:sectionHeight(props)??"0px"}!important;display:flex!important;flex-direction:column!important;justify-content:${justification[String(props.contentPlacement??"start")]}!important;gap:${spacing[String(props.gap??"none")]}!important}`;
  if (node.type === "group") return groupCompositionCss(node,props) + `${canvas}{flex-direction:${props.layout === "carousel" || props.direction === "row" ? "row" : "column"}!important;gap:${spacing[String(props.gap ?? "md")]}!important;align-items:${alignment[String(props.align ?? "stretch")]}!important;justify-content:${justification[String(props.justify ?? "start")]}!important;flex-wrap:${props.wrap === true ? "wrap" : "nowrap"}!important}`;
  const variantRule = `[data-kcd-device-body-for="${node.id}"]{display:none!important}[data-kcd-device-body-for="${node.id}"][data-kcd-device="${target}"]{display:contents!important}`;
  if (node.type === "text") {
    const style = textStyle(props);
    return `${variantRule}${body}{font-size:${style.fontSize}!important;line-height:${style.lineHeight}!important;letter-spacing:${style.letterSpacing ?? "normal"}!important;text-align:${style.textAlign ?? "start"}!important}`;
  }
  if (node.type === "image" || node.type === "video") {
    const style = imageStyle(props, hasSpatialBox(node));
    return `${variantRule}${body}{height:${style.height}!important;aspect-ratio:${style.aspectRatio ?? "auto"}!important;object-fit:${style.objectFit}!important;object-position:${style.objectPosition}!important}`;
  }
  return "";
}

function colour(value: unknown, document: KcdDocument): string | undefined {
  if (typeof value !== "string") return undefined;
  const resolved = value.startsWith("token:") ? document.tokens[value.slice(6)] : value;
  if (typeof resolved !== "string" || !/^#(?:[a-f\d]{3}|[a-f\d]{6}|[a-f\d]{8})$/i.test(resolved)) {
    throw new Error(`The colour ${value} cannot be rendered. Choose an available colour.`);
  }
  return resolved;
}

function link(href: unknown, body: ReactNode, siteBase: string, id: NodeId): ReactNode {
  if (typeof href !== "string" || !href) return body;
  if (href.startsWith("//") || /^(?:javascript|data|vbscript):/i.test(href)) throw new Error("This link cannot be rendered safely.");
  const internal = /^[a-z0-9][a-z0-9-]*$/.test(href) ? (href === "home" ? "/" : `/${href}`) : href;
  return <a data-kcd-link-for={id} href={internal.startsWith("/") ? `${siteBase}${internal === "/" ? "" : internal}` || "/" : internal}>{body}</a>;
}

/** Render canonical native nodes inside the shared mixed-page flow. */
function PrimitiveSubtree({ document, rootId, device, siteBase = "", responsive = false, index = buildIndex(document) }: {
  document: KcdDocument;
  rootId: NodeId;
  device: Device;
  index?: DocIndex;
  siteBase?: string;
  responsive?: boolean;
}) {
  const root = document.nodes[rootId];
  if (!root) throw new Error("The selected element is no longer in this document.");
  const page = document.pages.find((candidate) => candidate.id === root.pageId);
  if (!page) throw new Error("The element's page is missing.");
  const rules = responsive ? (["desktop", "tablet", "mobile"] as const).map((target) => {
    const query = target === "desktop" ? "(width > 1024px)" : target === "tablet" ? "(640px < width <= 1024px)" : "(width <= 640px)";
    const nodes = index.subtree(rootId);
    const selectors = nodes.filter(node => !isVisible(node, page, target)).flatMap(node => [`[data-kcd-node-id="${node.id}"]`, `[data-kcd-link-for="${node.id}"]`]);
    const geometry = nodes.map(node => {
      const definition = definitions.get(node.type);
      if (!definition) return "";
      const parsed = definition.propsSchema.safeParse(resolveNode(node, target, definition));
      if (!parsed.success) throw new Error(`Invalid ${target} element layout.`);
      const props = { ...PILOT_DEFAULT_PROPS[node.type], ...parsed.data as Record<string, unknown> };
      const css = spatialCss(props);
      const box = hasSpatialBox(node) ? `[data-kcd-node-id="${node.id}"]{${css}}` : "";
      const canvas = node.type === "section" || node.type === "group" ? `[data-kcd-canvas-for="${node.id}"]{min-height:${node.type === "section" ? typeof sectionHeight(props)==="number"?`${sectionHeight(props)}px`:sectionHeight(props)??"0px" : `${props.canvasHeight??0}px`}!important}` : "";
      const transform = hasSpatialBox(node) ? `[data-kcd-transform-for="${node.id}"]{transform:${visualTransform(props)}!important}` : "";
      const ordered = orderChildrenForDevice(index.children(node.pageId, node.id), node, target, definition);
      const orderedOnAnyDevice = [node.props, ...Object.values(node.overrides)].some(values => values?.childOrder !== undefined);
      const ordering = orderedOnAnyDevice ? `${node.type === "section" ? `[data-kcd-canvas-for="${node.id}"]{display:flex!important;flex-direction:column!important}` : ""}${ordered.map((child, rank) => `[data-kcd-canvas-for="${node.id}"]>[data-kcd-node-id="${child.id}"],[data-kcd-canvas-for="${node.id}"]>[data-kcd-link-for="${child.id}"]{order:${rank}!important}`).join("")}` : "";
      const effect = hasVisualEffects(node) ? visualEffectStyle(props) : undefined;
      const effects = effect ? `[data-kcd-effects-for="${node.id}"]{clip-path:${effect.clipPath}!important;opacity:${effect.opacity}!important;filter:${effect.filter}!important;box-shadow:${effect.boxShadow}!important}` : "";
      const composition = node.type==="group" && [node.props,...Object.values(node.overrides)].some(p=>p && ["layout","columns","padding"].some(k=>Object.hasOwn(p,k))) ? groupCompositionCss(node,props) : "";
      return box + canvas + transform + ordering + effects + composition + appearanceCss(node, props, target);
    }).join("");
    return `@media ${query}{${selectors.length ? `${selectors.join(",")}{display:none!important}` : ""}${geometry}}`;
  }).join("") : "";
  return <>{rules && <style>{rules}</style>}{renderNode(root, document, page, device, index, siteBase, responsive)}</>;
}

function hasVisualEffects(node: KcdNode) { return [node.props, ...Object.values(node.overrides)].some(props => props && visualEffectKeys.some(key => Object.hasOwn(props, key))); }

const spatialKeys = ["position", "x", "y", "elementWidth", "elementHeight", "layer", "constraintX", "constraintY", "rotation", "scaleX", "scaleY", "fillContainer", "gridSpan"];
function hasSpatialBox(node: KcdNode) {
  return node.parentId !== null && [node.props, ...Object.values(node.overrides)].some(props => props && spatialKeys.some(key => Object.hasOwn(props, key)));
}
function spatialAxes(props: Record<string, unknown>) {
  const absolute = props.position === "absolute";
  return { absolute, x: constraintAxisCss(Number(props.x ?? 0), props.elementWidth as number | undefined, absolute ? props.constraintX as SpatialConstraint | undefined : undefined), y: constraintAxisCss(Number(props.y ?? 0), props.elementHeight as number | undefined, absolute ? props.constraintY as SpatialConstraint | undefined : undefined) };
}
function visualTransform(props: Record<string, unknown>) {
  return `rotate(${props.rotation ?? 0}deg) scale(${props.scaleX ?? 1}, ${props.scaleY ?? 1})`;
}
function spatialStyle(props: Record<string, unknown>): CSSProperties {
  const { absolute, x, y } = spatialAxes(props);
  if(props.fillContainer)return {position:"absolute",inset:0,width:"100%",height:"100%",zIndex:props.layer as number|undefined,gridColumn:props.gridSpan?`span ${props.gridSpan}`:undefined};
  return { gridColumn:props.gridSpan?`span ${props.gridSpan}`:undefined, position: absolute ? "absolute" : "relative", left: absolute ? x.position : undefined, top: absolute ? y.position : undefined,
    width: x.size, height: y.size, zIndex: props.layer as number | undefined, boxSizing: "border-box", minWidth: 0 };
}
function spatialCss(props: Record<string, unknown>) {
  const { absolute, x, y } = spatialAxes(props);
  if(props.fillContainer)return `position:absolute!important;inset:0!important;width:100%!important;height:100%!important;z-index:${props.layer??"auto"}!important;grid-column:${props.gridSpan?`span ${props.gridSpan}`:"auto"}!important;`;
  return `grid-column:${props.gridSpan?`span ${props.gridSpan}`:"auto"}!important;position:${absolute ? "absolute" : "relative"}!important;left:${absolute ? x.position : "auto"}!important;top:${absolute ? y.position : "auto"}!important;width:${x.size}!important;height:${y.size}!important;z-index:${props.layer ?? "auto"}!important;box-sizing:border-box;min-width:0;`;
}

function renderNode(node: KcdNode, document: KcdDocument, page: KcdPage, device: Device, index: DocIndex, siteBase: string, responsive: boolean): ReactNode {
  const definition = definitions.get(node.type);
  if (!definition || node.typeVersion !== definition.version) throw new Error(`Unsupported native element: ${node.type} version ${node.typeVersion}`);
  if (node.dataBinding != null) throw new Error("This native element contains capabilities the pilot cannot render.");
  if (node.motion !== undefined || node.interaction !== undefined) { const valid = validateNativeMotion(node); if (!valid.ok) throw new Error(valid.error); }
  const motion = node.motion as NativeMotion | undefined;
  const interaction = node.interaction as NativeInteraction | undefined;
  const animated = Boolean(motion || interaction);
  const effected = hasVisualEffects(node);
  const effect = (body: ReactNode) => effected ? <div data-kcd-effects-for={node.id} style={{ width: "100%", height: "100%", ...visualEffectStyle(props) }}>{body}</div> : body;
  const animate = (body: ReactNode) => animated ? <KcdNativeMotion id={node.id} motion={motion} interaction={interaction} device={device} runtime={responsive}>{body}</KcdNativeMotion> : body;
  const parsed = definition.propsSchema.safeParse(resolveNode(node, device, definition));
  if (!parsed.success) throw new Error(`Invalid ${definition.displayName} properties: ${parsed.error.message}`);
  const props = { ...PILOT_DEFAULT_PROPS[node.type], ...parsed.data as Record<string, unknown> };
  if (responsive ? !(["desktop", "tablet", "mobile"] as const).some(target => isVisible(node, page, target)) : !isVisible(node, page, device) || props.hidden === true) return null;
  const a11y = { ...definition.a11yDefaults, ...node.a11y };
  const boxed = hasSpatialBox(node);
  const attributes = { "data-kcd-node-id": node.id, "data-kcd-node-type": node.type,
    role: a11y.role, "aria-label": a11y.label, lang: a11y.lang,
    "aria-live": a11y.liveRegion };
  const children = orderChildrenForDevice(index.children(node.pageId, node.id), node, device, definition).map((child) =>
    <KcdPrimitiveChild key={child.id} node={child} document={document} page={page} device={device} index={index} siteBase={siteBase} responsive={responsive} />);
  const bodyAttributes = boxed || animated || effected ? { ...attributes, "data-kcd-node-id": undefined } : attributes;
  const wrap = (body: ReactNode) => boxed ? <div data-kcd-node-id={node.id} data-kcd-node-type={node.type} style={spatialStyle(props)}><div data-kcd-transform-for={node.id} style={{ width: "100%", height: "100%", transform: visualTransform(props), transformOrigin: "center" }}>{animate(effect(body))}</div></div> : animated || effected ? <div data-kcd-node-id={node.id} data-kcd-node-type={node.type}>{animate(effect(body))}</div> : body;
  const variantKeys = node.type === "text" ? ["text", "runs", "variant"] : node.type === "video" ? ["src", "poster", "captionsSrc", "captionsLanguage"] : node.type === "image" ? ["src"] : [];
  const variantBodies = responsive && devices.some(target => variantKeys.some(key => (resolveNode(node, target, definition)[key] ?? PILOT_DEFAULT_PROPS[node.type]?.[key]) !== props[key]));
  const leaf = (values: Record<string, unknown>, leafAttributes: typeof bodyAttributes): ReactNode => {
    if (node.type === "text") {
      const variant = String(values.variant ?? "body"), tag = a11y.headingLevel ? `h${a11y.headingLevel}` : variant === "heading" ? "h2" : variant === "subheading" ? "h3" : "p";
      const runs = values.runs as RichRun[] | undefined;
      if (runs && (richTextValue(runs) !== values.text || (values.href && runs.some(run=>run.href)))) throw new Error("Rich text does not match its content or contains nested links.");
      const content = runs ? runs.map((run,i)=> { let body: ReactNode=run.text; if(run.bold)body=<strong>{body}</strong>; if(run.italic)body=<em>{body}</em>; if(run.underline)body=<u>{body}</u>; return <React.Fragment key={i}>{link(run.href,body,siteBase,node.id)}</React.Fragment>; }) : String(values.text);
      return link(values.href, createElement(tag, { ...leafAttributes, "data-kcd-appearance-for": node.id, style: { margin: 0, color: colour(values.color, document), ...textStyle(values), whiteSpace: "pre-wrap", overflowWrap: "anywhere" } }, content), siteBase, node.id);
    }
    const src = String(values.src);
    if(node.type === "video") return <div {...leafAttributes}><KcdNativeVideo key={JSON.stringify([src,values.poster,values.captionsSrc,values.captionsLanguage])} src={src} poster={values.poster as string | undefined} captionsSrc={values.captionsSrc as string | undefined} captionsLanguage={values.captionsLanguage as string | undefined} label={a11y.label ?? "Video"} appearanceId={node.id} style={imageStyle(values,boxed)} /></div>;
    if (src.startsWith("//")) throw new Error("Image paths must be same-origin or use HTTPS.");
    if (!src) return <div {...leafAttributes} role="img" aria-label={a11y.label ?? "No image selected"} />;
    // Uploaded media has no mandatory dimensions; the saved frame owns its geometry.
    // eslint-disable-next-line @next/next/no-img-element
    return link(values.href, <img {...leafAttributes} data-kcd-appearance-for={node.id} role={a11y.decorative ? "presentation" : attributes.role} aria-label={a11y.decorative ? undefined : attributes["aria-label"]} src={src} alt={a11y.decorative ? "" : a11y.alt ?? ""} loading="lazy" style={imageStyle(values, boxed)} />, siteBase, node.id);
  };
  if (node.type === "text" || node.type === "image" || node.type === "video") {
    if (!variantBodies) return wrap(leaf(props, bodyAttributes));
    const bodies = devices.map(target => {
      const values = { ...PILOT_DEFAULT_PROPS[node.type], ...definition.propsSchema.parse(resolveNode(node, target, definition)) as Record<string, unknown> };
      return <div key={target} data-kcd-device-body-for={node.id} data-kcd-device={target}>{leaf(values, { ...bodyAttributes, "data-kcd-node-id": undefined })}</div>;
    });
    return boxed || animated || effected ? wrap(bodies) : <div data-kcd-node-id={node.id} data-kcd-node-type={node.type}>{bodies}</div>;
  }
  switch (node.type) {
    case "section":
      return <section {...attributes} style={{ background: colour(props.background, document), paddingBlock: spacing[String(props.paddingY ?? "lg")] }}>
        {animate(<div data-kcd-canvas-for={node.id} style={{ position: "relative", minHeight: sectionHeight(props), isolation:"isolate",gap:spacing[String(props.gap??"none")], display:"flex",flexDirection:"column",justifyContent:justification[String(props.contentPlacement??"start")], width: "100%", boxSizing: "border-box", paddingInline: props.width === "full" ? 0 : "clamp(1rem, 4vw, 2rem)", maxWidth: widths[String(props.width ?? "default")], marginInline: "auto", textAlign: props.align as CSSProperties["textAlign"] }}>{children}</div>)}
      </section>;
    case "group":
      return wrap(<>{!responsive && (props.layout==="carousel" || props.layout==="masonry") ? <style>{groupCompositionCss(node,props)}</style> : null}<div {...bodyAttributes} data-kcd-canvas-for={node.id} tabIndex={props.layout==="carousel"?0:undefined} style={{background:colour(props.background,document), position: "relative", height: boxed ? "100%" : undefined, minHeight: props.canvasHeight as number | undefined, display: "flex", flexDirection: props.layout === "carousel" || props.direction === "row" ? "row" : "column", gap: spacing[String(props.gap ?? "md")], alignItems: alignment[String(props.align ?? "stretch")], justifyContent: justification[String(props.justify ?? "start")], flexWrap: props.wrap === true ? "wrap" : "nowrap", minWidth: 0, ...groupCompositionStyle(props) }}>{children}</div></>);
    default: throw new Error(`Unsupported native element: ${node.type}`);
  }
}

function KcdPrimitiveChild(props: { node: KcdNode; document: KcdDocument; page: KcdPage; device: Device; index: DocIndex; siteBase: string; responsive: boolean }) {
  return renderNode(props.node, props.document, props.page, props.device, props.index, props.siteBase, props.responsive);
}

/** An edit in a different root must not reparse or redraw this unchanged tree. */
export const KcdPrimitiveSubtree = memo(PrimitiveSubtree, (before, after) => {
  if (before.rootId !== after.rootId || before.device !== after.device || before.siteBase !== after.siteBase || before.responsive !== after.responsive) return false;
  const oldRoot = before.document.nodes[before.rootId], nextRoot = after.document.nodes[after.rootId];
  if (!oldRoot || !nextRoot || before.document.pages.find((page) => page.id === oldRoot.pageId) !== after.document.pages.find((page) => page.id === nextRoot.pageId)) return false;
  const keys = Object.keys(before.document.tokens);
  if (keys.length !== Object.keys(after.document.tokens).length || keys.some((key) => before.document.tokens[key] !== after.document.tokens[key])) return false;
  const oldTree = (before.index ?? buildIndex(before.document)).subtree(before.rootId);
  const nextTree = (after.index ?? buildIndex(after.document)).subtree(after.rootId);
  return oldTree.length === nextTree.length && oldTree.every((node, position) => node === nextTree[position]);
});
