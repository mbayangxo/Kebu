import { buildIndex, evenlySpacedKeys, keyBetween, type KcdDocument, type KcdNode, type NodeId, type Op, type PageId } from "@/lib/creative-core";
import { liftStoredProps, type LegacySectionType } from "@/lib/create/kcd-adapter";
import { writeRowProps } from "@/lib/create/kcd-adapter/sections";
import { defaultSectionProps } from "@/lib/create/section-defaults";
import { sectionPropsForSave } from "@/lib/create/section-props-boundary";
import { canonicalJson } from "@/lib/create/device-overrides";

const equal = (a: unknown, b: unknown) => a === b || canonicalJson(a ?? null) === canonicalJson(b ?? null);

/** Translate the existing inspector's stored-shape patches into the frozen operation vocabulary. */
export function builderPatchOperations(node: KcdNode, patch: Record<string, unknown>): Op[] {
  const before = writeRowProps(node);
  const { fields, issues } = liftStoredProps({ ...before, ...patch });
  const issue = issues.find((issue) => Object.hasOwn(patch, issue.field.split(".")[0]));
  if (issue) throw new Error(issue.message);
  const ops: Op[] = [];
  for (const [key, value] of Object.entries(patch)) {
    if (key === "deviceOverrides") {
      for (const device of ["tablet", "mobile"] as const) {
        const oldBucket = node.overrides[device] ?? {};
        const nextBucket = fields.overrides[device] ?? {};
        for (const name of new Set([...Object.keys(oldBucket), ...Object.keys(nextBucket)])) {
          if (equal(oldBucket[name], nextBucket[name])) continue;
          ops.push(name in nextBucket ? { op: "setOverride", id: node.id, device, key: name, value: nextBucket[name] }
            : { op: "clearOverride", id: node.id, device, key: name });
        }
      }
      if (!equal(node.responsiveState, fields.responsiveState)) ops.push({ op: "setResponsiveState", id: node.id, value: fields.responsiveState ?? null });
    } else if (key === "_a11y" || key === "_visibility" || key === "_locked") {
      const field = key === "_a11y" ? "a11y" : key === "_visibility" ? "visibility" : "locked";
      if (!equal(node[field], fields[field])) ops.push({ op: key === "_a11y" ? "setA11y" : key === "_visibility" ? "setVisibility" : "setLocked", id: node.id, value: fields[field] ?? null });
    } else if (["_motion", "_interaction", "_dataBinding"].includes(key)) {
      if (!equal(before[key], value)) throw new Error("This setting cannot yet be edited on the operation path. Your saved value is preserved.");
    } else if (!equal(node.props[key], value)) {
      ops.push(value === undefined ? { op: "unsetProp", id: node.id, path: key } : { op: "setProp", id: node.id, path: key, value });
    }
  }
  return ops;
}

export function builderInsertOperation(doc: KcdDocument, pageId: PageId, type: LegacySectionType, props: Record<string, unknown> | undefined, after: string | null | undefined, id: NodeId): Op {
  const checked = sectionPropsForSave(type, { ...defaultSectionProps(type), ...props });
  if (!checked.ok) throw new Error(checked.error);
  const { fields } = liftStoredProps(checked.props);
  const roots = buildIndex(doc).children(pageId, null);
  let index = roots.length;
  if (after === null) index = 0;
  else if (after !== undefined) {
    const found = roots.findIndex((node) => node.id === after);
    if (found < 0) throw new Error("The insertion point is no longer on this page.");
    index = found + 1;
  }
  return { op: "insertNode", pageId, parentId: null,
    orderKey: keyBetween(roots[index - 1]?.orderKey ?? null, roots[index]?.orderKey ?? null),
    node: { id, type: `legacy-section:${type}`, typeVersion: 1, ...fields } };
}

export function builderReorderOperations(doc: KcdDocument, pageId: PageId, ids: string[]): Op[] {
  const roots = buildIndex(doc).children(pageId, null);
  if (ids.length !== roots.length || new Set(ids).size !== ids.length || roots.some((node) => !ids.includes(node.id))) throw new Error("The page changed. Reload before reordering.");
  const keys = evenlySpacedKeys(ids.length);
  return ids.flatMap((id, index) => doc.nodes[id as NodeId].orderKey === keys[index] ? [] : [{ op: "moveNode" as const, id: id as NodeId, parentId: null, orderKey: keys[index] }]);
}

/** Add a page and its starter sections as one history action. */
export function builderInsertPageOperations(doc: KcdDocument, title: string, slug: string, pageId: PageId, heroId: NodeId, textId: NodeId): Op[] {
  const page = { id: pageId, title, slug, orderKey: keyBetween(doc.pages.at(-1)?.orderKey ?? null, null), deviceLayout: {} };
  const staged = { ...doc, pages: [...doc.pages, { ...page, layoutVersion: 1 }] };
  const hero = builderInsertOperation(staged, pageId, "hero", { heading: title,
    subheading: "Use Sections in the left rail to add or remove blocks — the canvas stays a clean preview.", buttonLabel: "Contact", buttonHref: "/contact" }, undefined, heroId);
  const text = builderInsertOperation(staged, pageId, "text", { heading: title,
    body: "Write your story here. Add gallery, FAQ, products, or forms from the left Sections panel." }, undefined, textId);
  if (text.op !== "insertNode" || hero.op !== "insertNode") throw new Error("Invalid page seed.");
  text.orderKey = keyBetween(hero.orderKey, null);
  return [{ op: "insertPage", page }, hero, text];
}

export function builderReorderPageOperations(doc: KcdDocument, ids: string[]): Op[] {
  if (ids.length !== doc.pages.length || new Set(ids).size !== ids.length || doc.pages.some((page) => !ids.includes(page.id))) throw new Error("The page list changed. Reload before reordering.");
  const keys = evenlySpacedKeys(ids.length);
  return ids.flatMap((id, index) => doc.pages.find((page) => page.id === id)!.orderKey === keys[index] ? [] : [{ op: "movePage" as const, pageId: id as PageId, orderKey: keys[index] }]);
}
