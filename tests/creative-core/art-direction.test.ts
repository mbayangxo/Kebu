import { createHash } from "node:crypto";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe,expect,it } from "vitest";
import { KcdPrimitiveSubtree } from "@/app/components/create/kcd/primitive-subtree";
import { canonicalStringify, expectFor } from "@/lib/creative-core";
import { primitivePropertyOperations,primitiveResetOverrideOperations } from "@/lib/create/kcd-primitive-operations";
import { prepareBuilderTransaction } from "@/lib/create/kcd-write-boundary";
import { createKcdPublishedSnapshot,readKcdPublishedSnapshot } from "@/lib/create/kcd-published-snapshot";
import { artDirectionFixture } from "./fixtures/art-direction";
describe("responsive art direction",()=>{
 for(const [key,min,max,id] of [["fontSize",8,256,"text"],["lineHeight",.8,3,"text"],["letterSpacing",-10,30,"text"],["focalX",0,100,"image"],["focalY",0,100,"image"]] as const)it(`validates ${key} bounds through the canonical write path`,()=>{
  const f=artDirectionFixture();for(const value of [min,max,min-.1,max+.1,NaN]){
   if(value!==min&&value!==max){expect(()=>primitivePropertyOperations(f.doc.nodes[f[id]],"mobile",key,value)).toThrow();continue;}
   const ops=primitivePropertyOperations(f.doc.nodes[f[id]],"mobile",key,value),result=prepareBuilderTransaction(f.doc,{txId:crypto.randomUUID(),origin:"user",label:"Art direction",ops,expect:expectFor(f.doc,ops)});
   expect(result.ok,JSON.stringify(result)).toBe(value===min||value===max);
  }
 });
 it("keeps reset, inverse history and publishing detached and independent",()=>{
  const f=artDirectionFixture(),ops=primitiveResetOverrideOperations(f.doc.nodes[f.text],"mobile","fontSize"),tx={txId:crypto.randomUUID(),origin:"user" as const,label:"Art direction",ops,expect:expectFor(f.doc,ops)};
  const result=prepareBuilderTransaction(f.doc,tx);expect(result.ok,JSON.stringify(result)).toBe(true);if(!result.ok)return;
  expect(result.prediction.document.nodes[f.text].overrides.mobile?.fontSize).toBeUndefined();expect(result.prediction.document.nodes[f.text].overrides.tablet?.fontSize).toBe(22);
  const undo=result.prediction.inverse,restored=prepareBuilderTransaction(result.prediction.document,{...tx,txId:crypto.randomUUID(),ops:undo,expect:expectFor(result.prediction.document,undo)});expect(restored.ok).toBe(true);
  if(restored.ok)expect(restored.prediction.document.nodes[f.text].overrides.mobile?.fontSize).toBe(18);
  const saved=createKcdPublishedSnapshot(f.doc);expect(saved.snapshot.rendererRequirement.minVersion).toBe(6);expect(readKcdPublishedSnapshot(saved.snapshot)).not.toBeNull();f.doc.nodes[f.text].props.text="Later draft";expect(saved.snapshot.document.nodes[f.text].props.text).toBe("Desktop story");
 });
 it("emits every visual breakpoint, one canonical identity and bounded content variants",()=>{
  const f=artDirectionFixture(),html=renderToStaticMarkup(createElement(KcdPrimitiveSubtree,{document:f.doc,rootId:f.root,device:"desktop",responsive:true}));
  for(const id of [f.root,f.group,f.text,f.image])expect(html.replace(/<style>[\s\S]*?<\/style>/g, "").split(`data-kcd-node-id="${id}"`).length-1).toBe(1);
  for(const text of ["Desktop story","Tablet story","Phone story","font-size:18px!important","flex-direction:column!important","object-position:90% 10%!important","display:none!important","display:contents!important"])expect(html).toContain(text);
  f.doc.nodes[f.text].overrides={};const plain=renderToStaticMarkup(createElement(KcdPrimitiveSubtree,{document:f.doc,rootId:f.root,device:"desktop",responsive:true}));expect(plain.replace(/<style>[\s\S]*?<\/style>/g, "")).not.toContain(`data-kcd-device-body-for="${f.text}"`);expect(plain).not.toContain(`[data-kcd-appearance-for="${f.text}"]{`);
 });
 it("keeps old responsive renderer-2 snapshots readable while rejecting understated new capabilities",()=>{
  const f=artDirectionFixture();
  const downgrade=(snapshot:ReturnType<typeof createKcdPublishedSnapshot>["snapshot"])=>{
   const payload=JSON.parse(JSON.stringify(snapshot));delete payload.contentHash;payload.rendererRequirement.minVersion=2;
   return {...payload,contentHash:createHash("sha256").update(canonicalStringify(payload)).digest("hex")};
  };
  expect(readKcdPublishedSnapshot(downgrade(createKcdPublishedSnapshot(f.doc).snapshot))).toBeNull();
  for(const n of Object.values(f.doc.nodes))for(const props of [n.props,...Object.values(n.overrides)])for(const key of ["fontSize","lineHeight","letterSpacing","focalX","focalY","elementWidth","elementHeight"])if(props)delete props[key];
  expect(createKcdPublishedSnapshot(f.doc).snapshot.rendererRequirement.minVersion).toBe(6);
  expect(readKcdPublishedSnapshot(downgrade(createKcdPublishedSnapshot(f.doc).snapshot))).not.toBeNull();
 });

});
