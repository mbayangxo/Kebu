import { buildIndex, constraintSchema, isSpatialLocked, resolveNode, duplicateSubtreeOp, keyBetween, newNodeId, orderRootsForDevice, orderChildrenForDevice, PILOT_DEFINITIONS, type Device, type KcdDocument, type KcdNode, type NodeId, type Op, type PageId, type SpatialBox, type SpatialConstraint } from "@/lib/creative-core";
import { PILOT_WEB_DOM_MANIFEST } from "@/lib/create/kcd-adapter/render-view";

import { chromeSuppressedIds } from "@/lib/create/kcd-adapter/chrome";

export type PrimitiveType = "section" | "group" | "text" | "image" | "video";
export function primitiveDefinition(node: Pick<KcdNode, "type" | "typeVersion">) {
  return PILOT_DEFINITIONS.find((definition) => definition.type === node.type && definition.version === node.typeVersion);
}
export function primitiveInsertOperation(document: KcdDocument, pageId: PageId, parentId: NodeId | null, type: PrimitiveType, id = newNodeId()): Op {
  const definition = primitiveDefinition({ type, typeVersion: 1 })!;
  if (!document.pages.some((page) => page.id === pageId)) throw new Error("This page is no longer available.");
  if ((parentId === null && definition.placement === "nested") || (parentId !== null && definition.placement === "root")) throw new Error("Add a section to the page, then add elements inside it.");
  const siblings = buildIndex(document).children(pageId, parentId);
  if (parentId !== null) {
    if (isSpatialLocked(document, parentId)) throw new Error("Unlock the container before adding elements.");
    const parent = document.nodes[parentId];
    const container = parent && primitiveDefinition(parent)?.children;
    if (!parent || parent.pageId !== pageId || !container || container === "none" || !container.allow.includes(type)) throw new Error("This element cannot contain that type.");
    if (container.max !== undefined && siblings.length >= container.max) throw new Error(`This container supports up to ${container.max} elements.`);
  }
  return { op: "insertNode", pageId, parentId, orderKey: keyBetween(siblings.at(-1)?.orderKey ?? null, null), node: {
    id, type, typeVersion: 1, props: type === "text" ? { text: "Write your text" } : (type === "image" || type === "video") ? { src: "" } : {}, overrides: {},
    ...(definition.a11yDefaults ? { a11y: { ...definition.a11yDefaults, ...(definition.a11yDefaults.role === "region" ? { label: definition.displayName } : {}) } } : {}),
  } };
}

/** Shared fields always change the base; only negotiated responsive fields get overrides. */
export function primitivePropertyOperations(node: KcdNode, device: Device, key: string, value: unknown): Op[] {
  const definition = primitiveDefinition(node);
  const descriptor = definition?.properties.find((property) => property.key === key);
  if (!definition || !descriptor || !definition.capabilities.has(descriptor.capability) || !PILOT_WEB_DOM_MANIFEST.supports(node.type, descriptor.capability)) throw new Error("This setting is not supported by the current renderer.");
  const effective = resolveNode(node, device, definition);
  if (!definition.propsSchema.safeParse({ ...effective, [key]: value }).success) throw new Error(`Choose a valid value for ${descriptor.control === "media" ? "image address" : descriptor.label.toLowerCase()}.`);
  if (device !== "desktop" && descriptor.overridable) {
    return [{ op: "setOverride", id: node.id, device, key, value }, { op: "setResponsiveState", id: node.id, value: { ...node.responsiveState, mode: "custom" } }];
  }
  return [{ op: "setProp", id: node.id, path: key, value }];
}

export function primitiveResetOverrideOperations(node: KcdNode, device: Exclude<Device, "desktop">, key: string): Op[] {
  const remaining = Object.entries(node.overrides).some(([bucket, values]) => Object.keys(values ?? {}).some((name) => bucket !== device || name !== key));
  return [{ op: "clearOverride", id: node.id, device, key }, { op: "setResponsiveState", id: node.id, value: { ...node.responsiveState, mode: remaining ? "custom" : "auto" } }];
}

