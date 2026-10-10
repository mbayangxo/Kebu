"use client";

import { useId, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { buildIndex, visualEffectKeys, inertOverrideKeys, isSpatialLocked, isVisible, orderRootsForDevice, orderChildrenForDevice, PILOT_DEFAULT_PROPS, resolveNode, type Device, type KcdDocument, type KcdNode, type NodeId, type Op, type PageId, type PropertyDescriptor } from "@/lib/creative-core";
import { BUILDER } from "@/lib/create/builder-ui";
import { PILOT_WEB_DOM_MANIFEST } from "@/lib/create/kcd-adapter/render-view";
import { builderNodeMoveOperations, primitiveDefinition, primitiveConstraintOperations, primitiveGeometryOperations, primitiveDuplicateOperation, primitiveInsertOperation, primitivePropertyOperations, primitiveReparentOperation, primitiveResetOverrideOperations, primitiveVisibilityOperations, type PrimitiveType } from "@/lib/create/kcd-primitive-operations";
import { SiteMediaUpload } from "@/app/components/create/site-media-upload";
import { SiteImageUpload } from "@/app/components/create/site-image-upload";

import { KcdSectionConversion } from "./section-conversion";
import { KcdRichTextControls } from "./rich-text-controls";
import { KcdMotionControls } from "./motion-controls";
import { KcdBrandBrainControls } from "./brand-brain-controls";
import { selectedSpatialMeasurement } from "@/lib/create/kcd-spatial-measure";

const SiteAssetsPanel = dynamic(() => import("@/app/components/create/site-assets-panel").then((module) => module.SiteAssetsPanel));
const inputClass = "w-full rounded-lg border px-2.5 py-2 text-[12px]";
const buttonClass = "rounded-lg border px-2.5 py-1.5 text-[12px] font-medium disabled:opacity-40";
const fieldStyle = { borderColor: BUILDER.border, background: BUILDER.surface, color: BUILDER.ink };

/** Keep incomplete addresses/colours locally until blur; rejected values stay available to fix. */
function DraftField({ label, value, multiline, onCommit }: { label: string; value: string; multiline?: boolean; onCommit: (value: string) => void }) {
  const id = useId();
  const [draft, setDraft] = useState(value);
  const commit = () => { if (draft !== value) onCommit(draft); };
  return <div className="space-y-1.5"><label htmlFor={id} className="block text-[12px] font-medium">{label}</label>
    {multiline ? <textarea id={id} className={inputClass} style={fieldStyle} rows={4} maxLength={5000} value={draft} onChange={(event) => setDraft(event.target.value)} onBlur={commit} />
      : <input id={id} className={inputClass} style={fieldStyle} value={draft} onChange={(event) => setDraft(event.target.value)} onBlur={commit} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); commit(); } }} />}
  </div>;
}

