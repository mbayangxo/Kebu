import { describe, expect, it } from "vitest";
import { buildIndex, expectFor, orderChildrenForDevice, type NodeId, type Op } from "@/lib/creative-core";
import { builderNodeMoveOperations, primitiveDefinition, primitiveDuplicateOperation, primitiveInsertOperation, primitivePropertyOperations, primitiveReparentOperation, primitiveResetOverrideOperations } from "@/lib/create/kcd-primitive-operations";
import { prepareBuilderTransaction } from "@/lib/create/kcd-write-boundary";
import { documentToRows, rowsToDocument } from "@/lib/create/kcd-adapter";
import { createKcdPublishedSnapshot } from "@/lib/create/kcd-published-snapshot";
import { emptyDocument, node, PAGE_A, uuidFor, idSource } from "./helpers";
const root=uuidFor(1,0xd05) as NodeId,group=uuidFor(2,0xd05) as NodeId,a=uuidFor(3,0xd05) as NodeId,b=uuidFor(4,0xd05) as NodeId,c=uuidFor(5,0xd05) as NodeId;
function fixture(){const doc=emptyDocument();doc.meta.documentSchemaVersion="kcd-1";doc.nodes[root]=node({id:root,type:"section",pageId:PAGE_A,orderKey:"V"});doc.nodes[group]=node({id:group,type:"group",pageId:PAGE_A,parentId:root,orderKey:"V"});for(const [id,orderKey] of [[a,"V"],[b,"W"],[c,"X"]] as const)doc.nodes[id]=node({id,type:"text",pageId:PAGE_A,parentId:group,orderKey,props:{text:id,position:"absolute",x:10,y:20,elementWidth:100}});return doc;}
function apply(doc:ReturnType<typeof fixture>,ops:Op[]){const result=prepareBuilderTransaction(doc,{txId:crypto.randomUUID(),origin:"user",label:"Order",ops,expect:expectFor(doc,ops)});if(!result.ok)throw new Error(result.error.message);return result.prediction;}
function order(doc:ReturnType<typeof fixture>,device:"desktop"|"tablet"|"mobile",parent=group){return orderChildrenForDevice(buildIndex(doc).children(PAGE_A,parent),doc.nodes[parent],device,primitiveDefinition(doc.nodes[parent])).map(n=>n.id);}
describe("nested device order",()=>{
 it("moves one device atomically without changing geometry or desktop order keys",()=>{
  const doc=fixture(),changed=apply(doc,builderNodeMoveOperations(doc,a,1,"mobile"));
  expect(order(changed.document,"mobile")).toEqual([b,a,c]);expect(order(changed.document,"tablet")).toEqual([a,b,c]);expect(order(changed.document,"desktop")).toEqual([a,b,c]);expect(changed.document.nodes[a]).toEqual(doc.nodes[a]);
  expect(order(apply(changed.document,changed.inverse).document,"mobile")).toEqual([a,b,c]);
  expect(rowsToDocument(documentToRows(changed.document)).document.nodes[group].overrides.mobile?.childOrder).toEqual([b,a,c]);
  expect(createKcdPublishedSnapshot(changed.document).snapshot.rendererRequirement.minVersion).toBe(5);
 });
 it("keeps device resets independent and desktop canonical moves inherited",()=>{
  let doc=fixture();doc=apply(doc,builderNodeMoveOperations(doc,a,1,"mobile")).document;doc=apply(doc,builderNodeMoveOperations(doc,c,-1,"tablet")).document;
  doc=apply(doc,primitiveResetOverrideOperations(doc.nodes[group],"mobile","childOrder")).document;
  expect(order(doc,"mobile")).toEqual([a,b,c]);expect(order(doc,"tablet")).toEqual([a,c,b]);
  doc=apply(doc,builderNodeMoveOperations(doc,a,1)).document;expect(order(doc,"desktop")).toEqual([b,a,c]);expect(order(doc,"mobile")).toEqual([b,a,c]);expect(order(doc,"tablet")).toEqual([a,c,b]);
 });
 it("retains hidden slots and ignores removed/reparented ids while appending new children",()=>{
  let doc=fixture();doc.nodes[b].visibility={hideOn:["mobile"]};doc=apply(doc,builderNodeMoveOperations(doc,a,1,"mobile")).document;
  doc=apply(doc,[{op:"removeNode",id:b}]).document;const d=uuidFor(6,0xd05) as NodeId;doc=apply(doc,[primitiveInsertOperation(doc,PAGE_A,group,"text",d)]).document;
  expect(order(doc,"mobile")).toEqual([a,c,d]);doc=apply(doc,[primitiveReparentOperation(doc,a,root)]).document;expect(order(doc,"mobile")).toEqual([c,d]);
 });
 it("remaps copied internal order references to copied children",()=>{
  const doc=fixture();doc.nodes[group].overrides.mobile={childOrder:[c,a,b]};const changed=apply(doc,[primitiveDuplicateOperation(doc,group,idSource(0xd06))]).document;
  const copy=buildIndex(changed).children(PAGE_A,root).find(n=>n.id!==group)!;const children=buildIndex(changed).children(PAGE_A,copy.id);
  expect(order(changed,"mobile",copy.id)).toEqual([children[2].id,children[0].id,children[1].id]);expect(copy.overrides.mobile?.childOrder).not.toContain(a);
 });
 it("validates bounded, unique UUID lists and honors locks",()=>{
  const doc=fixture();for(const value of [[a,a],["bad"],Array(51).fill(a)])expect(()=>primitivePropertyOperations(doc.nodes[group],"mobile","childOrder",value)).toThrow();
  doc.nodes[group].locked=true;expect(()=>builderNodeMoveOperations(doc,a,1,"mobile")).toThrow(/Unlock/);
 });
 it("realizes explicit base order and leaves boundary moves empty",()=>{
  let doc=fixture();doc=apply(doc,primitivePropertyOperations(doc.nodes[group],"desktop","childOrder",[c,b,a])).document;
  expect(order(doc,"desktop")).toEqual([c,b,a]);expect(builderNodeMoveOperations(doc,c,-1,"desktop")).toEqual([]);
  expect(order(apply(doc,builderNodeMoveOperations(doc,c,1,"desktop")).document,"desktop")).toEqual([b,c,a]);
 });
});
