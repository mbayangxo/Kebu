import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { KcdPrimitiveSubtree } from "@/app/components/create/kcd/primitive-subtree";
import { assertKcdPublishable, createKcdPublishedSnapshot, readKcdPublishedSnapshot } from "@/lib/create/kcd-published-snapshot";
import { decodePublicSnapshot } from "@/lib/create/public-site-snapshot";
import { emptyDocument, node, PAGE_A, uuidFor } from "./helpers";
import type { NodeId } from "@/lib/creative-core";

function fixture() {
 const doc = emptyDocument();
 const section = node({ id: uuidFor(101) as NodeId, type: "section", pageId: PAGE_A, orderKey: "V", props: { background: "token:primary" } });
 const text = node({ id: uuidFor(102) as NodeId, type: "text", pageId: PAGE_A, parentId: section.id, orderKey: "V", props: { text: "Desktop", href: "home" }, overrides: { mobile: { text: "Phone" } }, a11y: { headingLevel: 1 } });
 const image = node({ id: uuidFor(103) as NodeId, type: "image", pageId: PAGE_A, parentId: section.id, orderKey: "k", props: { src: "/brand/kebu-mark.png", href: "contact" }, a11y: { alt: "Kebu" }, visibility: { hideOn: ["mobile"] } });
 for (const n of [section,text,image]) doc.nodes[n.id]=n;
 return { doc, section, text, image };
}
describe("S7 immutable native publishing", () => {
 it("detaches draft objects and verifies hash, format, renderer and project ownership", () => {
  const {doc,text}=fixture(); const prepared=createKcdPublishedSnapshot(doc);
  const decoded=readKcdPublishedSnapshot(prepared.snapshot,prepared.contentHash)!;
  expect(decoded.nativeDocument).toEqual(doc);
  doc.nodes[text.id].props.text="Later draft";
  expect(readKcdPublishedSnapshot(prepared.snapshot)?.nativeDocument.nodes[text.id].props.text).toBe("Desktop");
  expect(readKcdPublishedSnapshot({...prepared.snapshot,publishedAt:"invalid"})).toBeNull();
  expect(readKcdPublishedSnapshot({...prepared.snapshot,rendererRequirement:{renderer:"web-dom",minVersion:4}})).toBeNull();
  expect(decodePublicSnapshot({project_id:uuidFor(999),schema_version:"kcd-1",content_hash:prepared.contentHash,snapshot:prepared.snapshot})).toBeNull();
 });
 it.each(["desktop","tablet","mobile"] as const)("preserves exact native preview content on %s", device => {
  const {doc,section}=fixture(); const decoded=readKcdPublishedSnapshot(createKcdPublishedSnapshot(doc).snapshot)!;
  const html=(document:typeof doc)=>renderToStaticMarkup(createElement(KcdPrimitiveSubtree,{document,rootId:section.id,device}));
  expect(html(decoded.nativeDocument)).toBe(html(doc));
 });
 it("uses the published site base and pre-hydration responsive visibility for links and images", () => {
  const {doc,section,image}=fixture();
  const html=renderToStaticMarkup(createElement(KcdPrimitiveSubtree,{document:doc,rootId:section.id,device:"desktop",siteBase:"/sites/test",responsive:true}));
  expect(html).toContain('href="/sites/test/contact"');expect(html).toContain('href="/sites/test"');
  expect(html).toContain('alt="Kebu"');expect(html).toContain('(width <= 640px)');
  expect(html).toContain(`data-kcd-link-for="${image.id}"`);
 });
 it("blocks unsupported hidden capabilities, device settings, unsafe assets and unresolved tokens", () => {
  const {doc,text,image}=fixture();
  text.motion={kind:"future"} as never;expect(()=>assertKcdPublishable(doc)).toThrow();delete text.motion;
  text.overrides.mobile={unknown:"stored"};expect(()=>assertKcdPublishable(doc)).toThrow();text.overrides={};
  image.props.src="//evil.test/image.png";expect(()=>assertKcdPublishable(doc)).toThrow();image.props.src="/image.png";
  text.props.color="token:missing";expect(()=>assertKcdPublishable(doc)).toThrow();
 });
 it("keeps legacy snapshots compatible when schema columns are absent and rejects future formats", () => {
  const {doc}=fixture();const definition={...readKcdPublishedSnapshot(createKcdPublishedSnapshot(doc).snapshot)!.definition,pages:[{slug:"home",title:"Home",sections:[{type:"text",props:{heading:"Hello",body:"World"}}]}]};
  expect(decodePublicSnapshot({snapshot:definition})?.definition).toEqual(definition);
  expect(decodePublicSnapshot({snapshot:definition,schema_version:"future"})).toBeNull();
 });
});

it("reads the envelope verified by the real QA PostgreSQL publish transaction",async()=>{
 const {readFileSync}=await import("node:fs");const {resolve}=await import("node:path");
 const prepared=JSON.parse(readFileSync(resolve("evidence/3c/s7/qa/publish-envelope.json"),"utf8"));
 const decoded=readKcdPublishedSnapshot(prepared.snapshot,prepared.contentHash);
 expect(decoded?.nativeDocument.title).toBe("QA publishing smoke");
 expect(Object.values(decoded!.nativeDocument.nodes).find(node=>node.type==="text")?.props.text).toBe("QA native story");
});