function PropertyControl({ property, value, onChange }: { property: PropertyDescriptor; value: unknown; onChange: (value: unknown) => void }) {
  const id = useId();
  if (property.control === "select") return <div className="space-y-1.5"><label htmlFor={id} className="block text-[12px] font-medium">{property.label}</label>
    <select id={id} className={inputClass} style={fieldStyle} value={typeof value === "string" ? value : ""} onChange={(event) => { if (event.target.value) onChange(event.target.value); }}>
      <option value="" disabled>Type default</option>{property.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select></div>;
  if (property.control === "toggle") return <label className="flex items-center gap-2 text-[12px]"><input type="checkbox" checked={value === true} onChange={(event) => onChange(event.target.checked)} />{property.label}</label>;
  if (property.control === "number") return <DraftField key={String(value ?? "")} label={property.label} value={String(value ?? "")} onCommit={(draft) => onChange(draft.trim() ? Number(draft) : NaN)} />;
  return <DraftField key={String(value ?? "")} label={property.control === "media" && property.key === "src" ? "Image address" : property.label} value={String(value ?? "")} multiline={property.control === "textarea"} onCommit={onChange} />;
}

export function KcdPrimitivePanel({ document, pageId, device, selectedId, onSelect, onSubmit, disabled = false }: {
  document: KcdDocument; pageId: PageId; device: Device; selectedId: string | null;
  onSelect: (id: string | null) => void; onSubmit: (label: string, operations: Op[]) => Promise<unknown>; disabled?: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [showAssets, setShowAssets] = useState<string | null>(null);
  const index = useMemo(() => buildIndex(document), [document]);
  const page = document.pages.find((page) => page.id === pageId);
  const node = selectedId ? document.nodes[selectedId as NodeId] : undefined;
  const definition = node && primitiveDefinition(node);
  const props = node && definition ? resolveNode(node, device, definition) : {};
  const selectedNative = node && !node.type.startsWith("legacy-section:");
  const entries: { node: KcdNode; depth: number }[] = [];
  const visit = (node: KcdNode, depth: number) => {
    entries.push({ node, depth });
    for (const child of orderChildrenForDevice(index.children(pageId, node.id), node, device, primitiveDefinition(node))) visit(child, depth + 1);
  };
  if (page) for (const root of orderRootsForDevice(index.children(pageId, null), page, device)) if (!root.type.startsWith("legacy-section:")) visit(root, 0);
  if (!page) return null;
  if(node?.type.startsWith("legacy-section:"))return <KcdSectionConversion key={node.id} document={document} id={node.id} submit={onSubmit} disabled={disabled} />;
  if (selectedId && !selectedNative) return null;
  async function run(label: string, make: () => Op[], select?: string | null | ((operations: Op[]) => string | null)) {
    try {
      setError(null);
      if (disabled) throw new Error("Wait for the current edit to finish.");
      if (node && isSpatialLocked(document, node.id) && label !== "Change lock") throw new Error("Unlock this element or its container before editing.");
      const operations = make();
      if (!operations.length) return;
      await onSubmit(label, operations);
      if (select !== undefined) onSelect(typeof select === "function" ? select(operations) : select);
    } catch (error) { setError(error instanceof Error ? error.message : "This edit could not be saved. Try again."); }
  }
  const add = (type: PrimitiveType, parentId: NodeId | null) => {
    const operation = primitiveInsertOperation(document, pageId, parentId, type);
    if (operation.op !== "insertNode") throw new Error("Invalid insertion.");
    return { operation, id: operation.node.id };
  };
  const edit = (key: string, value: unknown) => { if (node) void run(`Change ${key}`, () => (key === "constraintX" || key === "constraintY") ? primitiveConstraintOperations(document, node.id, device, key, value, selectedSpatialMeasurement(node.id, device)) : ["x", "y", "elementWidth", "elementHeight"].includes(key) && (props.constraintX || props.constraintY) ? (() => { const measured = selectedSpatialMeasurement(node.id, device); return primitiveGeometryOperations(document, node.id, device, { ...measured.box, [key]: value, referenceWidth: measured.container.width, referenceHeight: measured.container.height }); })() : key === "position" && value === "absolute" ? primitiveGeometryOperations(document, node.id, device, { x: Number(props.x ?? 0), y: Number(props.y ?? 0) }) : primitivePropertyOperations(node, device, key, value)); };
  const a11y = (key: string, value: unknown) => {
    if (!node) return;
    const next = { ...node.a11y, [key]: value };
    if (key === "decorative" && value === true) delete next.alt;
    void run("Change accessibility", () => [{ op: "setA11y", id: node.id, value: next }]);
  };
  const descendants = node ? new Set(index.subtree(node.id).map((child) => child.id)) : new Set<NodeId>();
  const containers = entries.filter(({ node: candidate }) => {
    const children = primitiveDefinition(candidate)?.children;
    return children && children !== "none" && children.allow.includes(node?.type ?? "") && !descendants.has(candidate.id) && !isSpatialLocked(document, candidate.id);
  });
  return <section aria-label="Native elements" className="border-b p-3" style={{ ...fieldStyle }}>
    {node && definition ? <div className="mb-3 space-y-2">
      <button type="button" className="text-[12px] underline" onClick={() => onSelect(null)}>Show element hierarchy</button>
      <button type="button" className={buttonClass} style={fieldStyle} disabled={disabled || Boolean(node.parentId && isSpatialLocked(document, node.parentId))} onClick={() => void run("Change lock", () => [{ op: "setLocked", id: node.id, value: !node.locked }])}>{node.locked ? "Unlock element" : "Lock element"}</button>
      {isSpatialLocked(document, node.id) ? <p role="status" className="text-[12px]">Locked. Unlock the element or its container to edit it.</p> : null}
      {node.parentId && isSpatialLocked(document, node.parentId) ? <button type="button" className="text-[12px] underline" onClick={() => onSelect(node.parentId)}>Edit parent container</button> : null}
    </div> : null}
    <fieldset disabled={disabled || Boolean(node && isSpatialLocked(document, node.id))} className="min-w-0 space-y-3">
      <legend className="mb-2 text-[13px] font-semibold">{definition ? `${definition.displayName} settings` : "Native elements"}</legend>
      {error ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-2 text-[12px] text-red-800">{error}</p> : null}
      {!selectedNative ? <>
        <p className="text-[12px]" style={{ color: BUILDER.muted }}>Build sections with nested groups, text and images.</p>
        {entries.length ? <ul aria-label="Element hierarchy" className="space-y-1">{entries.map(({ node: item, depth }) => <li key={item.id} style={{ paddingLeft: Math.min(depth, 8) * 12 }}>
          <button type="button" className="w-full rounded-lg border px-2.5 py-2 text-left text-[12px]" style={fieldStyle} onClick={() => onSelect(item.id)}>
            {primitiveDefinition(item)?.displayName ?? item.type}{item.type === "text" ? `: ${String(resolveNode(item, device, primitiveDefinition(item)).text ?? "").slice(0, 35)}` : ""}
            {!isVisible(item, page, device) ? " (hidden)" : ""}{isSpatialLocked(document, item.id) ? " (locked)" : ""}
          </button></li>)}</ul> : null}
        <button type="button" className={buttonClass} style={fieldStyle} onClick={() => { void run("Add native section", () => { return [add("section", null).operation]; }, (operations) => operations[0].op === "insertNode" ? operations[0].node.id : null); }}>Add native section</button>
      </> : node && definition ? <>
        <p className="text-[11px]" style={{ color: BUILDER.muted }}>{device === "desktop" ? "Editing desktop base values." : `Editing ${device === "mobile" ? "phone" : "tablet"}. Shared settings apply to every device.`}</p>
        <KcdBrandBrainControls key={node.id} document={document} selectedId={node.id} disabled={disabled || isSpatialLocked(document, node.id)} submit={onSubmit} />
        {definition.properties.filter((property) => !visualEffectKeys.includes(property.key) && property.control !== "order" && property.control !== "rich-text" && definition.capabilities.has(property.capability) && PILOT_WEB_DOM_MANIFEST.supports(node.type, property.capability)).map((property) => <div key={property.key} className="space-y-1">
          {node.type === "text" && property.key === "text" ? <KcdRichTextControls key={`${node.id}:${device}`} node={node} device={device} values={props} submit={(label,make)=>{void run(label,make);}} /> : <PropertyControl property={property} value={property.key === "constraintX" || property.key === "constraintY" ? (props[property.key] as { mode?: string } | undefined)?.mode ?? "start" : props[property.key] ?? PILOT_DEFAULT_PROPS[node.type]?.[property.key] ?? (property.key === "rotation" ? 0 : property.key === "scaleX" || property.key === "scaleY" ? 1 : undefined)} onChange={(value) => edit(property.key, value)} />}
          {device !== "desktop" && property.overridable ? Object.hasOwn(node.overrides[device] ?? {}, property.key)
            ? <button type="button" className="text-[11px] underline" onClick={() => void run("Use desktop value", () => property.key === "text" ? [...primitiveResetOverrideOperations(node, device, "text"), ...primitiveResetOverrideOperations(node, device, "runs")] : primitiveResetOverrideOperations(node, device, property.key))}>Use desktop value for {property.label.toLowerCase()}</button>
            : <p className="text-[10px]" style={{ color: BUILDER.muted }}>Inherited from desktop</p>
            : device !== "desktop" ? <p className="text-[10px]" style={{ color: BUILDER.muted }}>Shared across devices</p> : null}
          {(device === "desktop" || !property.overridable) && Object.hasOwn(node.props, property.key) && !["text", "src"].includes(property.key) ? <button type="button" className="text-[11px] underline" onClick={() => void run("Use type default", () => [{ op: "unsetProp", id: node.id, path: property.key }])}>Use type default for {property.label.toLowerCase()}</button> : null}
          {property.control === "video" ? <>
            <SiteMediaUpload projectId={document.id} kind="video" value={String(props.src ?? "")} onChange={url=>edit("src",url)} label="Upload video" showPreview={false} />
            <button type="button" className={buttonClass} style={fieldStyle} aria-expanded={showAssets === property.key} onClick={()=>setShowAssets(open=>open === property.key ? null : property.key)}>Choose video from media library</button>
            {showAssets === property.key ? <SiteAssetsPanel projectId={document.id} onPickUrl={(url,kind)=>{if(kind!=="video"){setError("Choose a video for this element.");return;}edit("src",url);setShowAssets(null);}} /> : null}
            <p className="text-[11px]" style={{color:BUILDER.muted}}>Videos play only when visitors choose Play. No video data is preloaded. Captions use a WebVTT (.vtt) address.</p>
          </> : null}
          {property.control === "media" ? <>
            <SiteImageUpload projectId={document.id} kind="section" value={String(props[property.key] ?? "")} onChange={(url) => edit(property.key, url)} label="Upload image" />
            <button type="button" className={buttonClass} style={fieldStyle} aria-expanded={showAssets === property.key} onClick={() => setShowAssets((open) => open === property.key ? null : property.key)}>Choose from media library</button>
            {showAssets === property.key ? <SiteAssetsPanel projectId={document.id} onPickUrl={(url, kind) => { if (kind !== "image") { setError("Choose an image for this element."); return; } edit(property.key, url); setShowAssets(null); }} /> : null}
          </> : null}
        </div>)}
        {props.constraintX || props.constraintY ? <p className="text-[11px]" style={{ color: BUILDER.muted }}>Pinned elements adapt when their container changes. Drag or edit the position to adjust their placement.</p> : null}
        {inertOverrideKeys(node, definition).length ? <p role="status" className="text-[11px]">Some stored device settings are unsupported. They are preserved and do not affect this preview.</p> : null}
        {definition.capabilities.has("effects") ? <details className="space-y-3 border-t pt-3" style={{ borderColor: BUILDER.border }}><summary className="cursor-pointer text-[12px] font-semibold">Masks and effects</summary>
          <p className="text-[11px]" style={{ color: BUILDER.muted }}>Styles apply to this element and its contents. Tablet and phone inherit desktop until customised.</p>
          {definition.properties.filter(property => visualEffectKeys.includes(property.key)).map(property => <div key={property.key} className="space-y-1">
            <PropertyControl property={property} value={props[property.key] ?? ({ mask: "none", opacity: 1, blur: 0, brightness: 1, saturation: 1, shadow: "none" } as Record<string, unknown>)[property.key]} onChange={value => edit(property.key, value)} />
            {device !== "desktop" && Object.hasOwn(node.overrides[device] ?? {}, property.key) ? <button type="button" className="text-[11px] underline" onClick={() => void run("Use desktop effect", () => property.key === "text" ? [...primitiveResetOverrideOperations(node, device, "text"), ...primitiveResetOverrideOperations(node, device, "runs")] : primitiveResetOverrideOperations(node, device, property.key))}>Use desktop value for {property.label.toLowerCase()}</button> : null}
            {device === "desktop" && Object.hasOwn(node.props, property.key) ? <button type="button" className="text-[11px] underline" onClick={() => void run("Use type default", () => [{ op: "unsetProp", id: node.id, path: property.key }])}>Use type default for {property.label.toLowerCase()}</button> : null}
          </div>)}
        </details> : null}
        <KcdMotionControls key={`${node.id}:${device}`} node={node} device={device} submit={(label, make) => { void run(label, make); }} />
        <div className="space-y-3 border-t pt-3" style={{ borderColor: BUILDER.border }}>
          <p className="text-[12px] font-semibold">Accessibility</p>
          <DraftField key={`label:${node.a11y?.label ?? ""}`} label="Accessible label" value={node.a11y?.label ?? ""} onCommit={(value) => a11y("label", value)} />
          {node.type === "text" ? <label className="block space-y-1 text-[12px]">Heading level<select className={inputClass} style={fieldStyle} value={node.a11y?.headingLevel ?? ""} onChange={(event) => { const value = { ...node.a11y }; if (event.target.value) value.headingLevel = Number(event.target.value) as 1; else delete value.headingLevel; void run("Change heading level", () => [{ op: "setA11y", id: node.id, value }]); }}><option value="">Use text style</option>{[1, 2, 3, 4, 5, 6].map((level) => <option key={level} value={level}>Heading {level}</option>)}</select></label> : null}
          {node.type === "image" ? <>
            <label className="flex items-center gap-2 text-[12px]"><input type="checkbox" checked={node.a11y?.decorative === true} onChange={(event) => a11y("decorative", event.target.checked)} />Decorative image</label>
            {!node.a11y?.decorative ? <DraftField key={`alt:${node.a11y?.alt ?? ""}`} label="Alternative text" value={node.a11y?.alt ?? ""} onCommit={(value) => a11y("alt", value)} /> : null}
          </> : null}
          <label className="flex items-center gap-2 text-[12px]"><input type="checkbox" checked={!isVisible(node, page, device)} onChange={(event) => {
            void run("Change visibility", () => primitiveVisibilityOperations(document, node, device, event.target.checked));
          }} />Hide on {device === "mobile" ? "phone" : device}</label>
        </div>
        {definition.children !== "none" ? <div className="space-y-2 border-t pt-3" style={{ borderColor: BUILDER.border }}>
          <p className="text-[12px] font-semibold">Inside this {definition.displayName.toLowerCase()}</p>
          <ul className="space-y-1">{orderChildrenForDevice(index.children(pageId, node.id), node, device, definition).map((child) => <li key={child.id}><button type="button" className={buttonClass} style={fieldStyle} onClick={() => onSelect(child.id)}>Edit {primitiveDefinition(child)?.displayName ?? child.type}{child.type === "text" ? `: ${String(child.props.text ?? "").slice(0, 25)}` : ""}</button></li>)}</ul>
          <div className="flex flex-wrap gap-2">{definition.children.allow.map((type) => <button key={type} type="button" className={buttonClass} style={fieldStyle} disabled={index.children(pageId, node.id).length >= (definition.children === "none" ? 0 : definition.children.max ?? Infinity)} onClick={() => void run(`Add ${type}`, () => { return [add(type as PrimitiveType, node.id).operation]; }, (operations) => operations[0].op === "insertNode" ? operations[0].node.id : null)}>Add {type}</button>)}</div>
        </div> : null}
        {node.parentId ? <label className="block space-y-1 text-[12px]">Container<select className={inputClass} style={fieldStyle} value={node.parentId} onChange={(event) => void run("Move to container", () => [primitiveReparentOperation(document, node.id, event.target.value as NodeId)])}>{containers.map(({ node: parent, depth }) => <option key={parent.id} value={parent.id}>{"— ".repeat(Math.min(depth, 8))}{primitiveDefinition(parent)?.displayName} {entries.findIndex((entry) => entry.node.id === parent.id) + 1}</option>)}</select></label> : null}
        <div className="flex flex-wrap gap-2 border-t pt-3" style={{ borderColor: BUILDER.border }}>
          <button type="button" className={buttonClass} style={fieldStyle} onClick={() => void run("Move element up", () => builderNodeMoveOperations(document, node.id, -1, device))}>Move up</button>
          <button type="button" className={buttonClass} style={fieldStyle} onClick={() => void run("Move element down", () => builderNodeMoveOperations(document, node.id, 1, device))}>Move down</button>
          <button type="button" className={buttonClass} style={fieldStyle} onClick={() => void run("Duplicate element", () => [primitiveDuplicateOperation(document, node.id)])}>Duplicate</button>
          {confirmRemove === node.id ? <><span className="text-[12px]">Remove this element and its children?</span><button type="button" className={buttonClass} onClick={() => void run("Remove element", () => [{ op: "removeNode", id: node.id }], null)}>Confirm remove</button><button type="button" className={buttonClass} onClick={() => setConfirmRemove(null)}>Cancel</button></>
            : <button type="button" className={buttonClass} style={fieldStyle} onClick={() => setConfirmRemove(node.id)}>Remove</button>}
        </div>
        {node.parentId ? <><p className="text-[10px]" style={{ color: BUILDER.muted }}>Order changes apply to the selected device. Tablet and phone inherit desktop until customised.</p>{device !== "desktop" && Object.hasOwn(document.nodes[node.parentId].overrides[device] ?? {}, "childOrder") ? <button type="button" className="text-[12px] underline" onClick={() => void run("Use desktop order", () => primitiveResetOverrideOperations(document.nodes[node.parentId!], device, "childOrder"))}>Use desktop order</button> : null}<button type="button" className="text-[12px] underline" onClick={() => onSelect(node.parentId)}>Edit parent container</button></> : null}
      </> : <p role="alert" className="text-[12px]">This element type or version is unsupported. Its saved content is preserved.</p>}
    </fieldset>
  </section>;
}
