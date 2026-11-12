import { emptyDocument,node,PAGE_A,uuidFor } from "../helpers";
import type {NodeId} from "../../../lib/creative-core";
export function videoFixture(){const doc=emptyDocument();doc.meta.documentSchemaVersion="kcd-1";const root=uuidFor(1,0xf03) as NodeId,video=uuidFor(2,0xf03) as NodeId;
 doc.nodes[root]=node({id:root,type:"section",pageId:PAGE_A,orderKey:"V",props:{width:"full",paddingY:"sm"}});
 doc.nodes[video]=node({id:video,type:"video",pageId:PAGE_A,parentId:root,orderKey:"V",props:{src:"/qa-video.webm",poster:"/brand/kebu-mark.png",captionsSrc:"/qa-captions.vtt",captionsLanguage:"en"},overrides:{tablet:{poster:"/brand/favicon.png"},mobile:{fit:"cover",aspectRatio:"3:4"}},a11y:{label:"Campaign video"}});return{doc,root,video};}
