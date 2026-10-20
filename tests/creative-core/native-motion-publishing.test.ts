import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { canonicalStringify } from "@/lib/creative-core";
import { createKcdPublishedSnapshot, readKcdPublishedSnapshot } from "@/lib/create/kcd-published-snapshot";
import { KcdPrimitiveSubtree } from "@/app/components/create/kcd/primitive-subtree";
import { motionFixture } from "./fixtures/motion";

describe("native motion publication", () => {
  it("requires renderer 7 and detaches motion from later draft changes", () => {
    const f = motionFixture(), published = createKcdPublishedSnapshot(f.doc);
    expect(published.snapshot.rendererRequirement.minVersion).toBe(7);
    f.doc.nodes[f.text].motion = undefined;
    expect(readKcdPublishedSnapshot(published.snapshot)?.nativeDocument.nodes[f.text].motion).toMatchObject({ preset: "rise" });
    const { contentHash, ...payload } = published.snapshot;
    expect(contentHash).toMatch(/^[a-f0-9]{64}$/);
    payload.rendererRequirement.minVersion = 6;
    expect(readKcdPublishedSnapshot({ ...payload, contentHash: createHash("sha256").update(canonicalStringify(payload)).digest("hex") })).toBeNull();
  });
  it("renders visible SSR content, unique identities and separate spatial transforms", () => {
    const f = motionFixture();
    const html = renderToStaticMarkup(createElement(KcdPrimitiveSubtree, { document: f.doc, rootId: f.root, device: "desktop", responsive: true }));
    expect(html.match(new RegExp(`<[a-z][^>]*data-kcd-node-id="${f.text}"`, "g"))).toHaveLength(1);
    expect(html).toContain(`data-kcd-motion-for="${f.text}"`);
    expect(html).toContain(`data-kcd-interaction-for="${f.text}"`);
    expect(html).toContain("rotate(20deg) scale(1.2, 1)");
    expect(html).not.toContain("opacity:0");
    expect(html).toContain("Desktop story");
  });
  it("preserves but refuses unknown motion and interaction payloads", () => {
    const f = motionFixture(); f.doc.nodes[f.text].motion = { version: 2, preset: "fade" };
    const before = JSON.stringify(f.doc);
    expect(() => createKcdPublishedSnapshot(f.doc)).toThrow();
    expect(JSON.stringify(f.doc)).toBe(before);
    delete f.doc.nodes[f.text].motion; f.doc.nodes[f.text].interaction = { version: 1, effect: "script" };
    expect(() => createKcdPublishedSnapshot(f.doc)).toThrow();
  });
});
