import { buildIndex,preflight,parseDocument,documentToJson,isSpatialLocked,newNodeId,keyBetween,resolveNode, type KcdDocument,type KcdNode,type NodeId,type Op } from "@/lib/creative-core";
import {builderRegistry} from "./kcd-adapter";
import {primitiveDefinition} from "./kcd-primitive-operations";
import {PILOT_WEB_DOM_MANIFEST} from "./kcd-adapter/render-view";
import {containsUnsafeSiteContent} from "./site-seo";
import {kcdLegacyRenderDefinition} from "./kcd-adapter/render-view";

export const DECOMPOSABLE_SECTIONS=new Set(["hero","editorial-hero","split","text","image","gallery","video"]);
type Part={key:string;parent:string|null;type:string;props:Record<string,unknown>;a11y?:KcdNode["a11y"];hidden?:boolean};
const known:Record<string,string[]>={
 hero:["heading","subheading","buttonLabel","buttonHref","secondaryButtonLabel","secondaryButtonHref","align","background","minHeight","image","overlayOpacity"],
 "editorial-hero":["eyebrow","heading","subheading","buttonLabel","buttonHref","secondaryButtonLabel","secondaryButtonHref","imageUrl","imageAlt","overlayOpacity","align","heightVh","background"],
 split:["heading","body","imageUrl","imageAlt","imagePosition","buttonLabel","buttonHref","background"],
 text:["heading","body"],image:["src","alt","caption"],gallery:["heading","items","layout","columns","instagramHandle","followLabel"],video:["heading","src","title","caption","thumbnail","items","layout","columns"],
};
/** Explicit conversion; refuse foreign capabilities rather than silently discarding them. Root identity remains stable. */
export function decomposeLegacySection(document:KcdDocument,id:NodeId,createId=newNodeId):{ops:Op[];nodes:KcdNode[];family:string} {
 const original=document.nodes[id],family=original?.type.replace(/^legacy-section:/,"");
 if(!original||!original.type.startsWith("legacy-section:")||!DECOMPOSABLE_SECTIONS.has(family))throw new Error("This section cannot be converted to editable elements yet.");
 if(isSpatialLocked(document,id))throw new Error("Unlock this section before converting it.");
 if(original.parentId!==null||buildIndex(document).children(original.pageId,id).length)throw new Error("Only an intact legacy section can be converted.");
 if(original.motion!==undefined||original.interaction!==undefined||original.dataBinding!==undefined)throw new Error("This section has legacy effects or connected data. Remove or migrate those settings before converting.");
 if(original.unknown && Object.keys(original.unknown).some(key=>key!=="legacy"))throw new Error("Unrecognized section data must be resolved before conversion.");
 const allowed=new Set([...known[family],"hidden"]);
 for(const values of [original.props,...Object.values(original.overrides)])for(const key of Object.keys(values??{}))if(!allowed.has(key))throw new Error(`Conversion cannot preserve “${key}”. The original section is unchanged.`);
 const theme=kcdLegacyRenderDefinition(document).theme,primary=theme?.primary??"#111111";
 const devices=["desktop","tablet","mobile"] as const;
 const plans=devices.map(device=>{
  const p=resolveNode(original,device,builderRegistry.get(original.type)),parts:Part[]=[{key:"root",parent:null,type:"section",props:{background:p.background??"#ffffff",paddingY:"lg",width:"default",gap:"md",hidden:p.hidden===true}}];
  const add=(key:string,parent:string,type:string,props:Record<string,unknown>,a11y?:KcdNode["a11y"],hidden=false)=>{parts.push({key,parent,type,props,a11y,hidden});};
  const text=(key:string,parent:string,value:unknown,variant="body",href?:unknown,color?:string)=>add(key,parent,"text",{text:String(value??""),variant,...(href?{href}:{}),...(color?{color}:{})},variant==="heading"?{headingLevel:family==="hero"||family==="editorial-hero"?1:2}:undefined,!value);
  if(family==="hero"||family==="editorial-hero"){
   const media=family==="hero"?p.image:p.imageUrl,height=family==="hero"?p.minHeight??"80vh":`${p.heightVh??80}vh`,vh=height==="auto"?0:Number(String(height).replace("vh",""));if(!Number.isFinite(vh)||vh<0||vh>100)throw new Error("This hero height cannot be preserved.");
   parts[0].props={...parts[0].props,paddingY:"none",width:"full",minHeightVh:vh,contentPlacement:vh?"end":"center",background:p.background??(media?"#111111":primary)};
   add("backdrop","root","image",{src:String(media??""),fillContainer:true,fit:"cover",layer:0},family==="editorial-hero"?{alt:String(p.imageAlt??"")}:{decorative:true},!media);
   const overlay=Number(p.overlayOpacity??(family==="hero"?0.42:0.5));if(!Number.isFinite(overlay)||overlay<0||overlay>1)throw new Error("This overlay cannot be preserved.");
   add("overlay","root","group",{fillContainer:true,layer:1,background:`#000000${Math.round(overlay*255).toString(16).padStart(2,"0")}`},undefined,!media);
   add("copy","root","group",{layer:2,padding:"xl",gap:"md",align:p.align==="center"?"center":"start"});
   const color=media?"#ffffff":"#111111";text("eyebrow","copy",p.eyebrow,"eyebrow",undefined,color);text("heading","copy",p.heading,"heading",undefined,color);text("body","copy",p.subheading,"body",undefined,color);
   add("actions","copy","group",{direction:"row",wrap:true,gap:"md"});text("cta","actions",p.buttonLabel,"body",p.buttonHref,color);text("secondary","actions",p.secondaryButtonLabel,"body",p.secondaryButtonHref,color);
  }else if(family==="split"){
   add("split","root","group",{direction:device==="desktop"?"row":"column",gap:"lg",align:"center"});
   add("copy","split","group",{gap:"md"});text("heading","copy",p.heading,"heading");text("body","copy",p.body);text("cta","copy",p.buttonLabel,"body",p.buttonHref);
   add("picture","split","image",{src:String(p.imageUrl??""),aspectRatio:"4:3"},{alt:String(p.imageAlt??"")},!p.imageUrl);
  }else if(family==="text"){text("heading","root",p.heading,"heading");text("body","root",p.body);}
  else if(family==="image"){add("picture","root","image",{src:String(p.src??"")},{alt:String(p.alt??"")},!p.src);text("caption","root",p.caption,"caption");}
  else {
   text("heading","root",p.heading,"heading");const gallery=family==="gallery",layout=String(p.layout??"grid"),columns=Number(p.columns??(gallery?3:2));
   if(!["grid","single","featured",...(gallery?["carousel","masonry"]:[])].includes(layout))throw new Error("This media layout cannot be preserved.");
   add("collection","root","group",{layout:layout==="carousel"||layout==="masonry"?layout:"grid",columns:layout==="single"?1:device==="mobile"?1:columns,gap:"md"});
   const items=Array.isArray(p.items)?p.items as Record<string,unknown>[]:[];
   const entries=gallery?items:items.length?items:[{src:p.src,title:p.title,caption:p.caption,thumbnail:p.thumbnail}];
   if(!gallery && items.length && p.src && !items.some(item=>item.src===p.src))throw new Error("Both single-video and video-list content are stored. Resolve that ambiguity before conversion.");
   for(const [i,item] of entries.entries()){
    const itemAllowed=new Set(gallery?["src","alt","href"]:["src","title","caption","thumbnail"]);for(const key of Object.keys(item))if(!itemAllowed.has(key))throw new Error(`Conversion cannot preserve item field “${key}”.`);
    add(`card-${i}`,"collection","group",{gap:"sm",...(layout==="featured"&&i===0?{gridSpan:device==="mobile"?1:columns}: {})});
    add(`media-${i}`,`card-${i}`,gallery?"image":"video",{src:String(item.src??""),...(gallery?{aspectRatio:layout==="masonry"?"auto":"4:3",...(item.href?{href:item.href}:{})}:{poster:String(item.thumbnail??"")})},gallery?{alt:String(item.alt??"")}:{label:String(item.title??"Video")},!item.src);
    if(!gallery){text(`title-${i}`,`card-${i}`,item.title,"subheading");text(`caption-${i}`,`card-${i}`,item.caption,"caption");}
   }
   if(gallery && p.instagramHandle){const handle=String(p.instagramHandle).replace(/^@/,"");if(!/^[A-Za-z0-9._]+$/.test(handle))throw new Error("Check the Instagram handle before converting.");text("follow","root",p.followLabel??"Follow us","body",`https://www.instagram.com/${handle}/`);}
  }
  return parts;
 });
 const keys=[...new Set(plans.flatMap(parts=>parts.map(part=>part.key)))].filter(key=>plans.some(parts=>parts.some(part=>part.key===key&&!part.hidden))),ids=new Map(keys.map(key=>[key,key==="root"?id:createId()]));
 const orders=new Map<string|null,string>(),nodes:KcdNode[]=[];
 for(const key of keys){const base=plans[0].find(part=>part.key===key)??plans.find(parts=>parts.some(part=>part.key===key))!.find(part=>part.key===key)!,definition=primitiveDefinition({type:base.type,typeVersion:1})!;
  const values=plans.map(parts=>parts.find(part=>part.key===key)),overrides:KcdNode["overrides"]={};
  for(const [i,device] of (["tablet","mobile"] as const).entries()){
   const next=values[i+1];if(!next)continue;const bucket:Record<string,unknown>={};for(const prop of new Set([...Object.keys(base.props),...Object.keys(next.props)]))if(JSON.stringify(base.props[prop])!==JSON.stringify(next.props[prop])){if(!definition.properties.some(descriptor=>descriptor.key===prop&&descriptor.overridable))throw new Error(`The per-device ${prop} setting cannot be preserved.`);if(next.props[prop]===undefined)throw new Error(`The per-device ${prop} default cannot be preserved.`);bucket[prop]=next.props[prop];}if(Object.keys(bucket).length)overrides[device]=bucket;
   if(JSON.stringify(base.a11y)!==JSON.stringify(next.a11y))throw new Error("Per-device accessibility settings cannot be preserved.");
  }
  let orderKey=original.orderKey;if(key!=="root"){orderKey=keyBetween(orders.get(base.parent)??null,null);orders.set(base.parent,orderKey);}
  const hideOn=devices.filter((_,i)=>!values[i]||values[i]!.hidden);
  nodes.push({id:ids.get(key)!,type:base.type,typeVersion:1,pageId:original.pageId,parentId:base.parent?ids.get(base.parent)!:null,orderKey,props:base.props,overrides,version:key==="root"?original.version:1,...(key==="root"?{...(original.a11y?{a11y:original.a11y}:{}),...(original.visibility?{visibility:original.visibility}:{}),...(original.responsiveState?{responsiveState:original.responsiveState}:{})}:{...(base.a11y?{a11y:base.a11y}:{}),...(hideOn.length?{visibility:{hideOn}}:{})})});
 }
 // Preserve left/right split ordering on every device with ordinary container order data.
 if(family==="split")for(const device of devices){const source=resolveNode(original,device,builderRegistry.get(original.type));if(source.imagePosition==="left"){const container=nodes.find(node=>node.id===ids.get("split"))!,order=[ids.get("picture")!,ids.get("copy")!];if(device==="desktop")container.props.childOrder=order;else container.overrides[device]={...container.overrides[device],childOrder:order};}else if(device!=="desktop" && nodes.find(node=>node.id===ids.get("split"))!.props.childOrder){const container=nodes.find(node=>node.id===ids.get("split"))!;container.overrides[device]={...container.overrides[device],childOrder:[ids.get("copy")!,ids.get("picture")!]};}}
 const next={...document,nodes:{...document.nodes}};delete next.nodes[id];for(const node of nodes)next.nodes[node.id]=node;const parsed=parseDocument(documentToJson(next));if(!parsed.ok)throw new Error(parsed.issues[0].message);const issue=preflight(next,builderRegistry,PILOT_WEB_DOM_MANIFEST)[0];if(issue)throw new Error(issue.message);for(const node of nodes){const definition=primitiveDefinition(node)!;for(const device of devices){if(!definition.propsSchema.safeParse(resolveNode(node,device,definition)).success)throw new Error(`The ${definition.displayName.toLowerCase()} settings cannot be preserved safely.`);}}if(containsUnsafeSiteContent(JSON.stringify(nodes)))throw new Error("Unsafe content cannot be converted.");
 return {family,nodes,ops:[{op:"removeNode",id},{op:"restoreSubtree",nodes:[nodes[0]]},...(nodes.length>1?[{op:"insertSubtree" as const,nodes:nodes.slice(1).map(node=>{const placed={...node} as Partial<KcdNode>;delete placed.version;return placed as Omit<KcdNode,"version">;})}]:[])]};
}
