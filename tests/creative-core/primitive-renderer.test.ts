import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Device, NodeId } from "@/lib/creative-core";
import { KcdPrimitiveSubtree } from "@/app/components/create/kcd/primitive-subtree";
import { emptyDocument, node, PAGE_A, uuidFor } from "./helpers";

function fixture() {
  const doc = emptyDocument();
  const section = node({ id: uuidFor(101) as NodeId, type: "section", pageId: PAGE_A, orderKey: "V", props: { background: "token:primary" } });
  const group = node({ id: uuidFor(102) as NodeId, type: "group", pageId: PAGE_A, parentId: section.id, orderKey: "V", props: { direction: "row", gap: "lg" }, overrides: { tablet: { direction: "column" } } });
  const text = node({ id: uuidFor(103) as NodeId, type: "text", pageId: PAGE_A, parentId: group.id, orderKey: "V", props: { text: "Desktop story", variant: "heading" }, overrides: { mobile: { text: "Phone story" } }, a11y: { headingLevel: 1, lang: "wo" } });
  const image = node({ id: uuidFor(104) as NodeId, type: "image", pageId: PAGE_A, parentId: group.id, orderKey: "k", props: { src: "/uploads/portrait.webp", aspectRatio: "3:4", fit: "contain", href: "contact" }, a11y: { alt: "Artist portrait" } });
  for (const n of [section, group, text, image]) doc.nodes[n.id] = n;
  const html = (device: Device = "desktop") => renderToStaticMarkup(createElement(KcdPrimitiveSubtree, { document: doc, rootId: section.id, device }));
  return { doc, section, group, text, image, html };
}

describe("S6 native primitive subtree", () => {
  it("renders nesting in canonical sibling order with semantic headings and media", () => {
    const { html, group, text, image } = fixture();
    const out = html();
    expect(out).toContain('background:#0F0D33');
    expect(out).toContain('flex-direction:row');
    expect(out).toContain('<h1');
    expect(out).toContain('lang="wo"');
    expect(out).toContain('alt="Artist portrait"');
    expect(out).toContain('aspect-ratio:3 / 4');
    expect(out).toContain('href="/contact"');
    expect(out.indexOf(`data-kcd-node-id="${group.id}"`)).toBeLessThan(out.indexOf(`data-kcd-node-id="${text.id}"`));
    expect(out.indexOf(`data-kcd-node-id="${text.id}"`)).toBeLessThan(out.indexOf(`data-kcd-node-id="${image.id}"`));
  });

  it("resolves each device from desktop independently", () => {
    const { html } = fixture();
    expect(html("tablet")).toContain('flex-direction:column');
    expect(html("tablet")).toContain('Desktop story');
    expect(html("mobile")).toContain('flex-direction:row');
    expect(html("mobile")).toContain('Phone story');
    expect(html("mobile")).not.toContain('Desktop story');
  });

  it("hides a parent and its descendants without duplicating the DOM", () => {
    const { html, group } = fixture();
    group.visibility = { hideOn: ["mobile"] };
    expect(html("mobile")).not.toContain('Phone story');
    expect(html("desktop")).toContain('Desktop story');
  });

  it("escapes authored text and rejects invalid native props", () => {
    const { text, html } = fixture();
    text.props.text = '<script>bad()</script>';
    expect(html()).toContain('&lt;script&gt;bad()&lt;/script&gt;');
    text.props.unrecognized = true;
    expect(() => html()).toThrow('Invalid Text properties');
  });

  it("reports unsupported node versions, capabilities and unavailable tokens", () => {
    const { html, text, section } = fixture();
    text.typeVersion = 2;
    expect(() => html()).toThrow('Unsupported native element');
    text.typeVersion = 1; text.motion = { enabled: true };
    expect(() => html()).toThrow('Invalid motion');
    delete text.motion; section.props.background = 'token:missing';
    expect(() => html()).toThrow('cannot be rendered');
  });

  it("refuses protocol-relative image and link addresses", () => {
    const { html, image } = fixture();
    image.props.src = '//foreign.example/image.webp';
    expect(() => html()).toThrow('Invalid Image properties');
    image.props.src = '/image.webp'; image.props.href = '//foreign.example';
    expect(() => html()).toThrow('Invalid Image properties');
  });

  it("renders decorative images without alternative content", () => {
    const { html, image } = fixture();
    image.a11y = { decorative: true, alt: "Must not be announced" };
    expect(html()).toContain('alt=""');
    expect(html()).not.toContain('Must not be announced');
  });
});
