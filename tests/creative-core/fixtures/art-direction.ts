import { emptyDocument, node, PAGE_A, uuidFor } from "../helpers";
import type { NodeId } from "../../../lib/creative-core";
export function artDirectionFixture() {
 const doc=emptyDocument();doc.meta.documentSchemaVersion="kcd-1";
 const [root,group,text,image]=[1,2,3,4].map(id=>uuidFor(id,0xd08) as NodeId);
 doc.nodes[root]=node({id:root,type:"section",pageId:PAGE_A,orderKey:"V",props:{paddingY:"none",width:"full"},overrides:{tablet:{paddingY:"sm",width:"narrow"},mobile:{paddingY:"md",width:"full"}}});
 doc.nodes[group]=node({id:group,type:"group",pageId:PAGE_A,parentId:root,orderKey:"V",props:{direction:"row",gap:"lg"},overrides:{tablet:{direction:"column",gap:"md"},mobile:{direction:"column",gap:"sm"}}});
 doc.nodes[text]=node({id:text,type:"text",pageId:PAGE_A,parentId:group,orderKey:"V",props:{text:"Desktop story",variant:"heading",fontSize:30,lineHeight:1.2,letterSpacing:2,href:"contact"},overrides:{tablet:{text:"Tablet story",fontSize:22,align:"center"},mobile:{text:"Phone story",fontSize:18,lineHeight:1.5,letterSpacing:0,align:"end"}},a11y:{headingLevel:2}});
 doc.nodes[image]=node({id:image,type:"image",pageId:PAGE_A,parentId:group,orderKey:"W",props:{src:"/brand/kebu-mark.png",elementWidth:80,elementHeight:80,fit:"cover",aspectRatio:"1:1",focalX:50,focalY:50},overrides:{tablet:{src:"/brand/favicon.png",focalX:20,focalY:80,fit:"contain",aspectRatio:"3:4"},mobile:{src:"/brand/kebu-mark.png?device=mobile",focalX:90,focalY:10,aspectRatio:"4:3"}},a11y:{alt:"Kebu test image"}});
 return {doc,root,group,text,image};
}
