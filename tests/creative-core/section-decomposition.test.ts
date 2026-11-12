import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {describe,expect,it} from "vitest";
import {expectFor,resolveNode,applyTransaction} from "@/lib/creative-core";
import {builderTransactionSchema} from "@/lib/create/kcd-transaction-schema";
import {decomposeLegacySection} from "@/lib/create/kcd-section-decomposition";
import {prepareBuilderTransaction} from "@/lib/create/kcd-write-boundary";
import {createKcdPublishedSnapshot} from "@/lib/create/kcd-published-snapshot";
import {builderRegistry} from "@/lib/create/kcd-adapter";
import {KcdPrimitiveSubtree} from "@/app/components/create/kcd/primitive-subtree";
import {decompositionFixture} from "./fixtures/decomposition";
describe("explicit legacy decomposition",()=>{
 for(const family of ["hero","editorial-hero","split","text","image","gallery","video"])it(`${family} becomes ordinary editable nodes, preserving root identity and inverse history`,()=>{
  const f=decompositionFixture(family),before=JSON.stringify(f.doc),plan=decomposeLegacySection(f.doc,f.root);expect(JSON.stringify(f.doc)).toBe(before);expect(plan.nodes.every(n=>!n.type.startsWith("legacy-section:"))).toBe(true);
  const tx={txId:crypto.randomUUID(),origin:"user" as const,label:"Convert",ops:plan.ops,expect:expectFor(f.doc,plan.ops)},saved=prepareBuilderTransaction(f.doc,builderTransactionSchema.parse(tx));expect(saved.ok).toBe(true);if(!saved.ok)return;
  const doc=saved.prediction.document;expect(doc.nodes[f.root].type).toBe("section");expect(doc.pages[0].deviceLayout.mobile?.order).toEqual([f.root]);expect(doc.nodes[f.root].version).toBe(2);expect(createKcdPublishedSnapshot(doc).snapshot.rendererRequirement.minVersion).toBe(11);
  const html=renderToStaticMarkup(createElement(KcdPrimitiveSubtree,{document:doc,rootId:f.root,device:"desktop",responsive:true}));expect(html).toContain(`data-kcd-node-id="${f.root}"`);
  const inverse=saved.prediction.inverse,undo=applyTransaction(doc,{...tx,txId:crypto.randomUUID(),ops:inverse,expect:expectFor(doc,inverse)},builderRegistry);expect(undo.ok).toBe(true);if(undo.ok){expect(undo.document.nodes[f.root].type).toBe(`legacy-section:${family}`);expect(undo.document.nodes[f.root].props).toEqual(f.doc.nodes[f.root].props);}
 });
 it("preserves device hero copy and backdrop/overlay/copy layering",()=>{
  const f=decompositionFixture(),plan=decomposeLegacySection(f.doc,f.root),heading=plan.nodes.find(n=>n.props.text==="A new creative chapter")!;
  expect(resolveNode(heading,"mobile",builderRegistry.get("text")).text).toBe("Phone creative chapter");expect(plan.nodes.filter(n=>n.props.fillContainer).map(n=>n.props.layer)).toEqual([0,1]);
 });
 for(const layout of ["grid","single","featured","carousel","masonry"])it(`gallery ${layout} preserves all images and links`,()=>{
  const f=decompositionFixture("gallery");f.doc.nodes[f.root].props.layout=layout;const plan=decomposeLegacySection(f.doc,f.root);expect(plan.nodes.filter(n=>n.type==="image")).toHaveLength(2);expect(plan.nodes.find(n=>n.type==="image")?.props.href).toBe("contact");expect(plan.nodes.some(n=>n.props.layout===(layout==="carousel"||layout==="masonry"?layout:"grid"))).toBe(true);
 });
 it("refuses locks, connected data, foreign fields and unsafe media without mutation",()=>{
  for(const patch of [{locked:true},{motion:{preset:"legacy"}},{dataBinding:{}},{props:{heading:"Story",arbitraryCss:"bad"}},{props:{heading:"Story",imageUrl:"javascript:alert(1)"}}]){const f=decompositionFixture();Object.assign(f.doc.nodes[f.root],patch);const before=JSON.stringify(f.doc);expect(()=>decomposeLegacySection(f.doc,f.root)).toThrow();expect(JSON.stringify(f.doc)).toBe(before);}
 });
});
