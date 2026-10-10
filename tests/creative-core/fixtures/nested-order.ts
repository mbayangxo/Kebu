import { emptyDocument, node, PAGE_A, uuidFor } from "../helpers";
import type { NodeId } from "../../../lib/creative-core";

export function nestedOrderFixture(responsive = true) {
 const doc=emptyDocument();doc.meta.documentSchemaVersion="kcd-1";
 const section=uuidFor(1,0xd07) as NodeId,group=uuidFor(2,0xd07) as NodeId;
 const children=[3,4,5].map(id=>uuidFor(id,0xd07) as NodeId),sectionChildren=[6,7,8].map(id=>uuidFor(id,0xd07) as NodeId);
 const deviceOrders=(ids:NodeId[])=>responsive?{tablet:{childOrder:[ids[1],ids[0],ids[2]]},mobile:{childOrder:[ids[2],ids[0],ids[1]]}}:{};
 doc.nodes[section]=node({id:section,type:"section",pageId:PAGE_A,orderKey:"V",props:{paddingY:"sm",width:"full"},overrides:responsive?{tablet:{childOrder:[sectionChildren[1],sectionChildren[0],sectionChildren[2],group]},mobile:{childOrder:[sectionChildren[2],sectionChildren[0],sectionChildren[1],group]}}:{}});
 doc.nodes[group]=node({id:group,type:"group",pageId:PAGE_A,parentId:section,orderKey:"V",props:{direction:"column",gap:"md"},overrides:deviceOrders(children)});
 for(const [ids,parentId,prefix] of [[children,group,"Group"],[sectionChildren,section,"Section"]] as const)ids.forEach((id,i)=>{
  doc.nodes[id]=node({id,type:"text",pageId:PAGE_A,parentId,orderKey:String.fromCharCode(87+i),props:{text:`${prefix} story ${i+1}`,...(i===0?{href:"contact"}:{})}});
 });
 return {doc,section,group,children,sectionChildren};
}
