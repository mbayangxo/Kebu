/** Canonical SQL permissions, not response redaction. No hosted Auth claim. */
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {describe,expect,it} from "vitest";
import {buyer,developer,other,openWaveDatabase,role,type WaveDb} from "../payments/fixtures/wave-database";
const enabled=Boolean(process.env.KEBU_LOCAL_PGLITE_ROOT);
const before=process.env.KEBU_TEMPLATE_SOURCE_BEFORE==="1";
const migration="supabase/migrations/20261021223430_marketplace_template_source_boundary.sql";
const payload={marker:"paid-source-never-public",pages:[{slug:"home",sections:[]}]};
async function fixture(){
 const db=await openWaveDatabase();
 if(!before)await db.exec(readFileSync(resolve(migration),"utf8"));
 await role(db,"postgres");
 const dev=(await db.query<{id:string}>("select id from developer_profiles where user_id=$1",[developer])).rows[0]!.id;
 const id=(await db.query<{id:string}>("insert into marketplace_templates(developer_id,slug,name,definition,price_cents,status) values($1,'private-template','Private template',$2,500,'published') returning id",[dev,JSON.stringify(payload)])).rows[0]!.id;
 const receipt=(await db.query<{id:string}>("insert into aesthetic_library(owner_id,kind,marketplace_id,name,definition,status,amount_usd_cents,provider,provider_reference) values($1,'marketplace',$2,'Private template',$3,'pending',500,'wave','source-boundary-fixture') returning id",[buyer,id,JSON.stringify(payload)])).rows[0]!.id;
 return {db,dev,id,receipt};
}
async function as(db:WaveDb,name:"anon"|"authenticated"|"service_role"|"postgres",user=buyer){await role(db,name,name==="anon"?"":user);}

describe.skipIf(!enabled)("Marketplace template source permissions (canonical SQL)",()=>{
 it.each(["anon","authenticated"] as const)("%s cannot select a published paid definition",{timeout:30000},async name=>{
  const {db,id}=await fixture();try{await as(db,name);await expect(db.query("select definition from marketplace_templates where id=$1",[id])).rejects.toThrow();}finally{await db.close!();}
 });
 it.each(["select * from marketplace_templates where id=$1","select to_jsonb(t) from marketplace_templates t where id=$1","select id from marketplace_templates where id=$1 and definition->>'marker'='paid-source-never-public'"])("rejects alternate source projection %s",{timeout:30000},async query=>{
  const {db,id}=await fixture();try{await as(db,"authenticated");await expect(db.query(query,[id])).rejects.toThrow();}finally{await db.close!();}
 });
 it.each(["pending","failed"])("hides the unpaid buyer's %s snapshot",{timeout:30000},async status=>{
  const {db,receipt}=await fixture();try{await as(db,"service_role");await db.query("update aesthetic_library set status=$1 where id=$2",[status,receipt]);await as(db,"authenticated");expect((await db.query("select definition from aesthetic_library where id=$1",[receipt])).rows).toHaveLength(0);}finally{await db.close!();}
 });
 it.each(["anon","authenticated"] as const)("%s can read published metadata and cannot discover another developer's drafts",{timeout:30000},async name=>{
  const {db,id,dev}=await fixture();try{await as(db,"postgres");await db.query("insert into marketplace_templates(developer_id,slug,name,definition,status) values($1,'hidden-draft','Hidden draft','{}','draft')",[dev]);await as(db,name);const rows=(await db.query("select id,name,price_cents from marketplace_templates order by created_at")).rows;expect(rows).toEqual([{id,name:"Private template",price_cents:500}]);}finally{await db.close!();}
 });
 it("serves anonymous metadata with no developer-profile grants",{timeout:30000},async()=>{
  const {db,id}=await fixture();try{await as(db,"postgres");await db.exec("revoke all on developer_profiles from anon");await as(db,"anon");expect((await db.query("select id,name from marketplace_templates where id=$1",[id])).rows).toEqual([{id,name:"Private template"}]);}finally{await db.close!();}
 });
 it("preserves developer upload, metadata management and publication without source RETURNING",{timeout:30000},async()=>{
  const {db,dev}=await fixture();try{await as(db,"authenticated",developer);const id=(await db.query<{id:string}>("insert into marketplace_templates(developer_id,slug,name,definition,status) values($1,'new-draft','My draft',$2,'draft') returning id,name,status",[dev,JSON.stringify(payload)])).rows[0]!.id;expect((await db.query("update marketplace_templates set name='Renamed',status='published' where id=$1 returning id,name,status",[id])).rows).toEqual([{id,name:"Renamed",status:"published"}]);}finally{await db.close!();}
 });
 it("reveals the unchanged owned snapshot only to its buyer",{timeout:30000},async()=>{
  const {db,receipt}=await fixture();try{await as(db,"service_role");await db.query("update aesthetic_library set status='owned' where id=$1",[receipt]);await as(db,"authenticated");expect((await db.query<{definition:unknown}>("select definition from aesthetic_library where id=$1",[receipt])).rows[0]!.definition).toEqual(payload);await as(db,"authenticated",other);expect((await db.query("select definition from aesthetic_library where id=$1",[receipt])).rows).toHaveLength(0);}finally{await db.close!();}
 });
 it("preserves self-uploaded owned source readback",{timeout:30000},async()=>{
  const {db}=await fixture();try{await as(db,"authenticated");expect((await db.query<{definition:unknown}>("insert into aesthetic_library(owner_id,kind,name,definition,status) values($1,'upload','My upload',$2,'owned') returning definition",[buyer,JSON.stringify(payload)])).rows[0]!.definition).toEqual(payload);}finally{await db.close!();}
 });
 it("retains the trusted server's source and pending snapshot reads",{timeout:30000},async()=>{
  const {db,id,receipt}=await fixture();try{await as(db,"service_role");for(const [table,key] of [["marketplace_templates",id],["aesthetic_library",receipt]])expect((await db.query<{definition:unknown}>("select definition from "+table+" where id=$1",[key])).rows[0]!.definition).toEqual(payload);}finally{await db.close!();}
 });
});
