import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { createKcdPublishedSnapshot } from "@/lib/create/kcd-published-snapshot";
import { kcdPublishDocument } from "@/lib/create/kcd-publish";
import { expectFor, type NodeId } from "@/lib/creative-core";
import { primitiveGeometryOperations, primitivePropertyOperations, builderNodeMoveOperations } from "@/lib/create/kcd-primitive-operations";
import { setupPublishDatabase } from "./publish-db-setup";

const root=process.env.KEBU_LOCAL_PGLITE_ROOT;
type LocalDb={exec:(sql:string)=>Promise<unknown>;query:<T=Record<string,unknown>>(sql:string,args?:unknown[])=>Promise<{rows:T[]}>;close:()=>Promise<void>};
const owner="11111111-1111-4111-8111-111111111111",project="22222222-2222-4222-8222-222222222222",page="33333333-3333-4333-8333-333333333333";
let db:LocalDb;
async function source(){return (await db.query<{source:Parameters<typeof kcdPublishDocument>[0]}>("select public.kcd_publish_source($1,$2) as source",[project,owner])).rows[0].source;}
async function publish(slug="local-publish", staged?:Awaited<ReturnType<typeof source>>){
 const data=staged??await source();const prepared=createKcdPublishedSnapshot(kcdPublishDocument(data));
 return db.query("select public.publish_kcd_document($1,$2,$3,$4,$5,$6) as result",[project,owner,slug,data,prepared.snapshot,prepared.canonicalPayload]);
}
describe.skipIf(!root)("S7 supplemental local PostgreSQL transaction checks",()=>{
 beforeAll(async()=>{
  const {PGlite}=await import(pathToFileURL(resolve(root!,"dist/index.js")).href);
  const {pgcrypto}=await import(pathToFileURL(resolve(root!,"dist/contrib/pgcrypto.js")).href);
  db=new PGlite({extensions:{pgcrypto}});
  await setupPublishDatabase(db);
  await db.query("insert into auth.users(id) values($1)",[owner]);
  await db.query("insert into projects(id,owner_id,title,document_schema_version) values($1,$2,'Local native','kcd-1')",[project,owner]);
  await db.query("insert into project_pages(id,project_id,slug,title,sort_order,order_key) values($1,$2,'home','Home',0,'V')",[page,project]);
  await db.query("insert into project_sections(page_id,section_type,sort_order,order_key,props) values($1,'section',0,'V','{}')",[page]);
 },60000);
 afterAll(async()=>{if(db)await db.close();});
 it("publishes the envelope, project state and history atomically",async()=>{
  await publish();
  const row=(await db.query<{snapshot:Record<string,unknown>;content_hash:string}>("select snapshot,content_hash from deployments where status='live'")).rows[0];
  const {contentHash,...payload}=row.snapshot;
  expect(contentHash).toBe(row.content_hash);expect(row.content_hash).toBe(createHash("sha256").update((await import("@/lib/creative-core")).canonicalStringify(payload)).digest("hex"));
  expect((await db.query("select version_number from website_versions")).rows).toHaveLength(1);
  expect((await db.query("select updated_at=published_at as equal from projects where id=$1",[project])).rows[0].equal).toBe(true);
 });
 it("rejects stale drafts and immutable deployment path changes without replacing live content",async()=>{
  const staged=await source();await db.query("update projects set title='Changed' where id=$1",[project]);
  await expect(publish("local-changed",staged)).rejects.toThrow(/Draft changed/);
  await expect(db.query("update deployments set public_path='/wrong' where status='live'")).rejects.toThrow(/immutable/);
  expect((await db.query("select subdomain from deployments where status='live'")).rows[0].subdomain).toBe("local-publish");
 });
 it("rolls back supersession and domain changes if history insert fails",async()=>{
  await db.exec("create function local_history_failure() returns trigger language plpgsql as $$begin raise exception 'history failure';end$$;create trigger local_history_failure before insert on website_versions for each row execute function local_history_failure()");
  await expect(publish("local-failure")).rejects.toThrow(/history failure/);
  expect((await db.query("select subdomain from deployments where status='live'")).rows[0].subdomain).toBe("local-publish");
  expect((await db.query("select subdomain from projects where id=$1",[project])).rows[0].subdomain).toBe("local-publish");
  await db.exec("drop trigger local_history_failure on website_versions");
 });
 it("denies browser RPCs and forgery, then safely republishes to a renamed domain",async()=>{
  const priv=(await db.query("select has_function_privilege('authenticated','public.publish_kcd_document(uuid,uuid,text,jsonb,jsonb,text)','execute') as browser,has_function_privilege('anon','public.kcd_publish_source(uuid,uuid)','execute') as anon")).rows[0];
  expect(priv).toEqual({browser:false,anon:false});
  await db.exec(`set role authenticated;select set_config('request.jwt.claim.sub','${owner}',false)`);
  try{await expect(db.query("insert into deployments(project_id,subdomain,snapshot,schema_version,content_hash,status,published_by,public_path) values($1,'forged','{}','kcd-1',repeat('a',64),'live',$2,'/forged')",[project,owner])).rejects.toThrow(/server preflight/);}finally{await db.exec("reset role");}
  await publish("local-renamed");
  expect((await db.query("select status from deployments order by published_at,id")).rows.map(row=>row.status).sort()).toEqual(["live","superseded"]);
  expect((await db.query("select * from website_versions")).rows).toHaveLength(2);
 });
 it("persists responsive spatial operations, rejects unknown keys, and publishes the saved geometry", async () => {
  const section = (await db.query<{id:string}>("select id from project_sections where section_type='section' and page_id=$1",[page])).rows[0].id;
  const text = "44444444-4444-4444-8444-444444444444" as NodeId;
  await db.query("insert into project_sections(id,page_id,parent_id,section_type,sort_order,order_key,props) values($1,$2,$3,'text',1,'V',$4)",[text,page,section,{text:"Saved spatial story"}]);
  const document = kcdPublishDocument(await source());
  const ops = [...primitiveGeometryOperations(document,text,"mobile",{x:12,y:24,elementWidth:220,elementHeight:90}), ...primitivePropertyOperations(document.nodes[text],"mobile","constraintX",{mode:"end",reference:390}), ...primitivePropertyOperations(document.nodes[text],"mobile","rotation",30), ...primitivePropertyOperations(document.nodes[text],"mobile","scaleX",1.5)];
  const tx = {txId:crypto.randomUUID(),origin:"user",label:"Phone layout",ops,expect:expectFor(document,ops)};
  await db.exec(`select set_config('request.jwt.claim.sub','${owner}',false);set role authenticated`);
  try {
   const result = (await db.query<{result:{status:string}}>("select public.apply_node_ops($1,$2) as result",[project,tx])).rows[0].result;
   expect(result.status).toBe("committed");
   expect((await db.query<{result:{replayed:boolean}}>("select public.apply_node_ops($1,$2) as result",[project,tx])).rows[0].result.replayed).toBe(true);
   const invalid = {...tx,txId:crypto.randomUUID(),ops:[{op:"setOverride",id:text,device:"mobile",key:"arbitraryCss",value:"position:fixed"}],expect:{[text]:2}};
   expect((await db.query<{result:{status:string}}>("select public.apply_node_ops($1,$2) as result",[project,invalid])).rows[0].result.status).toBe("rejected");
  } finally { await db.exec("reset role;select set_config('request.jwt.claim.sub','',false)"); }
  const saved = kcdPublishDocument(await source());
  expect(saved.nodes[text].props).toEqual({text:"Saved spatial story"});
  expect(saved.nodes[text].overrides.mobile).toMatchObject({position:"absolute",x:12,y:24,elementWidth:220,elementHeight:90,constraintX:{mode:"end",reference:390},rotation:30,scaleX:1.5});
  expect(saved.nodes[section as NodeId].overrides.mobile?.canvasHeight).toBe(600);
  await publish("local-spatial");
  expect(createKcdPublishedSnapshot(saved).snapshot.rendererRequirement.minVersion).toBe(4);
  const snapshot = (await db.query<{snapshot:{document:{nodes:Record<string,{overrides:unknown}>}}}>("select snapshot from deployments where status='live'")).rows[0].snapshot;
  expect(snapshot.document.nodes[text].overrides).toEqual(saved.nodes[text].overrides);
 });

 it("saves native nested order through authenticated operations and publishes renderer 5",async()=>{
  const section=(await db.query<{id:string}>("select id from project_sections where section_type='section' and page_id=$1",[page])).rows[0].id as NodeId;
  const other="55555555-5555-4555-8555-555555555555" as NodeId;
  await db.query("insert into project_sections(id,page_id,parent_id,section_type,sort_order,order_key,props) values($1,$2,$3,'text',2,'W',$4)",[other,page,section,{text:"Second story"}]);
  const doc=kcdPublishDocument(await source()),ops=builderNodeMoveOperations(doc,other,-1,"tablet"),tx={txId:crypto.randomUUID(),origin:"user",label:"Tablet order",ops,expect:expectFor(doc,ops)};
  await db.exec(`select set_config('request.jwt.claim.sub','${owner}',false);set role authenticated`);
  try{expect((await db.query<{result:{status:string}}>("select public.apply_node_ops($1,$2) as result",[project,tx])).rows[0].result.status).toBe("committed");expect((await db.query<{result:{replayed:boolean}}>("select public.apply_node_ops($1,$2) as result",[project,tx])).rows[0].result.replayed).toBe(true);}finally{await db.exec("reset role;select set_config('request.jwt.claim.sub','',false)");}
  const saved=kcdPublishDocument(await source());expect((saved.nodes[section].overrides.tablet?.childOrder as string[])[0]).toBe(other);expect(saved.nodes[section].props.childOrder).toBeUndefined();
  await publish("local-nested-order");expect(createKcdPublishedSnapshot(saved).snapshot.rendererRequirement.minVersion).toBe(5);
 });

 it("saves typography and image focal overrides atomically and publishes renderer 6",async()=>{
  const section=(await db.query<{id:string}>("select id from project_sections where section_type='section' and page_id=$1",[page])).rows[0].id as NodeId;
  const image="66666666-6666-4666-8666-666666666666" as NodeId,text="55555555-5555-4555-8555-555555555555" as NodeId;
  await db.query("insert into project_sections(id,page_id,parent_id,section_type,sort_order,order_key,props) values($1,$2,$3,'image',3,'X',$4)",[image,page,section,{src:"/brand/kebu-mark.png"}]);
  const doc=kcdPublishDocument(await source()),ops=[...primitivePropertyOperations(doc.nodes[text],"mobile","fontSize",22),...primitivePropertyOperations(doc.nodes[text],"mobile","lineHeight",1.4),...primitivePropertyOperations(doc.nodes[text],"mobile","letterSpacing",2),...primitivePropertyOperations(doc.nodes[image],"tablet","focalX",75),...primitivePropertyOperations(doc.nodes[image],"tablet","focalY",25)],tx={txId:crypto.randomUUID(),origin:"user",label:"Art direction",ops,expect:expectFor(doc,ops)};
  await db.exec(`select set_config('request.jwt.claim.sub','${owner}',false);set role authenticated`);
  try{expect((await db.query<{result:{status:string}}>("select public.apply_node_ops($1,$2) as result",[project,tx])).rows[0].result.status).toBe("committed");expect((await db.query<{result:{replayed:boolean}}>("select public.apply_node_ops($1,$2) as result",[project,tx])).rows[0].result.replayed).toBe(true);}finally{await db.exec("reset role;select set_config('request.jwt.claim.sub','',false)");}
  const saved=kcdPublishDocument(await source());expect(saved.nodes[text].overrides.mobile).toMatchObject({fontSize:22,lineHeight:1.4,letterSpacing:2});expect(saved.nodes[image].overrides.tablet).toMatchObject({focalX:75,focalY:25});expect(saved.nodes[text].props.fontSize).toBeUndefined();
  await publish("local-art-direction");expect(createKcdPublishedSnapshot(saved).snapshot.rendererRequirement.minVersion).toBe(6);
 });

 it("saves native motion with replay and rejects invalid settings atomically",async()=>{
  const {defaultNativeMotion}=await import("@/lib/creative-core");
  const section=(await db.query<{id:string}>("select id from project_sections where section_type='section' and page_id=$1",[page])).rows[0].id as NodeId;
  const document=kcdPublishDocument(await source());
  const ops=[{op:"setMotion" as const,id:section,value:defaultNativeMotion},{op:"setInteraction" as const,id:section,value:{version:1,effect:"lift",duration:180,easing:"ease-out"}}];
  const tx={txId:crypto.randomUUID(),origin:"user",label:"Motion",ops,expect:expectFor(document,ops)};
  expect((await db.query("select public.kcd_operation_protocol() as version")).rows[0].version).toBe(4);
  await db.exec(`select set_config('request.jwt.claim.sub','${owner}',false);set role authenticated`);
  try {
   const saved=(await db.query<{result:{status:string}}>("select public.apply_node_ops($1,$2) as result",[project,tx])).rows[0].result;
   expect(saved.status).toBe("committed");
   expect((await db.query<{result:{replayed:boolean}}>("select public.apply_node_ops($1,$2) as result",[project,tx])).rows[0].result.replayed).toBe(true);
   const invalid={...tx,txId:crypto.randomUUID(),expect:{[section]:document.nodes[section].version+1},ops:[{op:"setMotion",id:section,value:{...defaultNativeMotion,duration:9000}}]};
   expect((await db.query<{result:{status:string}}>("select public.apply_node_ops($1,$2) as result",[project,invalid])).rows[0].result.status).toBe("rejected");
  } finally {await db.exec("reset role;select set_config('request.jwt.claim.sub','',false)");}
  const saved=kcdPublishDocument(await source());
  expect(saved.nodes[section].motion).toEqual(defaultNativeMotion);
  expect(saved.nodes[section].version).toBe(document.nodes[section].version+1);
  expect(saved.nodes[section].interaction).toMatchObject({effect:"lift"});
  await publish("local-motion");
  const snapshot=(await db.query<{snapshot:{rendererRequirement:{minVersion:number};document:{nodes:Record<string,{motion:unknown}>}}}>("select snapshot from deployments where status='live'")).rows[0].snapshot;
  expect(snapshot.rendererRequirement.minVersion).toBe(7);
  expect(snapshot.document.nodes[section].motion).toEqual(defaultNativeMotion);
 });

 it("rejects malformed native effects during insert and preserves legacy packing",async()=>{
  const id=crypto.randomUUID();
  const document=kcdPublishDocument(await source());
  const tx={txId:crypto.randomUUID(),origin:"user",label:"Invalid native insert",expect:{[page]:document.pages[0].layoutVersion},ops:[{op:"insertNode",node:{id,type:"section",typeVersion:1,props:{},overrides:{},motion:{version:2,preset:"fade"}},pageId:page,parentId:null,orderKey:"z"}]};
  await db.exec(`select set_config('request.jwt.claim.sub','${owner}',false);set role authenticated`);
  try{expect((await db.query<{result:{status:string;message:string}}>("select public.apply_node_ops($1,$2) as result",[project,tx])).rows[0].result).toMatchObject({status:"rejected",message:"Invalid native effect"});}finally{await db.exec("reset role;select set_config('request.jwt.claim.sub','',false)");}
  expect((await db.query("select id from project_sections where id=$1",[id])).rows).toHaveLength(0);
  const legacy={type:"legacy-section:hero",props:{heading:"Preserved"},overrides:{},motion:{kind:"legacy",duration:120}};
  expect((await db.query<{props:Record<string,unknown>}>("select public.kcd__stored_props($1,0) as props",[legacy])).rows[0].props._motion).toEqual(legacy.motion);
  await expect(db.query("select public.kcd__stored_props($1,0)",[{type:"text",props:{text:"Restore"},overrides:{},interaction:{version:1,effect:"script",duration:150,easing:"ease"}}])).rejects.toThrow(/Invalid interaction/);
 });

 it("saves independent native masks/effects with journal replay and publishes renderer 8",async()=>{
  const image="66666666-6666-4666-8666-666666666666" as NodeId,doc=kcdPublishDocument(await source());
  const ops=[...primitivePropertyOperations(doc.nodes[image],"mobile","mask","arch"),...primitivePropertyOperations(doc.nodes[image],"mobile","blur",2),...primitivePropertyOperations(doc.nodes[image],"desktop","shadow","soft")],tx={txId:crypto.randomUUID(),origin:"user",label:"Visual effects",ops,expect:expectFor(doc,ops)};
  await db.exec(`select set_config('request.jwt.claim.sub','${owner}',false);set role authenticated`);
  try{expect((await db.query<{result:{status:string}}>("select public.apply_node_ops($1,$2) as result",[project,tx])).rows[0].result.status).toBe("committed");expect((await db.query<{result:{replayed:boolean}}>("select public.apply_node_ops($1,$2) as result",[project,tx])).rows[0].result.replayed).toBe(true);}finally{await db.exec("reset role;select set_config('request.jwt.claim.sub','',false)");}
  const saved=kcdPublishDocument(await source());expect(saved.nodes[image].overrides.mobile).toMatchObject({mask:"arch",blur:2});expect(saved.nodes[image].props.shadow).toBe("soft");expect(saved.nodes[image].props.mask).toBeUndefined();await publish("local-effects");expect((await db.query<{snapshot:{rendererRequirement:{minVersion:number}}}>("select snapshot from deployments where status='live'")).rows[0].snapshot.rendererRequirement.minVersion).toBe(8);
 });

 it("persists rich runs and native video through authenticated RPCs with publication",async()=>{
  const {primitiveInsertOperation}=await import("@/lib/create/kcd-primitive-operations");const section=(await db.query<{id:string}>("select id from project_sections where section_type='section' and page_id=$1",[page])).rows[0].id as NodeId;
  const text="55555555-5555-4555-8555-555555555555" as NodeId,doc=kcdPublishDocument(await source()),insert=primitiveInsertOperation(doc,doc.pages[0].id,section,"video"),copy=String(doc.nodes[text].props.text);
  if(insert.op!=="insertNode")throw new Error("Video insert");insert.node.props={src:"/qa-video.webm",poster:"/brand/kebu-mark.png",captionsSrc:"/qa-captions.vtt",captionsLanguage:"en"};
  const ops=[insert,...primitivePropertyOperations(doc.nodes[text],"desktop","runs",[{text:copy,bold:true}]),...primitivePropertyOperations(doc.nodes[text],"mobile","runs",[{text:copy,bold:true}])],tx={txId:crypto.randomUUID(),origin:"user",label:"Rich media",ops,expect:expectFor(doc,ops)};
  await db.exec(`select set_config('request.jwt.claim.sub','${owner}',false);set role authenticated`);
  try{expect((await db.query<{result:{status:string}}>("select public.apply_node_ops($1,$2) as result",[project,tx])).rows[0].result.status).toBe("committed");expect((await db.query<{result:{replayed:boolean}}>("select public.apply_node_ops($1,$2) as result",[project,tx])).rows[0].result.replayed).toBe(true);}finally{await db.exec("reset role;select set_config('request.jwt.claim.sub','',false)");}
  const saved=kcdPublishDocument(await source());expect(saved.nodes[insert.node.id].type).toBe("video");expect(saved.nodes[insert.node.id].props.captionsLanguage).toBe("en");expect(saved.nodes[text].props.runs).toEqual([{text:copy,bold:true}]);await publish("local-rich-video");expect(createKcdPublishedSnapshot(saved).snapshot.rendererRequirement.minVersion).toBe(10);
 });
 it("converts a legacy root atomically with stable identity and real SQL inverse history",async()=>{
  const {decomposeLegacySection}=await import("@/lib/create/kcd-section-decomposition");const id=crypto.randomUUID() as NodeId,props={heading:"Editable campaign",subheading:"Retain every word",buttonLabel:"Contact",buttonHref:"contact",image:"/brand/kebu-mark.png",minHeight:"70vh"};
  await db.query("insert into project_sections(id,page_id,section_type,sort_order,order_key,props) values($1,$2,'hero',9,'z',$3)",[id,page,props]);
  const doc=kcdPublishDocument(await source()),plan=decomposeLegacySection(doc,id),tx={txId:crypto.randomUUID(),origin:"user",label:"Convert",ops:plan.ops,expect:expectFor(doc,plan.ops)},prepared=(await import("@/lib/create/kcd-write-boundary")).prepareBuilderTransaction(doc,tx as Parameters<typeof import("@/lib/create/kcd-write-boundary").prepareBuilderTransaction>[1]);expect(prepared.ok).toBe(true);if(!prepared.ok)return;
  const apply=async(input:unknown)=>{await db.exec(`select set_config('request.jwt.claim.sub','${owner}',false);set role authenticated`);try{return(await db.query<{result:{status:string}}>("select public.apply_node_ops($1,$2) as result",[project,input])).rows[0].result;}finally{await db.exec("reset role;select set_config('request.jwt.claim.sub','',false)");}};
  expect(await apply(tx)).toMatchObject({status:"committed"});const saved=kcdPublishDocument(await source());expect(saved.nodes[id].type).toBe("section");expect(saved.nodes[id].version).toBe(doc.nodes[id].version+1);expect(Object.values(saved.nodes).some(n=>n.parentId===id&&n.type==="image")).toBe(true);await publish("local-converted");expect(createKcdPublishedSnapshot(saved).snapshot.rendererRequirement.minVersion).toBe(11);
  const inverse=prepared.prediction.inverse;expect((await apply({txId:crypto.randomUUID(),origin:"user",label:"Undo conversion",ops:inverse,expect:expectFor(saved,inverse)})).status).toBe("committed");const restored=kcdPublishDocument(await source());expect(restored.nodes[id].type).toBe("legacy-section:hero");expect(restored.nodes[id].props).toMatchObject(props);
 });

});