/** Root composition and native container order remain independent per device. */
export function builderNodeMoveOperations(document: KcdDocument, id: NodeId, direction: -1 | 1, device: Device = "desktop"): Op[] {
  if (isSpatialLocked(document, id)) throw new Error("Unlock this element or its container before editing.");
  const node = document.nodes[id];
  if (!node) throw new Error("This element is no longer available.");
  const page = document.pages.find((page) => page.id === node.pageId)!;
  const siblings = buildIndex(document).children(node.pageId, node.parentId);
  const suppressed = node.parentId === null ? chromeSuppressedIds(document) : new Set<NodeId>();
  const ordered = node.parentId === null ? orderRootsForDevice(siblings, page, device).filter((sibling) => !suppressed.has(sibling.id) && (device === "desktop" || !page.deviceLayout[device]?.hidden?.includes(sibling.id))) : orderChildrenForDevice(siblings, document.nodes[node.parentId!], device, primitiveDefinition(document.nodes[node.parentId!]));
  const from = ordered.findIndex((sibling) => sibling.id === id);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= ordered.length) return [];
  if (node.parentId === null && device !== "desktop") {
    const order = ordered.map((sibling) => sibling.id);
    [order[from], order[to]] = [order[to], order[from]];
    return [{ op: "setDeviceComposition", pageId: page.id, device, composition: { ...page.deviceLayout[device], order } }];
  }
  if (node.parentId !== null && (device !== "desktop" || document.nodes[node.parentId].props.childOrder !== undefined)) {
    const order = ordered.map(sibling => sibling.id);
    [order[from], order[to]] = [order[to], order[from]];
    return primitivePropertyOperations(document.nodes[node.parentId], device, "childOrder", order);
  }
  const rest = ordered.filter((sibling) => sibling.id !== id);
  return [{ op: "moveNode", id, parentId: node.parentId, orderKey: keyBetween(rest[to - 1]?.orderKey ?? null, rest[to]?.orderKey ?? null) }];
}

export function primitiveDuplicateOperation(document: KcdDocument, id: NodeId, createId = newNodeId): Op {
  if (isSpatialLocked(document, id)) throw new Error("Unlock this element or its container before editing.");
  const node = document.nodes[id];
  if (!node) throw new Error("This element is no longer available.");
  const siblings = buildIndex(document).children(node.pageId, node.parentId);
  const at = siblings.findIndex((sibling) => sibling.id === id);
  return duplicateSubtreeOp(document, id, { parentId: node.parentId, orderKey: keyBetween(node.orderKey, siblings[at + 1]?.orderKey ?? null) }, createId);
}

export function primitiveReparentOperation(document: KcdDocument, id: NodeId, parentId: NodeId): Op {
  if (isSpatialLocked(document, id)) throw new Error("Unlock this element or its container before editing.");
  const node = document.nodes[id];
  const parent = document.nodes[parentId];
  if (isSpatialLocked(document, parentId)) throw new Error("Unlock the container before moving elements into it.");
  if (!node || !parent || node.pageId !== parent.pageId) throw new Error("Choose a container on the same page.");
  const definition = primitiveDefinition(parent);
  if (!definition || definition.children === "none" || !definition.children.allow.includes(node.type)) throw new Error("This container cannot contain that element.");
  for (let current: KcdNode | undefined = parent; current; current = current.parentId ? document.nodes[current.parentId] : undefined) {
    if (current.id === id) throw new Error("An element cannot be placed inside itself.");
  }
  const children = buildIndex(document).children(node.pageId, parentId).filter((child) => child.id !== id);
  if (definition.children.max !== undefined && children.length >= definition.children.max) throw new Error("This container is full.");
  return { op: "moveNode", id, parentId, orderKey: keyBetween(children.at(-1)?.orderKey ?? null, null) };
}

export function primitiveVisibilityOperation(node: KcdNode, device: Device, hidden: boolean): Op {
  const value = { ...node.visibility };
  if (value.showOn) {
    const visible = new Set(value.showOn.filter((item) => !value.hideOn?.includes(item)));
    if (hidden) visible.delete(device); else visible.add(device);
    if (!visible.size) throw new Error("Keep this element visible on at least one device, or remove it.");
    delete value.hideOn;
    if (visible.size === 3) delete value.showOn; else value.showOn = [...visible];
  } else {
    const hideOn = new Set(value.hideOn ?? []);
    if (hidden) hideOn.add(device); else hideOn.delete(device);
    if (hideOn.size === 3) throw new Error("Keep this element visible on at least one device, or remove it.");
    if (hideOn.size) value.hideOn = [...hideOn]; else delete value.hideOn;
  }
  return { op: "setVisibility", id: node.id, value: Object.keys(value).length ? value : null };
}

