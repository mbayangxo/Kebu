import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { canonicalStringify, visualEffectStyle } from "@/lib/creative-core";
import { primitivePropertyOperations } from "@/lib/create/kcd-primitive-operations";
import { createKcdPublishedSnapshot, readKcdPublishedSnapshot } from "@/lib/create/kcd-published-snapshot";
import { KcdPrimitiveSubtree } from "@/app/components/create/kcd/primitive-subtree";
import { artDirectionFixture } from "./fixtures/art-direction";

describe("native visual effects", () => {
 it("validates bounds and produces ordinary independent device operations", () => {
  const f=artDirectionFixture(),image=f.doc.nodes[f.image];
  expect(primitivePropertyOperations(image,"mobile","mask","arch")).toMatchObject([{op:"setOverride",device:"mobile",key:"mask",value:"arch"},{op:"setResponsiveState"}]);
  for(const [key,value] of [["mask","url(javascript:bad)"],["opacity",0],["blur",21],["brightness",Infinity],["saturation",-1],["shadow","arbitrary"]])expect(()=>primitivePropertyOperations(image,"desktop",String(key),value)).toThrow();
 });
 it("requires renderer 8, rejects an understated hash-valid envelope and stays detached",()=>{
  const f=artDirectionFixture();f.doc.nodes[f.image].props.mask="ellipse";
  const published=createKcdPublishedSnapshot(f.doc);expect(published.snapshot.rendererRequirement.minVersion).toBe(8);
  f.doc.nodes[f.image].props.mask="diamond";expect(readKcdPublishedSnapshot(published.snapshot)?.nativeDocument.nodes[f.image].props.mask).toBe("ellipse");
  const {contentHash,...payload}=published.snapshot;expect(createHash("sha256").update(canonicalStringify(payload)).digest("hex")).toBe(contentHash);payload.rendererRequirement.minVersion=7;
  expect(readKcdPublishedSnapshot({...payload,contentHash:createHash("sha256").update(canonicalStringify(payload)).digest("hex")})).toBeNull();
 });
 it("renders device effects before hydration with unique identity and authored transforms",()=>{
  const f=artDirectionFixture();Object.assign(f.doc.nodes[f.image].props,{mask:"ellipse",blur:2,shadow:"soft",rotation:25});Object.assign(f.doc.nodes[f.image].overrides.mobile!,{mask:"diamond",blur:0});
  const html=renderToStaticMarkup(createElement(KcdPrimitiveSubtree,{document:f.doc,rootId:f.root,device:"desktop",responsive:true}));
  expect(html).toContain("clip-path:ellipse(50% 50% at 50% 50%)");expect(html).toContain("clip-path:polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)!important");expect(html).toContain("rotate(25deg) scale(1, 1)");expect(html.match(new RegExp(`<[a-z][^>]*data-kcd-node-id="${f.image}"`,"g"))).toHaveLength(1);
  expect(visualEffectStyle({})).toMatchObject({opacity:1,clipPath:"none"});
 });
});
