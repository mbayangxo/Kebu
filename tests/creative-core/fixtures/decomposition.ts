import {emptyDocument,node,PAGE_A,uuidFor} from "../helpers";
import type {NodeId} from "../../../lib/creative-core";
export function decompositionFixture(family="editorial-hero"){
 const doc=emptyDocument();doc.meta.documentSchemaVersion="kcd-1";const root=uuidFor(1,0x3f3) as NodeId;
 const shared={heading:"A new creative chapter",subheading:"Build a world around your story.",buttonLabel:"Contact us",buttonHref:"contact"};
 const props:Record<string,Record<string,unknown>>={hero:{...shared,image:"/brand/kebu-mark.png",minHeight:"70vh",overlayOpacity:0.5},"editorial-hero":{...shared,eyebrow:"Kebu editorial",imageUrl:"/brand/kebu-mark.png",imageAlt:"Campaign art",heightVh:70,overlayOpacity:0.5},split:{heading:shared.heading,body:shared.subheading,imageUrl:"/brand/kebu-mark.png",imageAlt:"Campaign art",imagePosition:"left",buttonLabel:"Contact us",buttonHref:"contact"},text:{heading:shared.heading,body:shared.subheading},image:{src:"/brand/kebu-mark.png",alt:"Campaign art",caption:"A creative story"},gallery:{heading:"Campaign collection",items:[{src:"/brand/kebu-mark.png",alt:"First frame",href:"contact"},{src:"/brand/favicon.png",alt:"Second frame"}],layout:"grid",columns:2},video:{heading:"Campaign film",src:"/qa-video.webm",title:"The film",caption:"Behind the scenes",thumbnail:"/brand/kebu-mark.png",layout:"single",columns:2}};
 doc.nodes[root]=node({id:root,type:`legacy-section:${family}`,pageId:PAGE_A,orderKey:"V",props:props[family],overrides:family.includes("hero")?{tablet:{heading:"Tablet creative chapter"},mobile:{heading:"Phone creative chapter"}}:{}});
 doc.pages[0].deviceLayout.mobile={order:[root]};return{doc,root};
}
