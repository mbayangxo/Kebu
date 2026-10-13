import { describe, expect, it } from "vitest";
import { applyTransaction, expectFor, OperationHistory, type KcdDocument, type Op, type PageId, type NodeId } from "@/lib/creative-core";
import { emptyDocument, PAGE_A, PAGE_B, node, registry, uuidFor, content, applyOptions } from "./helpers";
const id = uuidFor(1, 0xb1) as NodeId, fresh = uuidFor(3, 0xfa6e) as PageId;
function fixture() {
 const doc = emptyDocument([PAGE_A, PAGE_B]);
 doc.nodes[id] = node({ id, type: "legacy-section:hero", pageId: PAGE_B, orderKey: "V", props: { heading: "Keep my content" } });
 doc.pages[1].deviceLayout = { mobile: { hidden: [id] } }; return doc;
}
let counter=0;
function run(doc: KcdDocument, ops: Op[]) {
 const tx = { txId: uuidFor(++counter, 0xb2), origin: "user" as const, label: "Pages", ops, expect: expectFor(doc, ops) };
 return { tx, result: applyTransaction(doc, tx, registry, applyOptions) };
}
describe("atomic page lifecycle operations", () => {
 it("inserts a page and content atomically at version one and inverts the action", () => {
  const doc=fixture(), inserted=run(doc,[{ op:"insertPage", page:{id:fresh,slug:"new",title:"New",orderKey:"Z",deviceLayout:{}} },{op:"insertNode",node:{id:uuidFor(2,0xb1) as NodeId,type:"legacy-section:text",typeVersion:1,props:{heading:"Seed",body:"Story"},overrides:{}},pageId:fresh,parentId:null,orderKey:"V"}]).result;
  if (!inserted.ok) throw new Error(inserted.error.message);
  expect(inserted.versions[fresh]).toBe(1); expect(inserted.document.pages.at(-1)?.id).toBe(fresh);
  const undo=run(inserted.document,inserted.inverse).result; if(!undo.ok) throw new Error(undo.error.message);
  expect(content(undo.document)).toEqual(content(doc));
 });
 it("requires the page and every node version before deletion", () => {
  const doc=fixture(),ops:Op[]=[{op:"removePage",pageId:PAGE_B}];
  expect(expectFor(doc,ops)).toEqual({[PAGE_B]:1,[id]:1});
  const result=applyTransaction(doc,{txId:uuidFor(10,0xb2),origin:"user",label:"Delete",ops,expect:{[PAGE_B]:1,[id]:2}},registry);
  expect(result).toMatchObject({ok:false,error:{code:"KCD_CONFLICT"}}); expect(doc.nodes[id].props.heading).toBe("Keep my content");
 });
 it("restores the page and content with the same ids/layout and current versions across repeated history travel", () => {
  let doc=fixture(); const original=content(doc),history=new OperationHistory(); const deletion=run(doc,[{op:"removePage",pageId:PAGE_B}]);
  if(!deletion.result.ok) throw new Error(deletion.result.error.message);
  expect(deletion.result.removedPages).toEqual([PAGE_B]); history.record(doc,deletion.tx,deletion.result,0); doc=deletion.result.document;
  for(let cycle=0;cycle<4;cycle++) for(const direction of ["undo","redo"] as const) {
   const prepared=history.prepare(direction,doc,uuidFor(++counter,0xb2)); if(!prepared.ok) throw new Error(prepared.reason);
   const result=applyTransaction(doc,prepared.transaction,registry,applyOptions); if(!result.ok) throw new Error(result.error.message);
   history.confirm(direction,doc,result); doc=result.document;
   if(direction==="undo") {expect(content(doc)).toEqual(original); expect(doc.nodes[id].version).toBe(cycle+2); expect(doc.pages[1].layoutVersion).toBe(cycle+2);}
  }
 });
 it("bumps metadata/layout only once and preserves undo originals", () => {
  const doc=fixture(), result=run(doc,[{op:"updatePage",pageId:PAGE_B,title:"Renamed",slug:"renamed"},{op:"setDeviceComposition",pageId:PAGE_B,device:"mobile",composition:null}]).result;
  if(!result.ok) throw new Error(result.error.message); expect(result.versions[PAGE_B]).toBe(2);
  const inverse=run(result.document,result.inverse).result; if(!inverse.ok) throw new Error(inverse.error.message);
  expect(content(inverse.document)).toEqual(content(doc));
 });
 it("permits atomic order swaps while rejecting a final collision", () => {
  const doc=fixture(), a=doc.pages[0].orderKey,b=doc.pages[1].orderKey;
  const result=run(doc,[{op:"movePage",pageId:PAGE_A,orderKey:b},{op:"movePage",pageId:PAGE_B,orderKey:a}]).result;
  if(!result.ok) throw new Error(result.error.message); expect(result.document.pages.map(p=>p.id)).toEqual([PAGE_B,PAGE_A]);
  expect(run(doc,[{op:"movePage",pageId:PAGE_A,orderKey:b}]).result.ok).toBe(false);
 });
 it("rolls back a page insertion if its seed content is invalid", () => {
  const doc=fixture(),before=structuredClone(doc);
  expect(run(doc,[{op:"insertPage",page:{id:fresh,slug:"new",title:"New",orderKey:"Z",deviceLayout:{}}},{op:"insertNode",node:{id:uuidFor(2,0xb1) as NodeId,type:"missing",typeVersion:1,props:{},overrides:{}},pageId:fresh,parentId:null,orderKey:"V"}]).result.ok).toBe(false);
  expect(doc).toEqual(before);
 });
 it("refuses the last-page deletion, duplicate slug and node/page identity collision", () => {
  expect(run(emptyDocument(),[{op:"removePage",pageId:PAGE_A}]).result.ok).toBe(false);
  expect(run(fixture(),[{op:"updatePage",pageId:PAGE_B,slug:"home"}]).result.ok).toBe(false);
  expect(run(fixture(),[{op:"insertPage",page:{id:id as unknown as PageId,slug:"collision",title:"Collision",orderKey:"Z",deviceLayout:{}}}]).result.ok).toBe(false);
 });
 it("retains no-op metadata and enforces security/slug limits", () => {
  const doc=fixture(); expect(run(doc,[{op:"updatePage",pageId:PAGE_B,title:"Page 1"}]).result).toMatchObject({ok:true,inverse:[],versions:{}});
  expect(run(doc,[{op:"updatePage",pageId:PAGE_B,slug:"../../bad"}]).result.ok).toBe(false);
  expect(run(doc,[{op:"updatePage",pageId:PAGE_B,title:"<script>alert(1)</script>"}]).result.ok).toBe(false);
 });
});