/** Showing an element also removes stored hidden-prop and page-composition gates atomically. */
export function primitiveVisibilityOperations(document: KcdDocument, node: KcdNode, device: Device, hidden: boolean): Op[] {
  const ops: Op[] = [];
  let effective = node;
  if (!hidden && node.props.hidden === true) {
    ops.push({ op: "unsetProp", id: node.id, path: "hidden" });
    effective = { ...node, visibility: { showOn: [device] } };
  }
  ops.push(primitiveVisibilityOperation(effective, device, hidden));
  if (!hidden && node.parentId === null && device !== "desktop") {
    const page = document.pages.find(page => page.id === node.pageId);
    const composition = page?.deviceLayout[device];
    if (composition?.hidden?.includes(node.id)) {
      const value = { ...composition, hidden: composition.hidden.filter(id => id !== node.id) };
      if (!value.hidden.length) delete (value as { hidden?: string[] }).hidden;
      ops.push({ op: "setDeviceComposition", pageId: node.pageId, device, composition: value });
    }
  }
  return ops;
}

/** A gesture is one bounded transaction, through the same history/save boundary as the inspector. */
export function primitiveGeometryOperations(document: KcdDocument, id: NodeId, device: Device, patch: unknown): Op[] {
  const node = document.nodes[id];
  if (!node || !node.parentId || !primitiveDefinition(node)) throw new Error("Choose a native element inside a container.");
  if (isSpatialLocked(document, id)) throw new Error("Unlock the element or its container before editing.");
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) throw new Error("Invalid element geometry.");
  const values = Object.entries(patch);
  const keys = ["x", "y", "elementWidth", "elementHeight", "referenceWidth", "referenceHeight"];
  if (!values.length || values.some(([key, value]) => !keys.includes(key) || typeof value !== "number" || !Number.isFinite(value))) throw new Error("Invalid element geometry.");
  for (const [key, value] of values) if ((key === "referenceWidth" || key === "referenceHeight") && (Number(value) < 16 || Number(value) > 10000)) throw new Error("Invalid container size.");
  const ops = primitivePropertyOperations(node, device, "position", "absolute");
  for (const [key, value] of values) {
    if (key === "referenceWidth" || key === "referenceHeight") {
      const constraintKey = key === "referenceWidth" ? "constraintX" : "constraintY";
      const constraint = resolveNode(node, device, primitiveDefinition(node))[constraintKey] as SpatialConstraint | undefined;
      if (constraint) ops.push(...primitivePropertyOperations(node, device, constraintKey, { ...constraint, reference: value }));
    } else ops.push(...primitivePropertyOperations(node, device, key, value));
  }
  const parent = document.nodes[node.parentId];
  if (!parent || !primitiveDefinition(parent)) throw new Error("The element's container is unavailable.");
  if (resolveNode(parent, device, primitiveDefinition(parent)).canvasHeight === undefined) {
    ops.push(...primitivePropertyOperations(parent, device, "canvasHeight", 600));
  }
  return ops;
}

/** Capture current geometry and both references to preserve the visible layout. */
export function primitiveConstraintOperations(doc: KcdDocument, id: NodeId, device: Device, key: "constraintX" | "constraintY", mode: unknown, measured: { box: SpatialBox; container: { width: number; height: number } }): Op[] {
  const current = doc.nodes[id];
  if (!current) throw new Error("This element is no longer available.");
  const parent = current.parentId ? doc.nodes[current.parentId] : undefined;
  const unsetHeight = parent && resolveNode(parent, device, primitiveDefinition(parent)).canvasHeight === undefined;
  const container = { ...measured.container, height: unsetHeight ? Math.max(600, measured.container.height) : measured.container.height };
  const reference = key === "constraintX" ? container.width : container.height;
  const value = constraintSchema.parse({ mode, reference });
  return [...primitiveGeometryOperations(doc, id, device, { ...measured.box, referenceWidth: container.width, referenceHeight: container.height }), ...primitivePropertyOperations(current, device, key, value)];
}
