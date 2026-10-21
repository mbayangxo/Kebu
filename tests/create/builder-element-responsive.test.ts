import { describe, expect, it } from "vitest";
import { hasBuilderElementDeviceOverride as has, resetBuilderElementDeviceOverride as reset } from "@/lib/create/builder-element-responsive";
import type { BuilderElementSelection } from "@/lib/create/builder-selection";
import type { DeviceBucket } from "@/lib/create/device-overrides";
import { mergeDeviceAwareSectionProps } from "@/lib/create/device-overrides";
const image: BuilderElementSelection = { sectionId: "scene", elementId: "cutoutAccent", kind: "image", label: "Accent" };
const other = { ...image, elementId: "titleLogo" };
const extra = { ...image, elementId: "extra:flower", kind: "cutout" as const };
const bucket = (props: Record<string, unknown>) => props.deviceOverrides as DeviceBucket;
const apply = (props: Record<string, unknown>, selection = image) => ({ ...props, ...reset(props, "mobile", selection) });

describe("selected-object responsive inheritance", () => {
  it.each(["layerScales", "layerWidthScale", "layerHeightScale", "layerCrop", "layerZIndex", "layerOpacity", "layerRotation", "layerPositions"])("restores only the selected entry in %s", field => {
    const a = field === "layerPositions" ? { leftPct: 10, topPct: 20 } : .8;
    const b = field === "layerPositions" ? { leftPct: 30, topPct: 40 } : 1.2;
    const props = { [field]: { cutoutAccent: a, titleLogo: a }, deviceOverrides: { mobile: { [field]: { cutoutAccent: b, titleLogo: b }, sectionMinHeightPx: 900 }, tablet: { [field]: { cutoutAccent: b } }, _state: { mode: "custom" as const, baseHash: "keep" } } };
    const before = structuredClone(props);
    expect(has(props, "mobile", image)).toBe(true);
    const next = apply(props);
    expect(mergeDeviceAwareSectionProps(next, "mobile")[field]).toEqual({ cutoutAccent: a, titleLogo: b });
    expect(has(next, "mobile", image)).toBe(false);
    expect(has(next, "mobile", other)).toBe(true);
    expect(bucket(next).tablet).toEqual(props.deviceOverrides.tablet);
    expect(bucket(next)._state).toEqual(props.deviceOverrides._state);
    expect(bucket(next).mobile?.sectionMinHeightPx).toBe(900);
    expect(props).toEqual(before);
    expect(apply(next)).toEqual(next);
  });
  it("does not report another object's map edits as this object's override", () => {
    const props = { deviceOverrides: { mobile: { layerCrop: { titleLogo: 20 } } } };
    expect(has(props, "mobile", image)).toBe(false);
    expect(has(props, "mobile", other)).toBe(true);
  });
  it("removes a device entry when desktop has no explicit entry", () => {
    const next = apply({ deviceOverrides: { mobile: { layerCrop: { cutoutAccent: 20, titleLogo: 12 } } } });
    expect(bucket(next).mobile?.layerCrop).toEqual({ titleLogo: 12 });
    expect(has(next, "mobile", image)).toBe(false);
  });
  it("detects omission of an explicit desktop entry in a replacement map", () => {
    const props = { layerCrop: { cutoutAccent: 12 }, deviceOverrides: { mobile: { layerCrop: { titleLogo: 20 } } } };
    expect(has(props, "mobile", image)).toBe(true);
    expect(mergeDeviceAwareSectionProps(apply(props), "mobile").layerCrop).toEqual({ cutoutAccent: 12, titleLogo: 20 });
  });
  it("cleans a fully inherited map and device slot, keeping state metadata", () => {
    const next = apply({ layerCrop: { cutoutAccent: 3 }, deviceOverrides: { mobile: { layerCrop: { cutoutAccent: 12 } }, _state: { mode: "auto" as const } } });
    expect(bucket(next)).toEqual({ _state: { mode: "auto" } });
  });
  it("restores only selected hidden/locked membership, including explicit unhide and unlock", () => {
    const props = { hiddenLayers: ["cutoutAccent"], lockedLayers: ["titleLogo"], deviceOverrides: { mobile: { hiddenLayers: ["titleLogo"], lockedLayers: ["cutoutAccent"] } } };
    const next = apply(props);
    expect(mergeDeviceAwareSectionProps(next, "mobile")).toMatchObject({ hiddenLayers: ["titleLogo", "cutoutAccent"], lockedLayers: [] });
    expect(has(next, "mobile", image)).toBe(false);
    expect(has(next, "mobile", other)).toBe(true);
  });
  it("resets a cutout by ID without clearing another cutout's content, geometry or order", () => {
    const flower = { id: "flower", src: "original.png", leftPct: 20 }, other = { id: "other", src: "new.png", leftPct: 90 };
    const props = { extraCutouts: [flower, { ...other, src: "old.png" }], deviceOverrides: { mobile: { extraCutouts: [other, { ...flower, src: "phone.png", leftPct: 70 }], layerCrop: { flower: 12, other: 20 } } } };
    const next = apply(props, extra);
    expect(mergeDeviceAwareSectionProps(next, "mobile")).toMatchObject({ extraCutouts: [other, flower], layerCrop: { other: 20 } });
    expect(has(next, "mobile", extra)).toBe(false);
  });
  it("restores a removed base cutout and removes a phone-only cutout without clearing neighbours", () => {
    const flower = { id: "flower", src: "original.png" }, neighbour = { id: "other", src: "phone.png" };
    const restored = apply({ extraCutouts: [flower], deviceOverrides: { mobile: { extraCutouts: [neighbour] } } }, extra);
    expect(mergeDeviceAwareSectionProps(restored, "mobile").extraCutouts).toEqual([flower, neighbour]);
    const removed = apply({ extraCutouts: [], deviceOverrides: { mobile: { extraCutouts: [neighbour, flower] } } }, extra);
    expect(mergeDeviceAwareSectionProps(removed, "mobile").extraCutouts).toEqual([neighbour]);
  });
  it("resets only title content and selected layer settings, preserving another object's edits", () => {
    const props = { title: "May", deviceOverrides: { mobile: { title: "Phone", titleTextFontSize: 28, layerWidthScale: { titleLogo: 1.4, cutoutAccent: 1.2 }, sectionMinHeightPx: 900 } } };
    const next = apply(props, other);
    expect(mergeDeviceAwareSectionProps(next, "mobile")).toMatchObject({ title: "May", layerWidthScale: { cutoutAccent: 1.2 }, sectionMinHeightPx: 900 });
    expect(has(next, "mobile", other)).toBe(false);
  });
  it.each([
    ["heroCanvas", "control", "sectionMinHeightPx"],
    ["siteFooter", "control", "embeddedFooterPaddingTop"],
    ["background", "background", "backgroundLayer"],
  ] as const)("resets %s without touching layer maps or other section settings", (elementId, kind, field) => {
    const selection = { ...image, elementId, kind };
    const props = { [field]: 10, deviceOverrides: { mobile: { [field]: 20, layerCrop: { titleLogo: 12 }, subtitle: "Keep" } } };
    const next = apply(props, selection);
    expect(has(props, "mobile", selection)).toBe(true);
    expect(has(next, "mobile", selection)).toBe(false);
    expect(mergeDeviceAwareSectionProps(next, "mobile")).toMatchObject({ [field]: 10, layerCrop: { titleLogo: 12 }, subtitle: "Keep" });
  });
  it("restores image source and keeps unsupported controls and desktop untouched", () => {
    const props = { cutoutAccent: "base.png", deviceOverrides: { mobile: { cutoutAccent: "phone.png" } } };
    expect(has(props, "mobile", image)).toBe(true);
    expect(mergeDeviceAwareSectionProps(apply(props), "mobile").cutoutAccent).toBe("base.png");
    expect(reset(props, "desktop", image)).toEqual({});
    expect(has(props, "desktop", image)).toBe(false);
    expect(has(props, "mobile", { ...image, elementId: "socialRail", kind: "control" })).toBe(false);
  });
});
