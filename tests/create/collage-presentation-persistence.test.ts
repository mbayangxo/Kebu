import { describe, expect, it } from "vitest";
import { defaultCutoutCollageProps } from "@/lib/create/legally-blonde-defaults";
import { sectionPropsForSave } from "@/lib/create/section-props-boundary";
import { expectFor, type Op } from "@/lib/creative-core";
import { prepareBuilderTransaction, normalizeBuilderNode } from "@/lib/create/kcd-write-boundary";
import { websiteV1ToDocument, documentToWebsiteV1 } from "@/lib/create/kcd-adapter";
import type { WebsiteDefinition } from "@/lib/create/website-schema";

const presentation = { layerWidthScale: { cutoutAccent: .8 }, layerHeightScale: { cutoutAccent: 1.2 }, layerCrop: { cutoutAccent: 20 } };
function site(): WebsiteDefinition {
  return { schemaVersion: "website-v1", title: "Frame test", theme: { primary: "#111111", accent: "#E9006B", background: "#ffffff", text: "#111111", fontDisplay: "Oswald", fontBody: "Manrope", spacing: "comfortable" }, pages: [{ slug: "home", title: "Home", sections: [{ id: "scene", type: "legally-blonde-hero", props: { ...defaultCutoutCollageProps(), ...presentation } }] }] } as WebsiteDefinition;
}
describe("ordinary collage presentation persistence", () => {
  it("retains the inspector's image dimensions and crop at the canonical save boundary", () => {
    const saved = sectionPropsForSave("legally-blonde-hero", { ...defaultCutoutCollageProps(), ...presentation });
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    expect(saved.props).toMatchObject(presentation);
  });
  it("retains dimensions and crop through native normalization and export", () => {
    const doc = websiteV1ToDocument(site(), { id: "11111111-1111-4111-8111-111111111111" }).document;
    const node = Object.values(doc.nodes).find(item => item.type.includes("legally-blonde-hero"))!;
    expect(node).toBeDefined();
    doc.nodes[node.id] = normalizeBuilderNode(node);
    const saved = documentToWebsiteV1(doc) as WebsiteDefinition;
    expect(saved.pages[0]!.sections[0]!.props).toMatchObject(presentation);
  });
});
describe("collage transform request validation", () => {
  it.each([["layerWidthScale",0],["layerWidthScale",4],["layerHeightScale",-.1],["layerHeightScale",Infinity],["layerCrop",-1],["layerCrop",46],["layerCrop",NaN]] as const)("rejects invalid %s value %s", (key,value) => {
    expect(sectionPropsForSave("legally-blonde-hero", { ...defaultCutoutCollageProps(), [key]: { cutoutAccent: value } }).ok).toBe(false);
  });
  it("does not add transform metadata to a historical payload with none", () => {
    const result = sectionPropsForSave("legally-blonde-hero", defaultCutoutCollageProps());
    if (!result.ok) throw Error(result.error);
    for (const key of Object.keys(presentation)) expect(Object.hasOwn(result.props,key)).toBe(false);
  });
  it("accepts phone overrides and keeps desktop geometry during a canonical transaction", () => {
    const doc = websiteV1ToDocument(site(), { id: "11111111-1111-4111-8111-111111111111" }).document;
    const node = Object.values(doc.nodes).find(item => item.type.includes("legally-blonde-hero"))!;
    const ops: Op[] = [
      { op: "setOverride", id: node.id, device: "mobile", key: "layerWidthScale", value: { cutoutAccent: .6 } },
      { op: "setOverride", id: node.id, device: "mobile", key: "layerHeightScale", value: { cutoutAccent: .9 } },
      { op: "setOverride", id: node.id, device: "mobile", key: "layerCrop", value: { cutoutAccent: 10 } },
    ];
    const result = prepareBuilderTransaction(doc, { txId: "22222222-2222-4222-8222-222222222222", origin: "user", label: "Phone image frame", ops, expect: expectFor(doc,ops) });
    if (!result.ok) throw Error(result.error.message);
    expect(result.prediction.document.nodes[node.id]!.props).toMatchObject(presentation);
    expect(result.prediction.document.nodes[node.id]!.overrides.mobile).toMatchObject({ layerWidthScale: { cutoutAccent: .6 }, layerHeightScale: { cutoutAccent: .9 }, layerCrop: { cutoutAccent: 10 } });
    const saved = documentToWebsiteV1(result.prediction.document) as WebsiteDefinition;
    expect(saved.pages[0]!.sections[0]!.props).toMatchObject({ ...presentation, deviceOverrides: { mobile: { layerCrop: { cutoutAccent: 10 } } } });
  });
});
it.each(["mobile", "tablet"] as const)("rejects invalid nested %s frame settings before a canonical write", device => {
  const source = site(); source.pages[0]!.sections[0]!.props.deviceOverrides = { [device]: { layerCrop: { cutoutAccent: 80 } } };
  expect(sectionPropsForSave("legally-blonde-hero", source.pages[0]!.sections[0]!.props).ok).toBe(false);
  const doc = websiteV1ToDocument(site(), { id: "11111111-1111-4111-8111-111111111111" }).document;
  const node = Object.values(doc.nodes).find(item => item.type.includes("legally-blonde-hero"))!;
  const ops: Op[] = [{ op: "setOverride", id: node.id, device, key: "layerCrop", value: { cutoutAccent: 80 } }];
  expect(prepareBuilderTransaction(doc, { txId: "33333333-3333-4333-8333-333333333333", origin: "user", label: "Invalid crop", ops, expect: expectFor(doc,ops) }).ok).toBe(false);
});
