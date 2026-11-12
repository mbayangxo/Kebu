import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { maylecorAboutMayBlocks } from "@/lib/create/maylecor-about-bio";
import { experiencePlanTransaction, validateReferenceAnalysis } from "@/lib/create/experience-engine";
import { prepareBuilderTransaction } from "@/lib/create/kcd-write-boundary";
import { expectFor } from "@/lib/creative-core";
import { createKcdPublishedSnapshot, readKcdPublishedSnapshot } from "@/lib/create/kcd-published-snapshot";

import { images, profile, document, plan, apply } from "./fixtures/3j-maylecor";

describe("3J supplied-content native reconstruction", () => {
  it("uses actual nonempty owner assets rather than stock placeholders", () => {
    for (const path of images) expect(readFileSync(`public${path}`).byteLength).toBeGreaterThan(1000);
  });
  it("preserves all five destinations, biography wording, diacritics and independent media", () => {
    const { result } = apply(), saved = result.prediction.document;
    expect(saved.pages.map(page => page.slug)).toEqual(["home", "about", "music", "photos", "contact"]);
    const nodes = Object.values(saved.nodes);
    expect(nodes.every(node => ["section", "group", "text", "image"].includes(node.type))).toBe(true);
    for (const block of maylecorAboutMayBlocks()) expect(nodes.some(node => node.props.text === block.body)).toBe(true);
    expect(nodes.filter(node => node.type === "image")).toHaveLength(12);
    expect(nodes.filter(node => node.props.fontSize === 64).every(node => node.overrides.mobile?.fontSize === 32 && node.overrides.tablet?.fontSize === 44)).toBe(true);
  });
  it("undoes and redoes the complete multi-page reference without losing content", () => {
    const { initial, result } = apply(), saved = result.prediction.document;
    const undo = prepareBuilderTransaction(saved, { txId: crypto.randomUUID(), origin: "user", label: "Undo reference", ops: result.prediction.inverse, expect: expectFor(saved, result.prediction.inverse) });
    if (!undo.ok) throw Error(undo.error.message);
    expect(Object.keys(undo.prediction.document.nodes)).toHaveLength(0);
    expect(undo.prediction.document.pages.map(page => page.slug)).toEqual(initial.pages.map(page => page.slug));
    const redo = prepareBuilderTransaction(undo.prediction.document, { txId: crypto.randomUUID(), origin: "user", label: "Redo reference", ops: undo.prediction.inverse, expect: expectFor(undo.prediction.document, undo.prediction.inverse) });
    if (!redo.ok) throw Error(redo.error.message);
    expect(Object.values(redo.prediction.document.nodes).map(node => node.props)).toEqual(Object.values(saved.nodes).map(node => node.props));
  });
  it("reloads the published snapshot and detects tampering independently of later drafts", () => {
    const { result } = apply(), saved = result.prediction.document;
    const published = createKcdPublishedSnapshot(saved);
    expect(readKcdPublishedSnapshot(JSON.parse(JSON.stringify(published.snapshot)), published.contentHash)).toBeTruthy();
    const original = JSON.stringify(published.snapshot);
    Object.values(saved.nodes).find(node => node.type === "text")!.props.text = "Later draft";
    expect(JSON.stringify(published.snapshot)).toBe(original);
    expect(readKcdPublishedSnapshot({ ...published.snapshot, title: "Tampered" }, published.contentHash)).toBeNull();
  });
  it.each(["foreign media", "unsafe link", "forward parent", "future version", "legacy wrapper"])("rejects %s without mutating the source", scenario => {
    const source = document(), before = JSON.stringify(source), candidate = structuredClone(plan());
    if (scenario === "foreign media") candidate.pages[0].nodes.find(node => node.type === "image")!.props.src = "https://invented.test/portrait.png";
    if (scenario === "unsafe link") Object.assign(candidate.pages[0].nodes.find(node => node.type === "text")!.props, { href: "javascript:alert(1)" });
    if (scenario === "forward parent") candidate.pages[0].nodes[1].parent = 2;
    if (scenario === "future version") Object.assign(candidate, { version: 2 });
    if (scenario === "legacy wrapper") Object.assign(candidate.pages[0].nodes[0], { type: "legacy-section:maylecor-hero" });
    expect(() => experiencePlanTransaction(source, candidate, { kind: "site", replace: true }, profile())).toThrow();
    expect(JSON.stringify(source)).toBe(before);
  });
  it.each(["duplicate page", "missing home", "too many nodes", "missing alt", "invented contact", "mobile foreign media", "mobile foreign palette", "unknown props", "bad mobile typography", "inert override", "model child identity", "model motion"])("rejects %s atomically in the real-content plan", scenario => {
    const source = document(), before = JSON.stringify(source), candidate = plan(), page = candidate.pages[0];
    const image = page.nodes.find(node => node.type === "image")!, text = page.nodes.find(node => node.type === "text")!;
    if (scenario === "duplicate page") candidate.pages[1].slug = "home";
    if (scenario === "missing home") candidate.pages[0].slug = "missing";
    if (scenario === "too many nodes") for (let index = 0; index < 40; index++) page.nodes.push({ type: "text", parent: 0, rationale: "Exceeds transaction bound", props: { text: "Repeated owner copy" } });
    if (scenario === "missing alt") delete image.a11y;
    if (scenario === "invented contact") Object.assign(text.props, { href: "mailto:invented@example.test" });
    if (scenario === "mobile foreign media") Object.assign(image, { overrides: { mobile: { src: "/invented-mobile.png" } } });
    if (scenario === "mobile foreign palette") Object.assign(text, { overrides: { mobile: { color: "#123456" } } });
    if (scenario === "unknown props") Object.assign(text.props, { arbitraryCss: "position:fixed" });
    if (scenario === "bad mobile typography") Object.assign(text, { overrides: { mobile: { fontSize: 7 } } });
    if (scenario === "inert override") Object.assign(page.nodes[0], { overrides: { mobile: { background: "#FFF9F6" } } });
    if (scenario === "model child identity") Object.assign(page.nodes[1].props, { childOrder: [crypto.randomUUID()] });
    if (scenario === "model motion") Object.assign(text, { motion: { duration: 100000 } });
    expect(() => experiencePlanTransaction(source, candidate, { kind: "site", replace: true }, profile())).toThrow();
    expect(JSON.stringify(source)).toBe(before);
  });
  it("rejects locked replacement and out-of-bounds profile interactions", () => {
    const saved = apply().result.prediction.document;
    Object.values(saved.nodes).find(node => node.type === "group")!.locked = true;
    const before = JSON.stringify(saved);
    expect(() => experiencePlanTransaction(saved, plan(), { kind: "site", replace: true }, profile())).toThrow(/Unlock/);
    expect(JSON.stringify(saved)).toBe(before);
    const brand = profile(); Object.assign(brand.profile.motion, { enabled: true, interaction: "lift", maxDistance: 3 });
    expect(() => experiencePlanTransaction(document(), plan(), { kind: "site", replace: true }, brand)).toThrow(/distance limit/);
  });
  it("rejects fabricated reference evidence and keeps exact owner quotes", () => {
    const excerpt = maylecorAboutMayBlocks().map(block => block.body).join("\n\n");
    const evidence = "A New York African love story.";
    expect(validateReferenceAnalysis({ version: 1, observations: [{ evidence, observation: "The owner describes her cultural identity", inference: false }], uncertainties: ["No screenshot or music destination was supplied"] }, excerpt).observations[0].evidence).toBe(evidence);
    expect(() => validateReferenceAnalysis({ version: 1, observations: [{ evidence: "Tickets cost $100", observation: "Invented business claim", inference: false }], uncertainties: [] }, excerpt)).toThrow(/exact quote/);
  });
});
