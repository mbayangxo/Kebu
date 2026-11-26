import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {describe,expect,it} from "vitest";
import {expectFor} from "@/lib/creative-core";
import {prepareBuilderTransaction} from "@/lib/create/kcd-write-boundary";
import {primitiveInsertOperation,primitivePropertyOperations} from "@/lib/create/kcd-primitive-operations";
import {createKcdPublishedSnapshot} from "@/lib/create/kcd-published-snapshot";
import {kcdNodeType} from "@/lib/create/kcd-adapter/sections";
import {KcdPrimitiveSubtree} from "@/app/components/create/kcd/primitive-subtree";
import {videoFixture} from "./fixtures/video";
describe("native video",()=>{
 it("distinguishes root compatibility videos and bounded nested native media",()=>{const f=videoFixture();expect(kcdNodeType("video",null)).toBe("legacy-section:video");expect(kcdNodeType("video",f.root)).toBe("video");expect(()=>primitiveInsertOperation(f.doc,f.doc.pages[0].id,null,"video")).toThrow();for(const src of ["javascript:alert(1)","//foreign/video.mp4","data:video/webm;base64,xyz"])expect(()=>primitivePropertyOperations(f.doc.nodes[f.video],"desktop","src",src)).toThrow();});
 it("saves independent settings with history, copy and renderer 10",()=>{const f=videoFixture(),ops=primitivePropertyOperations(f.doc.nodes[f.video],"mobile","poster","/brand/favicon.png"),tx={txId:crypto.randomUUID(),origin:"user" as const,label:"Poster",ops,expect:expectFor(f.doc,ops)};const saved=prepareBuilderTransaction(f.doc,tx);expect(saved.ok).toBe(true);if(!saved.ok)return;expect(saved.prediction.document.nodes[f.video].overrides.mobile?.poster).toBe("/brand/favicon.png");expect(saved.prediction.document.nodes[f.video].props.poster).toBe("/brand/kebu-mark.png");expect(createKcdPublishedSnapshot(saved.prediction.document).snapshot.rendererRequirement.minVersion).toBe(10);});
 it("renders native controls, captions and zero video preload with unique canonical identity",()=>{const f=videoFixture(),html=renderToStaticMarkup(createElement(KcdPrimitiveSubtree,{document:f.doc,rootId:f.root,device:"desktop",responsive:true}));expect(html).toContain('preload="none"');expect(html).toContain('kind="captions"');expect(html).toContain('srcLang="en"');expect(html).toContain('aria-label="Campaign video"');expect(html).not.toContain("autoPlay");expect(html.match(new RegExp(`<[a-z][^>]*data-kcd-node-id="${f.video}"`,"g"))).toHaveLength(1);});
});
